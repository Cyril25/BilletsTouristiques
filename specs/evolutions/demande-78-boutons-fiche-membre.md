# Demande #78 — Les boutons dépassent des fiches de Gestion des membres

- **Complexité :** S — Prêt à dev au tri du 2026-09-24.
- **Demande :** #78, déposée par Cyril le 2026-09-24, priorité haute.
- **Concerne :** admins — écran Gestion des membres (`users.html`, `users.js`, `style.css`).
- Version en clair : `demande-78-boutons-fiche-membre-en-clair.md`.

## Contexte (demande)

> Dans la gestion des membres, les boutons dépasse de chaque fiche de membre, tu peux regarder et
> améliorer l'affichage stp ?

## Constat

`renderUserCards()` (`users.js`) pose jusqu'à **six** boutons dans `.user-card-actions` : Modifier
la fiche, Bloquer/Débloquer, Promouvoir/Rétrograder, Changer l'adresse, Désactiver/Réactiver,
Supprimer. Les deux avant-derniers sont arrivés avec l'étape 5 de #62.

`.user-card-actions` est un `display: flex` **sans `flex-wrap`**. La carte a la largeur de sa
colonne de grille (`minmax(300px, 1fr)`, minimum fixe : l'élément de grille ne s'élargit pas pour
son contenu), soit environ 270 à 350 px de contenu. Les boutons rétrécissent jusqu'à leur mot le
plus long, puis la rangée **déborde** : « Désactiver » et « Supprimer » sortent de la carte et
passent sous la fiche voisine. Reproduit à 1400, 1024 et 820 px de large. Sous 768 px, la media
query existante empile déjà les boutons (`flex-direction: column`, largeur 100 %) : pas de
débordement, mais six boutons de 44 px les uns sous les autres par fiche.

Au passage, les libellés cassés sur deux lignes posaient l'icône **au-dessus** du texte, pas à côté.

**Constaté en vérifiant, dans le même périmètre** : en thème sombre, `.user-email-change-btn`
(« Changer l'adresse », #62) utilise `--color-primary` (#5D3A7E), que la palette sombre ne
redéfinit pas : **1,94:1** de contraste sur la carte (#1E1926), bouton quasi invisible.
`.user-edit-toggle-btn` (« Modifier la fiche ») est à **3,11:1** (`--color-secondary`), et à
**1,72:1** au survol (`--color-primary` sur `--color-surface`).

`.user-card-actions` sert aussi à l'écran Collecteurs (`collecteurs.js`, un seul bouton
« Modifier ») ; `.user-edit-toggle-btn` aussi.

## Décisions

### D1 — Deux colonnes fixes, limitées à Gestion des membres

`#user-cards-grid .user-card-actions` passe en `display: grid` avec
`grid-template-columns: repeat(2, minmax(0, 1fr))`, à toutes les largeurs.

Écarté : une grille `repeat(auto-fill, minmax(8.5rem, 1fr))`, essayée d'abord. Elle donnait
**cinq** colonnes entre 700 et 768 px (cartes pleine largeur : cinq boutons puis un orphelin) et
**une seule** sur la fiche désactivée à 1024 px, que sa bordure pointillée de 3 px rétrécit juste
sous le seuil. Deux colonnes fixes donnent 3 rangées pour 6 boutons, 2 pour 4, et un bouton seul
à gauche pour 5 : prévisible partout. À 320 px, les colonnes font 120 px et les libellés passent
sur deux lignes, ce qui reste lisible et cliquable (44 px de haut).

`flex-direction: column` de la media query mobile n'a plus d'effet sur une grille ; la largeur
100 % des boutons y reste inoffensive. Pas de nouveau point de rupture.

Le sélecteur par l'identifiant de la grille laisse l'écran Collecteurs tel quel.

### D2 — Boutons calés en bas de la carte

`margin-top: auto` sur la grille de boutons (la carte est déjà une colonne flex) : dans une rangée
de fiches de hauteurs différentes, les blocs de boutons s'alignent.

### D3 — Icône à gauche du libellé

Les boutons de la grille passent en `inline-flex`, centrés, `gap: 6px`. L'espace qui suit
`<i>` dans le HTML devient le début d'un élément flex anonyme et disparaît : l'écart vient du `gap`.

### D4 — Contraste en thème sombre

En sombre, « Modifier la fiche » (texte, y compris au survol) et « Changer l'adresse » (texte et
bordure) prennent `--color-violet-bright` (#A98CE0), comme les liens violets de l'écran Qualité
des billets : **6,15:1** sur la carte, **5,46:1** au survol de « Modifier ». Le survol de
« Changer l'adresse » garde son fond `--color-primary` et repasse en `--color-text-inverse`
(8,85:1). Écrit deux fois selon le motif de #54 : `[data-theme="dark"]` et
`@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) … }`. La règle porte sur
la classe : le bouton « Modifier » de Collecteurs en profite aussi.

## Critères d'acceptation

1. Gestion des membres, ordinateur : aucun bouton ne sort de sa fiche, quel que soit le rôle ou
   l'état du membre (6, 5 ou 4 boutons).
2. Les boutons sont sur deux colonnes de même largeur ; l'icône est à gauche du libellé.
3. Dans une même rangée de fiches, les blocs de boutons sont alignés en bas.
4. Tablette (vers 760 px) et téléphone (390, 360, 320 px) : deux colonnes, rien ne déborde.
5. Thème sombre : « Changer l'adresse » et « Modifier la fiche » sont lisibles, survol compris.
6. Écran Collecteurs : bouton « Modifier » inchangé en clair.

## Ce que cette spec ne fait pas

- L'ordre ou les libellés des boutons.
- Deux défauts vus sur la même carte, laissés tels quels faute d'avoir été demandés : la fiche
  désactivée a une bordure pointillée **épaisse de couleur texte** (`border-style: dashed` sans
  largeur ni couleur, donc `medium currentColor`) ; `.user-card-bloque` pose une `border-color` sur
  une carte **sans bordure**, donc sans effet.
- Sur téléphone, les pastilles de l'en-tête (Bloqué, Membre) prennent 44 px de haut et passent à
  la ligne à 320 px — règle mobile existante.

## Réalisation

Développée le 2026-09-24 — commit `72d33be` (spec comprise).

| Fichier | Ce qui change |
|---|---|
| `style.css` | `#user-cards-grid .user-card-actions` en grille de deux colonnes calée en bas (D1, D2) ; boutons en `inline-flex` (D3) ; surcharges sombres de `.user-edit-toggle-btn` et `.user-email-change-btn` (D4) |
| `sw.js` | `CACHE_NAME` : `billets-v318` → `billets-v319` |

**Vérifié** dans Chrome sans affichage, avec le vrai `style.css` et des fiches reprenant le HTML
de `renderUserCards()` (membre, admin, bloqué, soi-même, superadmin, désactivé) : avant, le
débordement reproduit à 1400, 1024 et 820 px ; après, rien ne déborde à 1400, 1024, 820, 760, 390,
360 et 320 px (largeurs mobiles par iframe : Chrome sans affichage impose une fenêtre minimale),
en clair et en sombre. Survol vérifié par une copie du CSS où `:hover` devient une classe.
Contrastes calculés (formule WCAG).

**Pas encore vérifié** : la vraie page avec les vraies fiches, et un vrai téléphone. `menu.html`
non touché : pas de bump du `?v=` de `global.js`.
