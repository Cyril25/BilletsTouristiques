# Runbook E — Bascule en production de la refonte collectes (#16)

**Pour :** Cyril · **Durée estimée :** 1 h 30 le jour J (dont ~20 min où le site est
inutilisable) · **Prérequis :** la répétition (§2) a été faite au moins une fois.

Suite du `scripts/RUNBOOK-E0-demande-16.md` (copie jetable + test). Celui-ci couvre la
**vraie** bascule : prod Supabase `lhwcoybugdsggcclhtgb` + GitHub Pages
`cyril25.github.io/BilletsTouristiques/` (l'URL porte le nom du dépôt — la racine est un 404).

> Ce fichier est **versionné** (le dossier `scripts/` est gitignoré, donc les `.sql` de
> migration n'existent qu'en un exemplaire sur ta machine — voir §1.3). Il ne contient
> **aucun secret** : les mots de passe restent dans `~/.claude/secrets/`.

---

## 1. Ce qu'il faut savoir avant de décider quoi que ce soit

### 1.1 Ce que la migration détruit réellement

C'est la question qui commande tout le reste. Vérifié dans les scripts :

| Opération | Script | Réversible ? |
|---|---|---|
| Création de ~5 300 collectes + rattachement des inscriptions | 1 (A3/A4) | par suppression, mais l'état dérivé recalculé ensuite ne se « dé-calcule » pas |
| `Prix`, `PrixVariante`, `PayerFDP`, `FDP_Com`, `DatePre`, `DateColl`, `DateFin` → `*_deprecated` | 1 (A11) | **oui** — simple renommage, aucune valeur perdue |
| `DateCollVariante`, `DateFinVariante`, `CollecteurVariante` **droppées** | 1 (A11) | non — mais **100 % vides** sur les 5 420 billets (audit AUD-N8) : rien à perdre |
| Triggers d'immuabilité billet + dérivation du statut | 1 | oui (DROP TRIGGER) |
| Policies RLS réécrites par `collectes.collecteur` | 2 | **oui** — `scripts/rollback-prod-demande-16-2.sql` |
| `billets.Collecteur` → `Collecteur_deprecated` | 2 | **oui** — renommage |

**Conclusion : la migration ne détruit aucune donnée utile.** Ce qu'on risque, ce n'est pas
la perte de données, c'est un **état intermédiaire incohérent** ou un front cassé.

Le DROP définitif des colonnes `*_deprecated` est **volontairement hors de ce runbook**
(script séparé, après plusieurs semaines de stabilisation). Ne le fais pas le jour J : ces
colonnes sont exactement ce qui rend un retour en arrière envisageable.

### 1.2 Rollback : ce qui est possible, à quel moment

Le plan Supabase est le **gratuit** : ni sauvegarde automatique, ni PITR. **Ton dump est
le seul filet.** D'où trois fenêtres, très différentes :

- **Avant tout script** — rien à défaire en base. On redéploie `main` : 2 minutes.
- **Entre le script 1 et le script 2** — le script 2 n'a pas encore tourné, mais le
  script 1 a renommé les colonnes et remplacé les triggers : l'ancien front ne
  fonctionne plus. Retour possible uniquement par **restore du dump**.
- **Après le script 2** — le script 2 seul se défait avec
  `scripts/rollback-prod-demande-16-2.sql` (déjà utilisé pour de vrai le 2026-07-24, et
  vérifié). Pour revenir avant le script 1 : **restore du dump**.

**Décision (2026-07-28) : on n'écrit pas de script de rollback pour le script 1.** Raisons :
il ne détruit rien d'utile (§1.1), l'inverser proprement demanderait de « dé-dériver » des
statuts recalculés et de défaire des upserts — donc un script complexe qui ne serait
testable que contre une copie restaurée… c'est-à-dire exactement la manœuvre qu'on veut
éviter. Le dump fait le travail, en plus sûr.

**La contrepartie, à assumer explicitement :** un restore ramène la base à l'instant du
dump. Tout ce qui a été écrit entre-temps (inscriptions, déclarations de paiement, mises en
enveloppe) est perdu. C'est pourquoi la fenêtre doit être courte et annoncée.

### 1.3 Les scripts sont versionnés (résolu le 2026-07-31)

`scripts/` reste ignoré par défaut — il contient `service-account.json`, des scripts pleins
d'emails de membres et `node_modules`. Mais le **kit de bascule** en est excepté et vit
désormais dans le dépôt, donc sur GitHub :

`migration-demande-16-1.sql`, `migration-demande-16-2.sql`,
`rollback-prod-demande-16-2.sql`, `migration-demande-33-notif-ciblee-membre.sql`,
`_marqueur-testenv.sql`, `backup-supabase.ps1`, `restore-supabase.ps1`,
`restore-prod-supabase.ps1`, `RUNBOOK-E0-demande-16.md`.

Vérifié avant publication (le dépôt est **public**) : aucun email, aucune clé, aucun mot de
passe — ceux-ci restent dans `~/.claude/secrets/` et ne sont que *référencés par chemin*.
Les seules chaînes de connexion présentes sont des placeholders (`MDP_PROD`, `<motdepasse>`).

**Conséquence pratique le jour J :** plus besoin de clé USB, et si la machine lâche en
cours de bascule, les scripts — y compris **celui du rollback** — se récupèrent par un
`git clone` depuis n'importe quel poste. Le **dump**, lui, reste hors dépôt (données
personnelles) : c'est le seul élément qui n'existe qu'en local, à copier ailleurs si tu
veux une vraie redondance.

