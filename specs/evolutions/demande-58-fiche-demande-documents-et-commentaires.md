# Demande #58 — Fiche demande pleine page : documents de spec lisibles et commentables par les admins

- **Épic :** corrections et évolutions (complexité **M**)
- **Demande :** #58 de la table `demandes` de production — Cyril, 2026-09-09, priorité *normale*.
  ⚠ **La ligne n'existe pas encore** : l'écriture en base a été refusée par le garde-fou du mode
  auto pendant la session de cadrage. Le numéro 58 est le prochain libre (max actuel = 57) et
  **doit être confirmé** au moment de créer la demande — si un autre dépôt passe avant, renommer
  ce fichier et sa ligne d'index.
- **Concerne :** admins (6 personnes), et le demandeur pour la partie création.
- **Statut :** **analyse à valider par Cyril.** Aucun développement commencé.

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

Un membre qui dépose une demande n'a pas besoin — et n'a pas le droit — de voir le journal de
traitement, les documents de spec et les échanges entre admins. La popup garde donc son rôle
d'origine : **saisie rapide** (description, écran, qui, priorité). Tout le reste déménage.

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

`marked` depuis **cdnjs**, épinglé à une version exacte avec `integrity` — même patron que Font
Awesome, et **cdnjs est déjà dans la CSP** (`script-src`). Un rendu maison serait vite un parser
complet : les specs sont pleines de tableaux, de blocs de code et de citations.

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
Ne pas notifier son propre auteur.

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

*(à compléter après dev : fichiers touchés + commit)*

---

*Spec du 2026-09-09. Aucune ligne de code écrite : en attente du feu vert de Cyril.*
