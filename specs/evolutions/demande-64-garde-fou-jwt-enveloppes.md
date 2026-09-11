# Demande #64 — Garde-fou « hors du site » sur le trigger des enveloppes

> **Complexité S.** Saisie le 2026-09-10 à la sortie de l'analyse de #62, développée le 2026-09-11.
>
> Version en clair pour les relecteurs : `demande-64-garde-fou-jwt-enveloppes-en-clair.md`.

## Contexte

`enforce_enveloppe_membre_update()` protège les champs d'une enveloppe que le membre destinataire
n'a pas le droit de toucher. Pour savoir si l'appelant est le collecteur propriétaire, elle lit
l'email du JWT. **Hors du site, il n'y en a pas** : depuis l'éditeur SQL, `auth.jwt()` renvoie
`NULL` ; depuis le Worker `supabase-admin-proxy`, le JWT est celui de la clé de service, sans
email. Dans les deux cas la fonction conclut qu'elle a affaire au membre destinataire, et refuse :
`Champ non modifiable par le membre`.

Trouvé en migrant un membre à la main pour #62 : il avait fallu désactiver ce trigger le temps de
l'opération. **Toute maintenance sur `enveloppes` depuis l'éditeur ou le Worker se heurte au même
mur.**

## Deux corrections apportées à la demande telle que saisie

### 1. La version de référence n'était pas la bonne

La demande renvoyait à `migration-frais-port-paiement-fix-recursion.sql` (juin 2026). **La version
vivante est celle de `migration-annulation-declaration-paiement.sql` (juillet 2026)**, qui a
**resserré** les transitions de `statut_paiement_port` : un membre ne peut plus toucher à un
paiement confirmé par le collecteur. Un `CREATE OR REPLACE` écrit depuis la copie de juin aurait
**défait ce resserrement en silence** et rendu aux membres le droit de repasser un paiement
« confirmé » en « déclaré ».

→ La migration part de la version de juillet, et l'étape 1 **vérifie par empreinte** que c'est bien
elle qui tourne en production avant d'autoriser le remplacement (voir *Parade*).

### 2. Le garde-fou proposé était trop large

La demande proposait de recopier celui de la fonction sœur `enforce_inscription_statut_paiement()` :
`IF auth.jwt() ->> 'email' IS NULL THEN RETURN NEW`. **Or dans ce projet, un membre connecté par
Firebase arrive dans le rôle `anon`** (cf. la règle « jamais `TO authenticated` »), exactement comme
un inconnu muni de la seule clé publique. **La seule chose qui les distingue est l'email.** Ce
garde-fou aurait donc laissé passer tout appel anonyme.

Ce ne serait **pas exploitable aujourd'hui** : les quatre policies de modification sur `enveloppes`
(`enveloppes_collecteur_update`, `enveloppes_membre_update`, et leurs variantes) comparent toutes à
`auth.jwt() ->> 'email'`, donc un appel sans email ne voit aucune ligne. Mais le trigger est **la
deuxième ligne de défense**, celle qui tient si une policy est un jour mal écrite, et rien ne
justifie de l'affaiblir.

→ Garde-fou retenu, strictement plus étroit :

```sql
IF auth.jwt() IS NULL OR auth.jwt() ->> 'role' = 'service_role' THEN
    RETURN NEW;
END IF;
```

- **aucun JWT** : éditeur SQL, connexion directe — `auth.jwt()` lit un réglage de session que seul
  PostgREST positionne ;
- **rôle `service_role`** : le Worker de maintenance. Ce rôle contourne déjà toutes les policies de
  toutes les tables ; le bloquer dans un seul trigger ne protège rien et n'empêche que la maintenance.
- **un appel anonyme** porte un JWT de rôle `anon` : il ne passe **pas**, et reste soumis aux règles
  du membre.

> ⚠ **Observation hors périmètre** : la fonction sœur `enforce_inscription_statut_paiement()` porte,
> elle, le garde-fou large. Même raisonnement : pas exploitable tant que les policies d'`inscriptions`
> comparent l'email, mais c'est une défense en profondeur affaiblie. Non corrigé ici — à saisir à
> part si Cyril le souhaite.

## Ce qui change

