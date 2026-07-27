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

## Note (non traité)

`billet.js` (fiche du billet) utilise une troisième valeur pour ce même cas :
`#6b6b00` (olive foncé) au lieu du gris. C'est **plus** lisible sur le jaune, mais
différent des deux autres surfaces. Laissé tel quel : à trancher visuellement par Cyril
plutôt qu'à uniformiser à l'aveugle.
