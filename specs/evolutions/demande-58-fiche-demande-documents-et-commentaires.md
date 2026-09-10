# Demande #58 — Fiche demande pleine page : documents de spec lisibles et commentables par les admins

- **Épic :** corrections et évolutions (complexité **M**)
- **Demande :** #58 de la table `demandes` de production — Cyril, 2026-09-09, priorité *normale*.
  Numéro **confirmé par Cyril le 2026-09-10**, à la création de la demande depuis l'écran.
- **Concerne :** les admins (6 personnes), et eux seuls — `admin-demandes.html` porte
  `data-require-admin`, et **aucun écran membre n'écrit dans `demandes`** (vérifié : la table
  n'est alimentée que par `admin-demandes.js`).
- **Statut :** **À tester.** Développée et mise en ligne le 2026-09-10 ; **migration jouée le
  même jour** par Cyril dans le SQL Editor — les ports 5432 et 6543 étant filtrés depuis son
  poste, la voie habituelle (psql via Docker) n'était pas praticable. Vérifié ensuite en
  production : la table `demande_commentaires` répond, les documents du cadrage sont rattachés à
  #1, #22 et #58, et la contrainte de chemins **rejette** `specs/../global.js`, `global.js` et une
  URL absolue (erreur `23514`).

## Contexte (demande)

Deux besoins exprimés le même jour, qui n'en font qu'un :

> Quand on fait un fichier `.md` pour un ou plusieurs points « L », arriver à le rendre accessible
> aux admins en le liant à la demande. J'aimerais que les 3 md créés puissent être lus par les
> admins, et qu'ils puissent ensuite commenter en fonction de ce qu'ils pensent qu'on aurait
> oublié, qu'on pourrait améliorer, adapter…

> Une popup pour créer et modifier une demande est de moins en moins adaptée : le champ
> description est de taille raisonnable, voire un peu petit ; le champ commentaire est vraiment
> petit, sachant que quand il y a des questions tu écris dedans. Pour les points S et M ça passe,
> mais pour les points L ça manque d'espace pour saisir des remarques — potentiellement suite à la
> lecture d'un fichier md attaché.

**Le lien entre les deux :** on ne peut pas coller un document de 250 lignes et un fil de
discussion dans une popup. Le contenant doit changer en même temps que le contenu.

## Le déclencheur concret

Le cadrage de #22 et #1 vient de produire **trois documents** que personne d'autre que Cyril ne
peut lire depuis l'application :

- `specs/evolutions/demande-1-vente-du-rab.md`
- `specs/evolutions/demande-22-tableau-doubles-recherches.md`
- `specs/evolutions/demande-22-et-1-cadrage-doubles-et-vente.md` *(commun aux deux demandes)*

Ce sont exactement les documents qui gagneraient à être relus par les 5 autres admins **avant** le
dev : ce sont des décisions produit, pas des détails techniques.

## La mesure qui rend ce chantier petit

**GitHub Pages sert déjà les fichiers `.md` du dépôt, sur le même domaine que l'application.**
Vérifié le 2026-09-09 :

```
GET https://cyril25.github.io/BilletsTouristiques/specs/evolutions/CONVENTION-DEMANDES.md
→ 200, Content-Type: text/markdown; charset=utf-8, 6 360 octets
```

Trois conséquences, toutes bonnes :

1. **Un `fetch()` same-origin suffit** — autorisé tel quel par la CSP des pages admin
   (`default-src 'self'`), sans y toucher.
2. **Aucune copie, aucune synchronisation** : le fichier versionné dans le dépôt **est** celui que
   l'admin lit. Un `git push` met la lecture à jour, comme le reste du site.
3. **Les chemins relatifs marchent partout** : `demande.html` et `specs/` partagent le même
   préfixe, donc la même URL relative fonctionne en prod (`/BilletsTouristiques/`) **et** en
   staging (`/BilletsTouristiques-TestEnv/`), sans configuration d'environnement.

À noter, sans conséquence : **le dépôt est public** (la convention le rappelle — « aucune clé ne
figure dans ce dépôt »). Afficher ces documents dans l'appli n'expose donc rien de nouveau ; ça
rend seulement le chemin praticable.