### 1.4 Les trois scripts de dump/restore, et lequel sert à quoi

| Script | Cible | Rôle |
|---|---|---|
| `backup-supabase.ps1` | prod (lecture) | produit le dump : `roles.sql` + `schema.sql` + `data.sql` horodatés dans `Documents\Perso\Backups\BilletsTouristiques\<horodatage>` |
| `restore-supabase.ps1` | **jamais la prod** | restaure vers un projet de test ; refuse catégoriquement la référence de prod |
| `restore-prod-supabase.ps1` | **prod uniquement** | c'est le rollback (§5). En `-Repetition`, il vise le jetable : c'est ainsi qu'on le teste avant le jour J |

Le dump est en **trois fichiers SQL**, pas une archive `pg_dump --format=custom` : les
scripts de restauration attendent `schema.sql` et `data.sql` et refusent tout autre format.

---

## 2. Répétition générale (J-1 ou avant, ~45 min)

**Ne pas sauter cette étape** : elle valide le dump *et* chronomètre le restore, qui est
ton seul plan B. Un dump jamais restauré n'est pas une sauvegarde, c'est une intention.

1. Dump de la prod (§4.2) — **hors VPN Canton**.
2. Restaurer ce dump sur le projet jetable (`ijxajtxnhbczgiarkefo`) **avec le script de
   rollback lui-même**, en mode répétition :

   ```powershell
   .\scripts\restore-prod-supabase.ps1 -Repetition
   ```

   C'est le point de l'exercice : on n'éprouve pas une procédure voisine, on éprouve
   **exactement** le code qui tournera en cas de rollback. Le script affiche sa durée en
   fin d'exécution — **la noter**, c'est ton temps de rollback le jour J.
3. **Rejouer `scripts/_marqueur-testenv.sql` sur le jetable.** Le restore a fait
   `DROP SCHEMA public CASCADE` : le marqueur `public._bt_env` est parti avec. Sans lui,
   le garde-fou TEST-ONLY en tête du script 2 refusera de tourner — et le message
   ressemblera à s'y méprendre à un échec de la migration.
4. Y rejouer les scripts 1 puis 2, dérouler la checklist §6.

   Entre le restore et le script 1, le TestEnv est momentanément cassé : il sert le front
   #16 par-dessus une base revenue à l'état d'avant. C'est normal, ça se résorbe au
   script 1.
5. Noter les chiffres du jour (billets / inscriptions / collectes) : ils serviront de
   référence pour les contrôles de §4.

---

## 3. Choix de la fenêtre

- **Hors période de collecte active** : regarder `SELECT COUNT(*) FROM collectes WHERE
  categorie = 'Collecte'` — le jour J idéal est celui où ce compte est au plus bas.
- Prévenir les 5 autres (Geneviève, Laura, Jean-Philippe, Damien, Vanessa) : « le site est
  indisponible de X à Y, n'enregistrez rien pendant ce créneau ».
- Se garder 2 h devant soi, pas 30 minutes avant un rendez-vous.

---

## 4. Jour J

### 4.1 Contrôles pré-vol (SQL Editor de la **prod**)

```sql
-- 1. Volumes de départ (à comparer après migration)
SELECT (SELECT COUNT(*) FROM billets)                                    AS billets,
       (SELECT COUNT(*) FROM inscriptions)                               AS inscriptions,
       (SELECT COUNT(*) FROM collectes)                                  AS collectes,
       (SELECT COUNT(*) FROM inscriptions WHERE collecte_id IS NOT NULL) AS deja_rattachees,
       (SELECT COALESCE(SUM(nb_normaux), 0) FROM inscriptions)           AS total_normaux,
       (SELECT COALESCE(SUM(nb_variantes), 0) FROM inscriptions)         AS total_variantes;

-- 2. Le marqueur du script 1 doit être libre, sinon il refuse de tourner
SELECT COUNT(*) AS doit_etre_zero FROM collectes WHERE nom = 'Collecte initiale';

-- 3. La prod n'a PAS le marqueur TESTENV (les scripts TEST-ONLY doivent y refuser)
SELECT COUNT(*) AS doit_etre_zero FROM information_schema.tables
 WHERE table_schema = 'public' AND table_name = '_bt_env';
```

