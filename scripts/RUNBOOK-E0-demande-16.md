# Runbook E0 — Test à blanc de la migration #16 sur copie Supabase jetable

**Pour :** Cyril · **Durée :** ~45 min la première fois, ~10 min par ré-itération
**Objectif :** obtenir une copie complète de la prod sur un projet Supabase gratuit
temporaire, y jouer `scripts/migration-demande-16-1.sql`, et disposer d'une base
migrée contre laquelle développer et tester le front (blocs B/C).

> Ce runbook remplace le plan staging d'avril (AM6/Q3) : pas de TestEnv, pas de
> front déployé. Copie jetable + front local, rien d'autre.

---

## ⚠️ Trois pièges à connaître avant de commencer

1. **Hors VPN Canton NE.** `pg_dump` attaque directement l'hôte Postgres de
   Supabase. Sous le VPN du Canton, l'accès direct à Supabase est bloqué par
   l'EDR (le Worker `supabase-admin-proxy` contourne ça pour les requêtes REST,
   mais **pas** pour une connexion Postgres). → Fais les étapes 3 et 4 depuis ta
   connexion perso.
2. **L'authentification ne se restaure pas.** Le front envoie un **token
   Firebase**, pas un JWT Supabase. Cette configuration est un réglage *projet*,
   absent du `pg_dump` : sans l'étape 2, toutes les requêtes du front local
   tomberont en 401 sur la copie.
3. **Le dump contient des données personnelles** (emails, adresses postales des
   membres). Il ne doit jamais entrer dans le repo — `scripts/` est gitignoré,
   mais le plus sûr est de le garder **hors du dossier du projet** (voir
   étape 3). Supprime le projet jetable ET le dump une fois le test terminé.

---

## Étape 1 — Créer le projet Supabase jetable

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Nom : `billets-migration16-test` · Plan **Free** · même région que la prod.
3. Choisis un mot de passe de base de données et **note-le** (il n'est plus
   affiché ensuite) — il sert aux étapes 3 et 4.
4. Attends que le projet soit « Healthy » (~2 min).

Récupère les deux chaînes de connexion dans **Project Settings → Database →
Connection string → URI** (une pour la prod, une pour la copie). Format :

```
postgresql://postgres:MOT_DE_PASSE@db.<ref-projet>.supabase.co:5432/postgres
```

## Étape 2 — Rejouer la configuration d'authentification Firebase

Sur le projet **copie** : **Authentication → Sign In / Providers → Third-Party
Auth** (selon la version du dashboard : *Auth → Providers → Third party*), puis
ajouter **Firebase** avec l'ID de projet `asso-billet-site` — à l'identique de
la prod (compare les deux écrans côte à côte).

**Vérification :** cette étape est validée à l'étape 7, quand le front local
affiche des billets au lieu d'une erreur 401.

## Étape 3 — Dumper la prod

Depuis ta connexion perso, dans un dossier **hors du repo** (ex.
`C:\Users\csamson\Documents\dumps-billets`) :

```bash
mkdir -p /c/Users/csamson/Documents/dumps-billets
cd /c/Users/csamson/Documents/dumps-billets

MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd):/dump" postgres:16-alpine \
  pg_dump "postgresql://postgres:MDP_PROD@db.lhwcoybugdsggcclhtgb.supabase.co:5432/postgres" \
  --schema=public --no-owner --format=custom \
  --file=/dump/prod-$(date +%Y%m%d-%H%M).dump
```

- `--schema=public` : on ne copie que le schéma applicatif (tables, RLS,
  fonctions, triggers). Les schémas internes de Supabase (`auth`, `storage`…)
  existent déjà dans le projet neuf et ne doivent pas être écrasés.
- `--no-owner` : évite les erreurs de propriétaire à la restauration ; les
  `GRANT` vers `anon`/`authenticated` sont conservés (indispensables).
- Pas besoin d'installer quoi que ce soit : Docker fournit `pg_dump`.

**Vérification :** le fichier `.dump` fait quelques Mo, pas quelques Ko.

## Étape 4 — Restaurer dans la copie

```bash
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd):/dump" postgres:16-alpine \
  pg_restore --no-owner --dbname "postgresql://postgres:MDP_COPIE@db.<ref-copie>.supabase.co:5432/postgres" \
  /dump/prod-AAAAMMJJ-HHMM.dump
```

Quelques `WARNING`/`ERROR` sur des objets système déjà présents
(`schema public already exists`, extensions, commentaires) sont **normaux**.
Ce qui compte, c'est l'étape 5.