## Les décisions prises au cadrage (2026-09-09)

| | Décision |
|---|---|
| **Commentaires** | **Un fil par document**, avec **section facultative** choisie dans la liste des titres du document. Pas d'annotations ancrées dans la page : une spec en cadrage se réécrit beaucoup, et les ancres dériveraient. Un commentaire qui cite un titre disparu reste lisible — il ne casse rien. |
| **Lecture** | **Admins seuls**, comme le reste de l'écran Gestion Demandes. |
| **Contenant** | **Fiche pleine page** `demande.html?id=…` pour la vie de la demande ; **la popup reste pour la création**. |
| **Suite** | Spec d'abord, dev sur feu vert explicite. |

### Pourquoi la popup survit

**Pas pour protéger les membres** — ils n'y accèdent jamais : une demande n'est déposée que par un
admin, qui consigne dans `demandeur` le nom de la personne à l'origine du besoin. #52 est arrivée
ainsi, depuis un signalement Facebook de sebleniglo54.

La vraie raison est la **saisie rapide**. Consigner une demande entendue sur Facebook, c'est trois
champs et dix secondes ; ouvrir une fiche pleine page pour ça serait un détour à chaque fois. La
popup garde donc son rôle d'origine — description, écran, qui, priorité — et **tout le reste
déménage** : la fiche est le lieu où la demande *vit*, la popup celui où elle *naît*.

C'est aussi une leçon de #52 : `.user-modal` n'avait ni `max-height` ni `overflow`, et le
formulaire de contact — le seul assez long pour dépasser — devenait inatteignable en bas. Y
ajouter un document long et un fil de discussion, c'est recharger la pièce qui a déjà lâché.

## Ce qui est à construire

### 1. Le lien demande ↔ documents