**Go/no-go :** les points 2 et 3 valent 0, les volumes ressemblent à ceux de la répétition.

### 4.2 Dump de sécurité — **hors VPN Canton NE**

Docker Desktop démarré, puis :

```powershell
.\scripts\backup-supabase.ps1
```

Le script écrit `roles.sql`, `schema.sql` et `data.sql` dans un dossier horodaté sous
`Documents\Perso\Backups\BilletsTouristiques\`. Il lit la chaîne de connexion dans
`~\.claude\secrets\billets-supabase-db-url.txt` (Session pooler).

**Contrôle :** `data.sql` fait plusieurs Mo (~4 Mo à date), pas quelques Ko. Le dump
contient des données personnelles : il reste **hors du repo** et se supprime une fois la
bascule stabilisée.

⚠ Ne pas fabriquer le dump à la main avec `pg_dump --format=custom` : les scripts de
restauration attendent les trois fichiers SQL et ne savent pas relire une archive custom.

> À partir d'ici, l'horloge tourne : tout ce qui sera écrit en prod ne survivra pas à un
> restore.

### 4.3 Script 1 — structure

SQL Editor de la **prod** (⚠ vérifier deux fois la base sélectionnée — c'est l'erreur du
2026-07-24), coller **tout** `scripts/migration-demande-16-1.sql`, exécuter.

À lire dans les `NOTICE` : le nombre de collectes créées, le bloc REPORTING où les sommes
d'argent sont **identiques avant/après**, la dérivation rejouée, les 7 renommages
`_deprecated`, les 3 colonnes mortes droppées, et le `COMMIT`.

- **`ERROR`** → rien n'a été modifié (transaction unique). On s'arrête, on analyse, la prod
  est intacte : pas besoin de restore.
- **`WARNING [A9.7]`** → des inscriptions historiques incompatibles avec le périmètre de
  leur collecte. Non bloquant, mais **noter la liste** : ces lignes casseront à leur
  prochaine modification depuis le front.

Contrôles immédiats :

```sql
SELECT COUNT(*) FROM collectes;                                    -- ~ nb de billets actifs
SELECT COUNT(*) FROM inscriptions WHERE collecte_id IS NULL;       -- doit valoir 0
SELECT COUNT(*) FROM billets WHERE "Prix" IS NOT NULL;             -- doit ERREURER (colonne renommée)
```

**À partir d'ici, la prod est en état #16 et l'ancien front ne fonctionne plus.** C'est le
**point de non-retour par script** : le seul retour possible est le restore du dump.

### 4.4 Front — déploiement de la branche

Le front de la branche lit `collectes` : il ne peut pas être déployé avant le script 1, et
l'ancien front ne survit pas au script 1. Les deux étapes s'enchaînent donc **sans pause**.

1. **Retirer le TEST-ONLY** (E1) — c'est du code, ça se fait *avant* le jour J, sur une
   branche de préparation :
   - `global.js` : supprimer l'aiguillage `BT_IS_TESTENV` et remettre l'URL/clé de prod en
     dur (garder le bandeau d'environnement, il devient inerte en prod) ;
   - **26 fichiers HTML** : retirer `https://ijxajtxnhbczgiarkefo.supabase.co` du
     `connect-src` des CSP (`grep -rl ijxajtxnhbczgiarkefo --include=*.html .`) ;
   - vérifier qu'il ne reste rien : `grep -rn "ijxajtxnhbczgiarkefo\|TESTENV" --include=*.js --include=*.html .`
2. Merger `demande-16-refonte-collectes` dans `main`, bumper `sw.js` + `menu.html`.
3. Pousser sur `origin` → GitHub Pages redéploie (~1 min).
4. Vérifier que le JS servi est bien le neuf :
   `curl -s https://cyril25.github.io/BilletsTouristiques/global.js | grep -c versionsOuvertesCollecte`

### 4.5 Script 2 — RLS et collecteur

Une fois le front en ligne **et** le catalogue vérifié en lecture (§6, ligne 1) : coller
`scripts/migration-demande-16-2.sql` dans le SQL Editor de la prod.

> Le script porte un garde-fou TEST-ONLY (`_bt_env`) hérité de la phase de test : il
> **refusera de tourner sur la prod**. C'est voulu — retirer le bloc `DO` d'en-tête, ou
> utiliser la variante prod, **après avoir vérifié une dernière fois la base sélectionnée**.

