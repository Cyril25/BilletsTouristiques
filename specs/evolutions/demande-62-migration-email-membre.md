# Demande #62 — Migrer un membre vers une nouvelle adresse email

> **Complexité L.** Analyse écrite le 2026-09-10, en attente de validation.
>
> Version en clair pour les relecteurs : `demande-62-migration-email-membre-en-clair.md`.
>
> Demande déposée par Cyril le 2026-09-10, écran visé : **Gestion Membres** (`users.html`).

## Contexte (demande)

> « Parfois il y a des membres qui n'arrivent plus à se connecter à une adresse mail et qui en
> créent une deuxième. Tous les membres ne sont pas forcément bons en informatique et ne
> comprennent pas forcément comment rebasculer sur l'ancien compte via la connexion Google. Il
> serait utile de réussir à "mettre à jour" l'adresse email d'un membre, via la gestion des
> membres. Techniquement je ne sais plus ce que cela implique, je ne sais plus si l'adresse email
> est utilisée en tant qu'identifiant en base ou si on a un `membreId`, à vérifier donc pour
> connaître la complexité de cette demande. »

**Réponse à la question posée : c'est l'email, il n'y a pas de `membreId`.** `membres.email` est la
clé primaire, et l'adresse est recopiée telle quelle dans **20 colonnes réparties sur 14 tables**.

## L'état du terrain, mesuré le 2026-09-10

Relevé sur la production via le schéma OpenAPI de PostgREST, pas de mémoire.

| Constat | Chiffre |
|---|---|
| Colonnes portant une adresse de membre | **20**, sur 14 tables |
| Dont protégées par une clé étrangère vers `membres.email` | **3** (`collection`, `membre_blocages`, `collecteur_blacklist`) |
| Adresses orphelines déjà en base (pointent vers un membre inexistant) | **15** |
| Dont enveloppes orphelines | **23 lignes, 10 adresses** |
| Membres | 108 |

**Le commentaire « FK vers membres.email » de l'ancien script de migration était faux** :
`inscriptions.membre_email` est déclarée `TEXT NOT NULL` depuis `migration-5-4-inscriptions.sql`
et n'a jamais eu de contrainte.

### La preuve que le problème est déjà réalisé, pas hypothétique

Parmi les 10 adresses d'enveloppes orphelines figure **celle qui a été migrée en 2024**, avec
6 lignes. C'est l'adresse exacte de la seule migration d'email faite à la main jusqu'ici
(un script `scripts/migrate-email-*.sql`, non versionné). Ce script traitait 6 tables ; `enveloppes`
n'en faisait pas partie. **Les 6 lignes sont restées derrière, sans erreur, sans alerte, pendant
des mois.**

