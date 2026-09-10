# Demande #58 — Fiche demande pleine page : documents de spec lisibles et commentables par les admins

- **Épic :** corrections et évolutions (complexité **M**)
- **Demande :** #58 de la table `demandes` de production — Cyril, 2026-09-09, priorité *normale*.
  Numéro **confirmé par Cyril le 2026-09-10**, à la création de la demande depuis l'écran.
- **Concerne :** les admins (6 personnes), et eux seuls — `admin-demandes.html` porte
  `data-require-admin`, et **aucun écran membre n'écrit dans `demandes`** (vérifié : la table
  n'est alimentée que par `admin-demandes.js`).
- **Statut :** **développée le 2026-09-10, à tester.** ⚠ La migration
  `scripts/migration-demande-58-docs-et-commentaires.sql` **reste à jouer** : sans elle la fiche
  s'affiche et s'édite, mais les documents ne peuvent pas être attachés et le fil de commentaires
  annonce son indisponibilité en nommant le script.

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
