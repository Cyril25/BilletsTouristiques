# Demande #47 — Bug : tag « Pré collecte » illisible dans l'accordéon « autres collectes »

- **Table `demandes`** : #47 (priorité normale, complexité S).
- **Statut** : À tester

## Contexte

> « Sur la partie "autre collecte", si une collecte est en "pré collecte", le tag est
> jaune et l'écriture blanche, c'est pas lisible, contrairement au tag pré collecte
> ailleurs qui utilise la couleur d'écriture #9e9e9e. »

Écran concerné : `billets.html`, accordéon « Autres collectes de ce billet » (#44).

## Analyse / décision

Les pastilles de statut de la carte (badge billet et en-tête « Collecte ») posent une
couleur de texte **en ligne** : gris clair sur le jaune « Pré collecte », blanc ailleurs.
La pastille de l'accordéon, elle, n'en posait aucune → c'est le CSS
`.collecte-accordeon-statut { color: #fff }` qui s'appliquait, d'où du blanc sur jaune.

**Décision** : la couleur du texte d'une pastille devient une **fonction unique de
`global.js`** (`couleurTexteStatut`), à côté de `getCategorieColor` (même logique de
centralisation que #44), utilisée par les trois pastilles du catalogue. La règle CSS
`color: #fff` reste comme repli pour les usages qui ne passent pas de couleur.

## Critères d'acceptation

- Dans l'accordéon « Autres collectes de ce billet », une collecte en « Pré collecte »
  affiche son tag jaune avec le même gris que la pastille de la carte.
- Les autres statuts (Collecte, Terminé…) gardent le texte blanc.

## Réalisation

- `global.js` : `couleurTexteStatut(categorie)` (section 1c, couleurs de statut).
- `app-new.js` : la carte utilise ce helper au lieu du ternaire local ; la pastille de
  l'accordéon pose désormais une couleur de texte.
- `sw.js` v277 / `global.js` menu v185.
- **Commit** : `2377ee1`

## Suite — unification des 3 surfaces (décision Cyril)

Trois valeurs coexistaient pour ce même cas : `#fff` (accordéon du catalogue, le bug),
`#9e9e9e` (pastilles de la carte) et `#6b6b00` (fiche `billet.html`). Cyril a tranché
pour l'**olive `#6b6b00`**, la plus lisible sur le jaune.

- `global.js` : `couleurTexteStatut` renvoie désormais `#6b6b00` pour « Pré collecte ».
- `billet.js` : `texteSurStatut` délègue au helper (plus de valeur locale) — les 3
  surfaces (carte, zone collecte, accordéons catalogue **et** fiche) sont alignées.
- `sw.js` v278 / `global.js` menu v186.
- **Commit** : `<à compléter>`

Hors périmètre : les pastilles d'`admin.html` gardent leur propre règle
(`getTextColorForBg`, noir/blanc selon la luminance → noir sur le jaune), cohérente et
déjà lisible.