Les 9 autres adresses viennent d'un autre chemin : la suppression d'un membre depuis
[users.js](../../users.js). Le code ne vérifie que `inscriptions` avant de supprimer
([users.js:626](../../users.js#L626)) — les enveloppes, elles, restent.

**Deux causes, un seul mécanisme : rien en base ne relie ces colonnes à la fiche du membre.**

## Le constat qui structure toute la suite

La demande se présente comme « ajouter un bouton pour changer une adresse ». Le travail réel n'est
pas là. **Ce qui manque, c'est l'intégrité référentielle** — et tant qu'elle manque, toute
solution est une liste écrite à la main, qui sera fausse à la prochaine table ajoutée.

**On ne construit pas une fonctionnalité sur une liste que personne ne maintiendra.**

## Ce que la migration manuelle du 2026-09-10 a appris

Faite le 2026-09-10 (`<ancienne adresse>` → `<nouvelle adresse>` : 139 inscriptions,
27 lignes de collection, 24 enveloppes, 17 marqueurs de notification). Scripts
`scripts/migration-demande-62-{1,2,3}-*.sql`. Trois enseignements qui contraignent le design :

1. **`trg_enforce_enveloppe_membre_update` BLOQUE le renommage.** Sa fonction n'a pas le garde-fou
   « JWT nul → laisser passer » de son homologue `enforce_inscription_statut_paiement()`. Sans
   JWT, elle croit avoir affaire au membre destinataire et refuse tout changement de
   `membre_email` : `Champ non modifiable par le membre`. → **saisi en demande #64.**
   ⚠ Une fonction `SECURITY DEFINER` appelée depuis l'écran **aura** un JWT (celui de l'admin), donc
   ce trigger ne bloquera pas — mais il refusera quand même, puisque l'admin n'est pas le
   collecteur propriétaire de l'enveloppe. **#64 est un prérequis de #62**, ou la fonction devra
   désactiver le trigger, ce qui est bien pire dans du code appelé depuis le navigateur.
2. **`trg_inscription_audit` écrase l'historique sans rien dire** : `changed_by='système'` et
   `last_changed=NOW()` sur chaque ligne touchée. Sur 139 inscriptions, toute la traçabilité.
3. **L'invariant D4 ne gêne pas** : `trg_inscription_scope_invariant` ne se déclenche que sur
   `UPDATE OF nb_normaux, nb_variantes, collecte_id`. Les 142 inscriptions hors invariant ne
   bloquent pas un renommage.

## Les deux voies

### Voie A — la liste de colonnes écrite à la main

Une fonction `SECURITY DEFINER` qui enchaîne les 20 `UPDATE`, comme le script manuel.

- **Pour** : aucun changement de schéma, aucune donnée à arbitrer, livrable vite.
- **Contre** : **elle pourrit**. Toute table ajoutée plus tard devra y être ajoutée, et rien ne le
  rappellera. C'est exactement le mécanisme qui a coûté les 6 enveloppes de 2024.

### Voie B — de vraies clés étrangères `ON UPDATE CASCADE` *(recommandée)*

On pose la contrainte sur les colonnes d'**appartenance**. Un simple
`UPDATE membres SET email = …` se propage alors partout, **y compris dans les tables qui
n'existent pas encore**, du moment qu'elles déclarent leur FK à la création — ce qui est le
réflexe normal quand on crée une table.

L'objection attendue était : « il faut d'abord nettoyer les 15 adresses orphelines ». **Vérifié sur
Postgres 16, elle ne tient pas.** Une contrainte posée `NOT VALID` :

| Question | Résultat mesuré |
|---|---|
| Peut-on la poser malgré des orphelines existantes ? | **Oui** |
| `ON UPDATE CASCADE` fonctionne-t-il quand même ? | **Oui** — la ligne suit le renommage, l'orpheline préexistante reste intacte |
| Empêche-t-elle une **nouvelle** orpheline ? | **Oui**, refusée immédiatement |
| Bloque-t-elle la suppression d'un membre qui a des données ? | **Oui** (voir ci-dessous) |

`NOT VALID` ne désactive pas la contrainte : il saute seulement la **vérification initiale** de
l'existant. Les déclencheurs d'intégrité sont bien installés et actifs.

**On peut donc adopter la voie B tout de suite, sans arbitrer une seule ligne orpheline.** Le
nettoyage devient un chantier séparé, et le jour où il est fait, un `VALIDATE CONSTRAINT` referme
le dossier.

## Conséquence à assumer : supprimer un membre change de comportement

C'est le point qui n'était pas dans la demande et qu'il faut trancher sciemment.

Aujourd'hui, supprimer un membre depuis Gestion Membres **réussit** même s'il a des enveloppes,
une collection, des dettes — et laisse tout ça orphelin. **C'est le bug qui a produit 9 des 10
adresses orphelines.** Avec les FK, ce `DELETE` sera **refusé** par la base.

Trois options :

| | Effet | Avis |
|---|---|---|
| `ON DELETE NO ACTION` (défaut) | Suppression refusée tant qu'il reste des données | **Recommandé** — c'est la correction du bug, pas un effet de bord |
| `ON DELETE CASCADE` | Supprimer un membre efface son historique | À écarter : perte de données silencieuse, dans l'autre sens |
| Pas de FK sur les tables gênantes | On garde le trou | Incohérent avec le reste |

Si `NO ACTION` est retenu, [users.js](../../users.js) doit être adapté : le contrôle actuel ne
regarde que `inscriptions`, il doit énumérer **tout** ce qui bloque et le dire clairement, au lieu
de laisser remonter une erreur Postgres brute. Sinon un admin verra un message incompréhensible.

## Classement des 20 colonnes

La distinction n'est pas cosmétique : elle décide où une FK a du sens.

### Appartenance — la ligne **est à** ce membre → FK `ON UPDATE CASCADE`

| Table | Colonne | FK déjà là ? |
|---|---|---|
| `inscriptions` | `membre_email` | non |
| `inscriptions_auto` | `membre_email` | non |
| `inscriptions_auto_pays` | `membre_email` | non |
| `collection` | `membre_email` | **oui** (ajouter le CASCADE) |
| `dettes` | `membre_email` | non |
| `enveloppes` | `membre_email` | non |
| `collecteurs` | `email_membre` | non |
| `collecteur_blacklist` | `membre_email` | **oui** (ajouter le CASCADE) |
| `membre_blocages` | `membre_email` | **oui** (ajouter le CASCADE) |
| `notifications_vues` | `membre_email` | non |
| `contacts_collecteur` | `proprietaire_email` | non |
| `demandes` | `demandeur` | non |
| `demande_commentaires` | `auteur_email` | non |
| `demande_validations` | `admin_email` | non |
| `signalements` | `auteur_email` | non |
| `notifications` | `cible_email` | non — **nullable**, prévoir `ON DELETE SET NULL` |

⚠ **`contacts_collecteur.email` ne doit PAS recevoir de FK** : c'est l'adresse d'un contact
extérieur au groupe, pas d'un membre. Piège de nommage.

### Trace — la ligne **dit qui a fait** quelque chose → **pas de FK**, mise à jour explicite

`inscriptions.changed_by`, `membre_blocages.bloque_by`, `signalements.traite_par`,
`membres.validated_by`.

**Les données le confirment** : ces colonnes contiennent des valeurs qui ne sont pas des adresses —
`système`, `pré-inscription`. Et `demandes.demandeur` porte 13 lignes `Import Google Sheet` :
tolérées par `NOT VALID`, mais toute nouvelle ligne devra être une vraie adresse.

## La fonction de renommage

`migrer_email_membre(p_ancien TEXT, p_nouveau TEXT)`, `SECURITY DEFINER`, appelée depuis l'écran
en `/rest/v1/rpc/migrer_email_membre` — le pattern existe déjà dans le projet
([admin.js:605](../../admin.js#L605), [global.js:958](../../global.js#L958)).

Elle doit, dans cet ordre :

1. **vérifier l'appelant** : `is_admin_ou_superadmin()`, sinon lever une erreur ;
2. **refuser** si l'ancienne adresse n'existe pas, si les deux sont identiques, ou si le format de
   la nouvelle n'est pas une adresse ;
3. **refuser si la cible porte des données d'appartenance** (voir « périmètre » ci-dessous), avec
   un message qui nomme la table et le nombre de lignes ;
4. **contrôle d'exhaustivité** (voir ci-dessous) — refuser si une colonne inconnue est apparue ;
5. si la cible existe et est vide : **compléter la fiche cible** depuis l'ancienne (identité,
   adresse postale, préférences de collection ; on garde la trace d'inscription de la cible, plus
   récente), puis `UPDATE membres SET email = p_nouveau` qui **cascade** ;
   si la cible n'existe pas : `UPDATE membres SET email = p_nouveau` directement ;
6. **mettre à jour les 4 colonnes de trace** explicitement ;
7. **journaliser** le renommage ;
8. **auto-contrôle final** : plus aucune ligne ne doit porter l'ancienne adresse, sinon
   `RAISE EXCEPTION` — la fonction étant une seule instruction, tout est annulé.

⚠ Le trigger `trg_inscription_audit` se déclenchera-t-il ? **Non** : avec la voie B, on ne fait plus
d'`UPDATE` sur `inscriptions` — c'est le CASCADE qui agit, et il n'exécute pas les triggers
utilisateur `BEFORE UPDATE`. **À vérifier en recette**, c'est un point où je peux me tromper.

## Le garde-fou contre le pourrissement

C'est ce qui distingue cette spec d'une liste de plus. Avant d'agir, la fonction interroge
`information_schema` et lève une erreur si elle trouve, dans le schéma `public`, une colonne texte
dont le nom évoque un membre (`%email%`, `demandeur`, `changed_by`, `traite_par`, `bloque_by`,
`validated_by`) qui n'est **ni** couverte par une FK vers `membres.email`, **ni** inscrite dans la
liste explicite des colonnes de trace et des exceptions connues (`contacts_collecteur.email`,
`collecteurs.paypal_email`).

**Une table ajoutée sans y penser fera échouer la migration avec un message qui la nomme**, au lieu
de laisser des lignes derrière en silence. Le coût est d'une vingtaine de lignes de SQL, écrites
une fois. Le bénéfice est que le mode de défaillance passe de « silencieux et découvert des mois
plus tard » à « bruyant et immédiat ».

## Traçabilité

Table `membres_migrations_email` : `ancien_email`, `nouveau_email`, `migre_par`, `migre_at`,
`nb_lignes_deplacees`.

Sans elle, une adresse disparue est inexplicable — et personne ne peut répondre à « où est passée
ma collection ». Quatre colonnes, remplies par la fonction.

## L'écran (Gestion Membres)

Dans la modale d'édition d'un membre ([users.js:489](../../users.js#L489)), où l'adresse est
aujourd'hui affichée en lecture seule ([users.js:503](../../users.js#L503)) : un bouton
**« Changer l'adresse email »**, réservé aux admins.

Il ouvre une confirmation qui **affiche ce qui va être déplacé** (le décompte par table, obtenu de
la même fonction en mode simulation), demande de saisir la nouvelle adresse, et prévient que
l'opération est irréversible. Au retour, message de succès nommant les deux adresses.

**Le décompte avant confirmation n'est pas un ornement** : c'est ce qui permet à l'admin de voir
qu'il s'apprête à déplacer 139 inscriptions, et donc de s'arrêter s'il s'est trompé de personne.

## Découpage

| Lot | Contenu | Dépend de |
|---|---|---|
| **0** | **#64** — garde-fou JWT sur `enforce_enveloppe_membre_update()` | — |
| **1** | Migration : FK `ON UPDATE CASCADE NOT VALID` sur les 16 colonnes d'appartenance, table de journal, fonction `migrer_email_membre()` + contrôle d'exhaustivité | lot 0 |
| **2** | Écran : bouton, simulation, confirmation, message d'erreur de suppression revu dans `users.js` | lot 1 |
| **3** *(séparé)* | Arbitrage des 15 adresses orphelines, puis `VALIDATE CONSTRAINT` | indépendant |

Le lot 3 n'est **pas** un prérequis : c'est tout l'intérêt du `NOT VALID`.

## Critères d'acceptation

1. Un admin renomme un membre depuis Gestion Membres ; ses inscriptions, sa collection, ses
   enveloppes, ses dettes et ses contacts le suivent.
2. `changed_by`, `validated_by`, `traite_par`, `bloque_by` suivent également.
3. **`last_changed` et `changed_by` des inscriptions ne sont pas écrasés** par l'opération.
4. Renommer vers une adresse déjà titulaire de données d'appartenance est **refusé**, avec un
   message nommant la table et le nombre de lignes.
5. Renommer vers une adresse existante mais vide (le cas rencontré le 10/09) **fonctionne** et fusionne les fiches.
6. Un non-admin appelant la fonction directement par l'API est **refusé**.
7. Après renommage, plus aucune ligne de la base ne porte l'ancienne adresse (contrôle automatique).
8. Créer une ligne pointant vers un membre inexistant est **refusé** par la base.
9. Supprimer un membre qui a des données est **refusé**, avec un message lisible qui dit quoi.
10. Le renommage est inscrit dans `membres_migrations_email`.
11. Le membre se reconnecte avec la nouvelle adresse Google et retrouve tout.
12. Mode sombre et téléphone réel pour la modale — c'est ce qui avait rattrapé #53.

## Ce que cette spec ne fait pas

- **Fusionner deux comptes qui portent tous les deux des données.** Les trois doublons connus
  (un traité le 2026-09-10, deux restants) ont tout d'un seul côté. Construire l'arbitrage d'un conflit
  qui n'existe pas doublerait le travail.
- **Permettre à un membre de changer sa propre adresse.** Opération d'admin.
- **Nettoyer les orphelines existantes** (lot 3, séparé).
- **Toucher à `collecteurs.paypal_email`** : c'est un compte PayPal, il peut légitimement différer
  de l'adresse de connexion.

## Questions ouvertes — à trancher avant le dev

- **Q1 — Suppression d'un membre.** `NO ACTION` (refusée quand il reste des données, recommandé) ou
  autre chose ? Ça change le comportement d'un écran qui marche aujourd'hui.
- **Q2 — Qui a le droit ?** `is_admin_ou_superadmin()` comme le reste de Gestion Membres, ou
  superadmin uniquement vu le caractère irréversible ?
- **Q3 — Prévenir le membre ?** Une notification privée « votre adresse a été changée » a-t-elle un
  sens, sachant qu'il ne peut justement plus lire l'ancienne boîte ?
- **Q4 — Le garde-fou d'exhaustivité vaut-il ses 20 lignes ?** Il protège d'une répétition exacte
  de l'incident de 2024. Je le recommande, mais c'est de la complexité en plus dans un projet dont la
  simplicité est une contrainte assumée.
- **Q5 — `is_admin()`.** Deux définitions coexistent dans le dépôt : `migration-4-1-membres.sql`
  (rôle `admin` seul) et `migration-inscription-publique.sql` (`admin` + `superadmin` + actif). À
  vérifier en base laquelle est vivante ; la spec utilise `is_admin_ou_superadmin()`, non ambigu.

## Réalisation

*(à compléter après le développement : fichiers touchés, hash de commit)*