Un document peut servir plusieurs demandes (le cadrage commun sert #22 **et** #1), et une demande
peut porter plusieurs documents (#1 a sa spec **et** le cadrage). C'est donc du **plusieurs à
plusieurs**.

Retenu, sans table de liaison : **`demandes.docs TEXT`**, un chemin relatif par ligne.

```
specs/evolutions/demande-1-vente-du-rab.md
specs/evolutions/demande-22-et-1-cadrage-doubles-et-vente.md
```

Une table de liaison serait plus « propre » et ne servirait à rien ici : la duplication d'un chemin
sur deux demandes coûte deux lignes de texte, contre une jointure à écrire et à maintenir dans
chaque requête. **La stack simple est une contrainte de maintenabilité de ce projet**, à 6
personnes — on ne paie pas une jointure pour une élégance dont personne ne profite.

⚠ **Garde-fou obligatoire :** n'accepter que des chemins commençant par `specs/` et finissant par
`.md`, **sans `..`**. Sinon le champ devient un lecteur de fichiers arbitraire du site.

### 2. La fiche pleine page `demande.html?id=…`

`data-require-admin="true"`, atteignable en cliquant une ligne de la liste (la popup d'édition
n'apparaît plus que pour la création). Contenu :

- **En-tête** : numéro, état, priorité, complexité, demandeur, écran, dates — modifiables sur place.
- **Description** : au large, plus une ligne de 4 lignes de textarea.
- **Journal de traitement** (`commentaire`) : un vrai éditeur, pleine largeur. C'est le champ qui
  reçoit les questions de cadrage — c'est lui que la popup étranglait.
- **Documents attachés** : rendus, avec un sommaire des titres.
- **Fil de commentaires** : sous le document.

### 3. Le rendu markdown

*Analyse initiale :* `marked` depuis **cdnjs**, épinglé avec `integrity` — même patron que Font
Awesome, et cdnjs est déjà dans la CSP. Un rendu maison serait vite un parser complet.

⚠ **Écart assumé au développement : convertisseur fait maison, sans dépendance.** L'analyse
ci-dessus oubliait que `marked` **laisse passer le HTML brut** et n'embarque plus de sanitizer
depuis la v5 : il aurait fallu **DOMPurify en plus**. Deux dépendances au lieu de zéro, pour un
sous-ensemble de markdown qu'on maîtrise. Le convertisseur écrit applique la règle inverse —
**on échappe tout le document d'abord, on transforme ensuite** — ce qui rend l'injection
structurellement impossible plutôt que filtrée après coup.

Une conséquence volontaire : **les `_underscores_` ne produisent pas d'italique.** Le projet écrit
sans cesse `pas_interesse`, `prix_variante`, `statut_paiement` — les traiter en italique
abîmerait une phrase sur deux. `*astérisques*` suffisent.

⚠ **Le HTML brut du markdown doit être échappé, pas interprété.** La CSP de ces pages autorise
`'unsafe-inline'` pour les scripts : un `<script>` présent dans un `.md` s'exécuterait. Nos specs
n'ont aucun besoin de HTML inline — on l'échappe, et la question est close.

### 4. Le fil de commentaires

```
demande_commentaires
  id            INT   GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY
  demande_id    INT   NOT NULL REFERENCES demandes(id) ON DELETE CASCADE
  doc           TEXT              -- chemin du document commenté, NULL = la demande en général
  section       TEXT              -- titre de section choisi dans la liste, facultatif
  auteur_email  TEXT  NOT NULL
  texte         TEXT  NOT NULL
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at    TIMESTAMPTZ
```

**RLS** — conventions du projet : **jamais `TO authenticated`** (le JWT Firebase arrive en rôle
`anon`), et `is_admin_ou_superadmin()` et non `is_admin()`, qui exclut le superadmin.

- **SELECT / INSERT** : `is_admin_ou_superadmin()`.
- **UPDATE / DELETE** : son propre commentaire (`lower(auteur_email) = lower(auth.jwt() ->> 'email')`),
  ou superadmin. Un admin ne réécrit pas le retour d'un autre.

### 5. La notification

Un commentaire déposé ne sert à rien si personne ne le voit : ligne dans `notifications`,
`cible = 'admins'` (qui inclut les superadmins), titre court pour la cloche, lien vers la fiche.

⚠ **L'auteur reçoit aussi sa propre notification.** Le modèle de `notifications` cible des
**groupes** (`tous` / `collecteurs` / `admins`) ou **une personne** (`cible_email`) — il ne sait
pas dire « le groupe sauf untel ». L'exclure supposerait une notification privée par admin, soit
cinq lignes au lieu d'une à chaque commentaire. Le bruit d'une cloche sur son propre message a
paru le moindre des deux maux ; à revoir si ça agace.

## Critères d'acceptation

1. Depuis Gestion Demandes, ouvrir une demande mène à sa **fiche pleine page** ; « Nouvelle
   demande » ouvre toujours la **popup**.
2. La description et le journal de traitement s'éditent dans des champs pleine largeur, sans que
   le bas de l'écran devienne inatteignable — **vérifié sur téléphone**, pas seulement en desktop
   réduit (leçon de #53 : c'est un vrai téléphone qui avait rattrapé le défaut).
3. Un ou plusieurs documents s'attachent à une demande ; le **même document peut être attaché à
   deux demandes** et s'affiche dans les deux.
4. Un chemin hors `specs/`, ou contenant `..`, est **refusé**.
5. Le document s'affiche rendu — titres, **tableaux**, listes, code, citations — et reste lisible
   en **mode sombre** (#54) comme en clair.
6. Du HTML brut placé dans un `.md` s'affiche **comme du texte** et ne s'exécute pas.
7. Un admin dépose un commentaire, avec ou sans section ; les autres admins le voient avec auteur
   et date, et reçoivent une notification.
8. Un admin modifie ou supprime **son** commentaire, jamais celui d'un autre — y compris par appel
   direct à l'API.
9. Un non-admin n'atteint ni la fiche, ni les commentaires, ni par l'écran ni par l'API.
10. Un document absent ou renommé affiche un message clair, pas une page vide ni une erreur console.

## Ce que cette spec ne fait pas

- **Pas d'édition des specs depuis l'appli.** Les documents restent écrits dans le dépôt et
  poussés par git. L'appli est une **liseuse**, pas un éditeur — c'est ce qui garde le versionnage
  et évite deux sources de vérité.
- **Pas d'annotations ancrées** dans le corps du document (décision de cadrage).
- **Pas d'ouverture aux membres**, ni au demandeur non-admin.
- **Pas de migration du journal `commentaire` vers le fil.** Les deux cohabitent : `commentaire`
  reste le journal de traitement, affiché et cherché dans la liste (`admin-demandes.js:193`) ; le
  fil porte la discussion. Les fusionner serait un chantier à part — **à reposer plus tard**, quand
  le fil aura fait ses preuves.

## Le SQL de la migration

Reproduit ici parce que `scripts/` est **gitignoré** : cette spec est la seule copie
versionnée. Le script est **rejouable** (tout en `IF NOT EXISTS` / `CREATE OR REPLACE`)
et ne contient **aucun bloc destructif**.

⚠ Un piège évité en cours de route : la première version validait les chemins avec un
`NOT EXISTS (SELECT ... regexp_split_to_table(...))`. **PostgreSQL refuse toute sous-requête
dans une contrainte `CHECK`** — la migration aurait échoué à l'exécution. La règle tient
désormais dans une seule expression régulière, vérifiée sur 15 cas (chemins valides,
multi-lignes, `..`, antislash, URL absolue, extension autre que `.md`).

```sql
-- ============================================================
-- Demande #58 — Documents de spec attachés à une demande,
--               et fil de commentaires entre admins
-- ============================================================
-- Spec : specs/evolutions/demande-58-fiche-demande-documents-et-commentaires.md
--
-- À jouer dans l'éditeur SQL Supabase (projet de production
-- lhwcoybugdsggcclhtgb). Le script est REJOUABLE : tout est en
-- IF NOT EXISTS / CREATE OR REPLACE, et aucun bloc destructif.
--
-- Sans ce script, la fiche demande s'affiche mais :
--   - l'onglet Documents reste vide (colonne `docs` absente) ;
--   - le fil de commentaires affiche un message d'indisponibilité.
-- L'écran le dit et nomme ce fichier — rien ne casse en attendant.
-- ============================================================

-- ------------------------------------------------------------
-- 1. LES DOCUMENTS ATTACHÉS À UNE DEMANDE
-- ------------------------------------------------------------
-- Un chemin relatif par ligne, depuis la racine du site.
-- Choix assumé : pas de table de liaison. Le lien est du
-- plusieurs-à-plusieurs (le cadrage commun sert #22 ET #1), mais
-- dupliquer un chemin sur deux demandes coûte deux lignes de
-- texte, contre une jointure à écrire et maintenir dans chaque
-- requête. À six personnes, c'est le bon échange.
--
-- Le filtrage des chemins (specs/… .md, pas de « .. ») est fait
-- côté écran ET redit ici par une contrainte : le champ ne doit
-- jamais pouvoir désigner autre chose qu'une spec du dépôt.
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS docs TEXT;

COMMENT ON COLUMN demandes.docs IS
    'Demande #58 — chemins relatifs des documents de spec attachés, un par ligne '
    '(ex. specs/evolutions/demande-1-vente-du-rab.md). Servis par GitHub Pages en '
    'text/markdown, lus par la fiche demande via un fetch() same-origin.';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'demandes_docs_chemins_valides'
    ) THEN
        -- Une contrainte CHECK ne peut PAS contenir de sous-requete (Postgres
        -- le refuse). La regle « chaque ligne non vide ressemble a un chemin
        -- specs/....md » doit donc tenir dans UNE expression reguliere, appliquee
        -- au texte entier :
        --   ^[ \t]*(chemin)?[ \t]*         -> la premiere ligne, vide ou valide
        --   (\n[ \t]*(chemin)?[ \t]*)*$    -> les suivantes, pareil
        -- Le garde-fou « .. » reste une condition a part : la classe de
        -- caracteres autorise le point, donc specs/../global.js satisferait la
        -- forme du chemin sans lui.
        ALTER TABLE demandes ADD CONSTRAINT demandes_docs_chemins_valides CHECK (
            docs IS NULL
            OR btrim(docs) = ''
            OR (
                docs !~ '\.\.'
                AND docs !~ '\\'
                AND docs ~ '^[ \t]*(specs/[A-Za-z0-9_./-]+\.md)?[ \t]*(\n[ \t]*(specs/[A-Za-z0-9_./-]+\.md)?[ \t]*)*$'
            )
        );
    END IF;
END $$;

-- ------------------------------------------------------------
-- 2. LE FIL DE COMMENTAIRES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS demande_commentaires (
    id           INT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    demande_id   INT  NOT NULL REFERENCES demandes(id) ON DELETE CASCADE,

    -- Chemin du document commenté. NULL = commentaire sur la demande
    -- en général, pas sur un document précis.
    doc          TEXT,
    -- Titre de section choisi dans la liste des titres du document.
    -- Facultatif, et volontairement stocké en TEXTE et non en ancre :
    -- une spec en cadrage se réécrit beaucoup. Un commentaire qui cite
    -- un titre disparu reste lisible — une ancre cassée, non.
    section      TEXT,

    auteur_email TEXT NOT NULL,
    texte        TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ,

    CONSTRAINT demande_commentaires_texte_non_vide CHECK (btrim(texte) <> '')
);

CREATE INDEX IF NOT EXISTS idx_demande_commentaires_demande
    ON demande_commentaires (demande_id, created_at);

COMMENT ON TABLE demande_commentaires IS
    'Demande #58 — fil de relecture des specs entre admins. Distinct de demandes.commentaire, '
    'qui reste le journal de traitement affiché et cherché dans la liste.';

-- ------------------------------------------------------------
-- 3. RLS
-- ------------------------------------------------------------
-- Conventions du projet : JAMAIS `TO authenticated` (le JWT Firebase
-- arrive en rôle anon), et is_admin_ou_superadmin() plutôt que
-- is_admin() qui exclut le superadmin.
ALTER TABLE demande_commentaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demande_commentaires_select ON demande_commentaires;
CREATE POLICY demande_commentaires_select ON demande_commentaires FOR SELECT
    USING (is_admin_ou_superadmin());

-- On n'écrit que sous son propre nom : sans ce WITH CHECK, un admin
-- pourrait poster un avis signé d'un autre.
DROP POLICY IF EXISTS demande_commentaires_insert ON demande_commentaires;
CREATE POLICY demande_commentaires_insert ON demande_commentaires FOR INSERT
    WITH CHECK (
        is_admin_ou_superadmin()
        AND lower(auteur_email) = lower(auth.jwt() ->> 'email')
    );

-- Un admin ne réécrit ni n'efface le retour d'un autre — auteur seul.
-- Pas d'échappatoire superadmin ici : le projet n'expose pas de
-- is_superadmin() en base (seulement is_admin(), is_admin_ou_superadmin(),
-- is_collecteur(), is_whitelisted()), et c'est le même raisonnement qu'en
-- #48 — une policy de plus à maintenir pour un abus que personne ne
-- cherche à commettre serait un mauvais échange. Un ménage exceptionnel
-- se fait en SQL.
DROP POLICY IF EXISTS demande_commentaires_update ON demande_commentaires;
CREATE POLICY demande_commentaires_update ON demande_commentaires FOR UPDATE
    USING (
        is_admin_ou_superadmin()
        AND lower(auteur_email) = lower(auth.jwt() ->> 'email')
    )
    WITH CHECK (
        is_admin_ou_superadmin()
        AND lower(auteur_email) = lower(auth.jwt() ->> 'email')
    );

DROP POLICY IF EXISTS demande_commentaires_delete ON demande_commentaires;
CREATE POLICY demande_commentaires_delete ON demande_commentaires FOR DELETE
    USING (
        is_admin_ou_superadmin()
        AND lower(auteur_email) = lower(auth.jwt() ->> 'email')
    );

-- ------------------------------------------------------------
-- 4. RATTACHEMENT DES PREMIERS DOCUMENTS
-- ------------------------------------------------------------
-- Les trois documents du cadrage #22/#1, plus la spec de #58
-- elle-même. C'est ce qui donne quelque chose à lire dès la
-- première ouverture de la fiche.
UPDATE demandes SET docs =
    'specs/evolutions/demande-1-vente-du-rab.md' || E'\n' ||
    'specs/evolutions/demande-22-et-1-cadrage-doubles-et-vente.md'
 WHERE id = 1;

UPDATE demandes SET docs =
    'specs/evolutions/demande-22-tableau-doubles-recherches.md' || E'\n' ||
    'specs/evolutions/demande-22-et-1-cadrage-doubles-et-vente.md'
 WHERE id = 22;

UPDATE demandes SET docs =
    'specs/evolutions/demande-58-fiche-demande-documents-et-commentaires.md'
 WHERE id = 58;

-- ------------------------------------------------------------
-- 5. CONTRÔLE POST-MIGRATION
-- ------------------------------------------------------------
-- Attendu : colonne_docs = 1, table_commentaires = 1, policies = 4,
-- contrainte = 1, demandes_avec_docs = 3.
SELECT
    (SELECT count(*) FROM information_schema.columns
      WHERE table_name = 'demandes' AND column_name = 'docs')          AS colonne_docs,
    (SELECT count(*) FROM information_schema.tables
      WHERE table_name = 'demande_commentaires')                       AS table_commentaires,
    (SELECT count(*) FROM pg_policies
      WHERE tablename = 'demande_commentaires')                        AS policies,
    (SELECT count(*) FROM pg_constraint
      WHERE conname = 'demandes_docs_chemins_valides')                 AS contrainte,
    (SELECT count(*) FROM demandes
      WHERE docs IS NOT NULL AND btrim(docs) <> '')                    AS demandes_avec_docs;
```

## Réalisation

Développée le **2026-09-10**, commit `eb4d8fa`.

| Fichier | Ce qui a changé |
|---|---|
| `demande.html` | **Nouveau** — la fiche pleine page, `data-require-admin`. |
| `demande.js` | **Nouveau** — chargement, édition, documents, convertisseur markdown, fil de commentaires. |
| `admin-demandes.html` | La popup se réduit à la création : bouton Supprimer, ligne de méta et modale de suppression retirés. |
| `admin-demandes.js` | Le clic sur une ligne ouvre la fiche ; `ouvrirNouvelleDemande()` / `creerDemande()` remplacent l'ancien couple ajout-édition ; suppression retirée (elle est sur la fiche). |
| `style.css` | Section « Fiche demande » — uniquement des jetons de #54, donc le mode sombre suit sans règle à part. |
| `sw.js` | `CACHE_NAME` v298 → v299, plus les deux nouveaux fichiers. `menu.html` non touché, donc pas de cache-buster à bumper dans `global.js`. |
| `scripts/migration-demande-58-docs-et-commentaires.sql` | **À jouer par Cyril** (gitignoré comme toutes les migrations). |

### Ce qui a été vérifié, et comment

Un banc d'essai sous **node** (hors navigateur, DOM minimal simulé) a fait tourner le
convertisseur sur les **4 specs réelles** du dépôt, puis sur des cas hostiles :

- balises `ul`/`ol`/`table` équilibrées sur les 4 documents, tableaux rendus (jusqu'à 38 lignes),
  aucun `|` orphelin, aucun saut de ligne parasite dans une balise ;
- un `<script>` écrit dans un `.md` **s'affiche comme du texte** ; `onerror=` ne survit pas ;
  `javascript:` dans un lien est **neutralisé** ; `https:` et les chemins relatifs sont conservés ;
- les nombres du texte ne deviennent pas du code, et les `snake_case` ne deviennent pas de
  l'italique ;
- les chemins `specs/../global.js`, `global.js`, `x.js`, une URL absolue et les antislashs sont
  **refusés**.

Contrôle de cohérence complémentaire : tous les `getElementById` de `demande.js` existent dans
`demande.html` (21), toutes les fonctions appelées depuis le HTML et depuis les gestionnaires
construits en chaîne sont définies, et les 16 classes `fiche-*` ont une règle CSS.

**Non vérifié à ce stade : le rendu réel dans un navigateur**, en clair et en sombre, et sur
téléphone. C'est le sens de l'état « À tester » — et la leçon de #53, où c'est un vrai téléphone
qui avait rattrapé ce que le calcul disait bon.

---

*Spec du 2026-09-09, développée le 2026-09-10 après le feu vert de Cyril.*