Une seule chose : les cinq lignes du garde-fou en tête de fonction. **Tout le reste est identique à
la version de juillet**, y compris les messages d'erreur (aucun écran ne s'appuie sur leur texte,
vérifié). Seuls les commentaires internes ont été réécrits sans apostrophe, pour que l'éditeur SQL
ne découpe pas le bloc (leçon de #62).

## Preuve : la même batterie, avant et après

Banc d'essai Postgres 16, schéma minimal, `auth.jwt()` défini **exactement comme Supabase le
fournit**, fonction de juillet **extraite telle quelle du dépôt**. Onze cas, joués sur l'ancienne
puis sur la nouvelle version :

| # | Appelant | Modification | Juillet | #64 |
|---|---|---|---|---|
| 01 | aucun JWT (éditeur SQL) | `membre_email` | bloqué | **passe** |
| 02 | aucun JWT (éditeur SQL) | `numero_suivi` | bloqué | **passe** |
| 03 | rôle service (Worker) | `numero_suivi` | bloqué | **passe** |
| 04 | **anonyme sans email** | `numero_suivi` | bloqué | bloqué |
| 05 | membre destinataire | `numero_suivi` | bloqué | bloqué |
| 06 | membre destinataire | statut → `recue` | passe | passe |
| 07 | membre destinataire | statut → `annulee` | bloqué | bloqué |
| 08 | membre | port `confirme` → `declare` *(règle de juillet)* | bloqué | bloqué |
| 09 | membre | port `non_paye` → `declare` | passe | passe |
| 10 | collecteur propriétaire | `numero_suivi` | passe | passe |
| 11 | admin non collecteur | `numero_suivi` | bloqué | bloqué |

**Exactement trois lignes changent, et ce sont les trois visées.** Le cas 04 prouve que le garde-fou
étroit tient ; le cas 08, que le resserrement de juillet est préservé.

## Parade contre une version de production inattendue

La migration **remplace** la fonction entière. Je ne peux pas lire la source en production (le port
5432 est filtré depuis le poste de Cyril), donc l'étape 1 le fait à ma place : elle compare
l'empreinte MD5 de `prosrc`, **espaces normalisés** (`regexp_replace(prosrc, '\s+', ' ', 'g')`, pour
ne pas dépendre des fins de ligne), à celle de la version de juillet.

| Empreinte | Valeur |
|---|---|
| Version de juillet (attendue en production avant) | `2bd1ee2182d77a824e91317ddb35fc62` |
| Version #64 (attendue en production après) | `17ca9a797fdb0cea24faf78baaeb7743` |

Si la production diffère de juillet, l'étape 1 répond **STOP** et affiche la source : on compare à la
main plutôt que d'écraser une modification inconnue. Les quatre verdicts des étapes 1 et 3 (PRET,
ECHEC, DÉJÀ FAIT, OK) ont été vérifiés sur le banc.

> Le banc a aussi attrapé une erreur qui serait partie chez Cyril : `pg_trigger.tgenabled` est de
> type `"char"`, et `text || "char"` est ambigu. Corrigé par un `::text`.

## Ce que #64 ne fait PAS — et une correction à #62

**#64 ne débloque pas le renommage de #62 lancé depuis l'écran.** Vérifié sur le banc : un
`ON UPDATE CASCADE` **exécute bien** les triggers `BEFORE UPDATE` des tables filles. Lancé depuis
l'écran, le renommage porte le JWT de l'admin, qui n'est pas le collecteur propriétaire : le trigger
le bloque (cas A du banc). Et le trigger d'audit des inscriptions écrase `changed_by` et
`last_changed` au passage (cas B).

La spec #62 affirmait le contraire (« le CASCADE n'exécute pas les triggers utilisateur »). Elle est
corrigée en conséquence, et #62 repasse en analyse.

**Ce que #64 débloque** : toute intervention de maintenance sur `enveloppes` depuis l'éditeur SQL ou
le Worker — typiquement les migrations manuelles comme celle de #62 du 2026-09-10, qui n'auront plus
à désactiver ce trigger.

## Critères d'acceptation

1. L'étape 1 répond **PRET** en production (sinon : arrêt, comparaison manuelle).
2. L'étape 3 répond **OK**, trigger `O`.
3. Aucun changement de comportement pour les membres, les collecteurs, les admins — cas 04 à 11.
4. Une modification d'enveloppe depuis l'éditeur SQL n'exige plus de désactiver le trigger.

## Fichiers

- `scripts/migration-demande-64-1-constat.sql` — lecture seule, garde-fou par empreinte
- `scripts/migration-demande-64-2-migration.sql` — le `CREATE OR REPLACE FUNCTION`
- `scripts/migration-demande-64-3-controle.sql` — lecture seule, vérification par empreinte

Gitignorés comme toutes les migrations ; le SQL de la fonction est reproduit intégralement dans le
fichier 2 et résumé ci-dessus.

Aucun changement côté site, aucun redéploiement, pas de bump de `CACHE_NAME`.

## Réalisation

*(à compléter une fois la migration jouée en production : verdict de l'étape 3, date)*