Contrôles :

```sql
SELECT polname FROM pg_policy WHERE polrelid = 'inscriptions'::regclass ORDER BY 1;
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'billets' AND column_name LIKE 'Collecteur%';   -- Collecteur_deprecated
```

**Si ça tourne mal ici et seulement ici :** `scripts/rollback-prod-demande-16-2.sql` remet
policies, trigger et colonne à l'identique, sans toucher aux données.

### 4.6 Après

- Jouer `scripts/migration-demande-33-notif-ciblee-membre.sql` (en attente depuis le 25).
- Créer la notification « nouveautés » pour les membres (cible `tous`).
- Supprimer le projet jetable `ijxajtxnhbczgiarkefo`, le Worker
  `supabase-admin-proxy-test`, ses secrets et le dépôt `BilletsTouristiques-TestEnv`.
- Supprimer le dump une fois quelques jours passés sans incident (données personnelles).
- **Ne pas** dropper les colonnes `*_deprecated` : script séparé, dans plusieurs semaines.

---

## 5. Décision d'abandon (comment savoir qu'on rollbacke)

Rollbacker coûte le dump + le temps mesuré en §2 ; ne pas rollbacker sur un détail. Critères :

- **On restaure** si : les montants dus sont faux, des inscriptions ont disparu, ou un
  écran essentiel (catalogue, mes inscriptions) est inutilisable pour les membres.
- **On corrige en avant** si : c'est un affichage, un écran admin, ou un cas isolé. Le
  correctif se pousse en minutes, le restore coûte les écritures de la journée.

Procédure de restore — **hors VPN Canton**, Docker démarré :

```powershell
.\scripts\restore-prod-supabase.ps1          # dernier dump en date
```

Le script ne prend que la prod pour cible (il refuse toute autre référence), affiche l'âge
du dump — donc la fenêtre d'écritures perdues — et demande deux confirmations : la
référence du projet, puis la phrase `RESTAURER LA PRODUCTION`. Il termine par un contrôle
qui doit montrer `collectes` disparue et les colonnes `Prix` / `Collecteur` revenues sur
`billets` : c'est la preuve qu'on est bien repassé avant le script 1.

Ensuite seulement : redéployer `main` (l'ancien front) sur GitHub Pages, bumper `sw.js` et
`menu.html`, et prévenir l'équipe que les écritures postérieures au dump sont perdues.

---

## 6. Checklist de fumée (à dérouler juste après §4.4, puis §4.5)

Avec les **3 personas** — un membre lambda, un collecteur, l'admin :

1. **Catalogue** : les prix, dates et collecteurs s'affichent ; un billet multi-collecte
   montre son accordéon ; la phrase « Par X au prix de Y euros… » est complète.
2. **Fiche billet** : la section collecte affiche statut, collecteur, prix, dates.
3. **Mes inscriptions** : quantités et montants justes (dont un billet variante), total dû
   cohérent, bouton PayPal présent hors pré-collecte.
4. **Mes collectes** (collecteur) : ses collectes et elles seules ; détail avec les bonnes
   colonnes ; vérification des paiements limitée à ses inscrits.
5. **Admin** : carte avec statut et compteur d'inscriptions ; modale groupée par collecte ;
   ajout d'une inscription sur une collecte précise ; création d'un billet + sa pré-collecte.
6. **Inscription réelle** : s'inscrire sur une collecte ouverte avec un compte de test, puis
   se désinscrire. C'est le seul test qui valide RLS + triggers de bout en bout.

---

## 7. Ce qu'on ne fait pas le jour J

- Le DROP des colonnes `*_deprecated` (§1.1).
- La suppression du code mort « collectes supplémentaires » (dette #49).
- Le sprint sécurité RLS (`inscriptions_auto`, `membres`) — indépendant de #16.
- La revue de `security-findings.md`.
- **L'unification des deux règles de « collecte principale »** (décision du 2026-07-31 :
  après la bascule). Le catalogue prend la collecte **la plus récente**
  (`app-new.js:1627`) ; l'admin, `mes-collectes` et les pré-inscriptions prennent
  **« Collecte initiale » d'abord, même terminée** (`admin.js:2532`). Sur un billet dont
  la « Collecte initiale » est terminée et qui reçoit une nouvelle collecte, le membre
  s'inscrit sur la nouvelle pendant que le hook de pré-inscription vise l'ancienne.
  **Sans effet le jour J** : la migration crée exactement une collecte par billet, donc
  les deux règles coïncident (mesuré sur la copie : 0 billet à plusieurs collectes). Le
  défaut apparaît à la première seconde collecte ajoutée — donc au premier billet
  recollecté après la bascule. Détail dans la fiche notes.