**Pour ré-itérer plus tard** (repartir d'une base propre sans re-dumper) —
dans le SQL Editor de la **copie**, puis relancer la commande ci-dessus :

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
```

## Étape 5 — Vérifications du jour J (à rejouer aussi avant la bascule prod)

Dans le **SQL Editor de la copie** :

```sql
-- 1. Volumes (comparer aux valeurs prod du jour)
SELECT (SELECT COUNT(*) FROM billets)                                    AS billets,
       (SELECT COUNT(*) FROM inscriptions)                               AS inscriptions,
       (SELECT COUNT(*) FROM collectes)                                  AS collectes,
       (SELECT COUNT(*) FROM inscriptions WHERE collecte_id IS NOT NULL) AS deja_rattachees,
       (SELECT COUNT(*) FROM inscriptions WHERE pas_interesse)           AS pas_interesse,
       (SELECT COUNT(*) FROM collection)                                 AS collection;

-- 2. Répartition des statuts (le périmètre du backfill = les 3 premiers)
SELECT "Categorie", COUNT(*) FROM billets GROUP BY 1 ORDER BY 2 DESC;

-- 3. DV2-2 : le marqueur doit être libre (sinon le script refuse de tourner)
SELECT COUNT(*) AS doit_etre_zero FROM collectes WHERE nom = 'Collecte initiale';

-- 4. État des collectes supplémentaires éventuelles (mode additif AM1)
SELECT id, billet_id, nom, scope, categorie, prix FROM collectes ORDER BY created_at;

-- 5. Les triggers et fonctions attendus sont bien là (sinon la restauration est incomplète)
SELECT tgname FROM pg_trigger WHERE NOT tgisinternal ORDER BY 1;
```

**Attendu au 2026-07-22 :** 5 420 billets · ~4 616 inscriptions · 0 collecte ·
0 rattachée · 582 pas_interesse · Terminé 5 192 / Pas de collecte 93 /
Pré collecte 76 / Jamais édité 29 / Masqué 21 / Collecte 9.
Les écarts sont normaux (données vivantes) — c'est la **cohérence** qui compte,
et le point 3 doit valoir 0.

## Étape 6 — Jouer la migration

Copier **tout** `scripts/migration-demande-16-1.sql` dans le SQL Editor de la
copie, exécuter, puis lire les messages.

Ce qu'il faut voir :

- `[A3] 5 277 collectes « Collecte initiale » créées.` (ou le nombre du jour)
- `[A3c] pas_interesse : 582 lignes upsertées…`
- `[A3d] 9 pré-inscriptions purgées…`
- `[A4] … inscriptions rattachées…` puis un bloc **REPORTING** où les sommes
  d'argent et le compteur `changed_by = système` sont **identiques avant/après**
- `[A10] Dérivation rejouée sur 5 420 billets`
- les 7 renommages `_deprecated` + les 3 colonnes mortes droppées
- `COMMIT` (ou `Success. No rows returned`)

**Le seul point qui demande un arbitrage :** si un `WARNING [A9.7]` apparaît, il
liste des inscriptions historiques incompatibles avec le périmètre de leur
collecte (ex. une variante commandée sur un billet déclaré sans variante). Ça ne
bloque pas la migration, mais ces lignes casseront à leur prochaine modification
depuis le front. Envoie-moi le message, on décide : nettoyage ciblé ou
ajustement du mapping.

**En cas d'`ERROR` :** rien n'a été modifié (tout est en transaction unique,
vérifié). Envoie-moi le message, je corrige le script, tu relances — pas besoin
de re-restaurer.

## Étape 7 — Front de test pointé sur la copie

Retenu : **GitHub Pages TestEnv** (`cyril25.github.io/BilletsTouristiques-TestEnv/`),
qui publie la branche `demande-16-refonte-collectes`.

L'aiguillage est **déjà câblé** dans `global.js` (commit sur la branche) : comme
prod et TestEnv partagent le hostname `cyril25.github.io` et ne diffèrent que par
le chemin, la config détecte le préfixe `/BilletsTouristiques-TestEnv/` et bascule
sur la copie Supabase migrée (`ijxajtxnhbczgiarkefo`). Partout ailleurs (prod,
localhost) → Supabase de prod, inchangé.

À faire côté TestEnv, une fois : **Settings → Pages → Branch** =
`demande-16-refonte-collectes`. Firebase Auth : le domaine `cyril25.github.io`
est déjà autorisé (même hostname que la prod), rien à ajouter.

**Vérification étape 2 :** ouvrir la console sur le site TestEnv — le log
`[BT] Environnement TEST — Supabase copie migrée (...)` doit apparaître, et le
catalogue s'afficher. Si tout tombe en 401 : l'auth tierce Firebase n'est pas
rejouée sur la copie (retour étape 2). Si le log TEST n'apparaît pas : le chemin
n'est pas reconnu (vérifier l'URL exacte de la page TestEnv).

## Étape 8 — Checklist de validation

À dérouler sur la copie, avec les **3 personas** (admin, un collecteur, un
membre lambda) : reprendre T1–T11 de la tech-spec v1 + AC21–AC26 de la v2.

⚠️ Tant que les blocs B et C ne sont pas écrits, le front **est cassé par
construction** sur la copie migrée (il lit encore `billet.Prix`, filtre sur
`collecte_id=is.null`, écrit `Categorie` en direct). C'est normal et c'est
justement l'intérêt : chaque bloc livré se vérifie immédiatement contre une
vraie base migrée, au lieu d'être découvert le jour de la bascule.

Ordre de validation prévu : passe P1/P2 → C1/C4 (PayPal, somme due) → B4/B6
(formulaire collecte, cycle de vie) → B1/B2/B3/B5 → C3 → C5/C6/C7 → D.

## Étape 9 — Nettoyage (à ne pas oublier)

Une fois la bascule prod faite et stabilisée :

1. **Retirer les 3 ajouts TEST-ONLY** (marqués dans le code), AVANT ou pendant le
   merge sur main — sinon les creds/URL de la copie restent dans le code de prod
   (inertes, mais la copie sera supprimée) :
   - l'aiguillage `BT_IS_TESTENV` + le bandeau dans `global.js` (remettre
     `SUPABASE_URL`/`SUPABASE_ANON_KEY` en dur sur la prod) ;
   - l'hôte `https://ijxajtxnhbczgiarkefo.supabase.co` du `connect-src` CSP dans
     les 25 fichiers HTML.
2. Supprimer le projet Supabase jetable (dashboard → Settings → General →
   Delete project) — il contient une copie intégrale des données personnelles.
3. Supprimer le dossier `dumps-billets` (dumps + copies).
4. Re-bump des cache-busters (`sw.js` + `menu.html?v=`) au commit de bascule si
   des itérations front ont eu lieu depuis le dernier bump.
