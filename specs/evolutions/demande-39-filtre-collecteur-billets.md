# Demande #39 — Bug : filtre collecteur vide sur billets.html

- **Table `demandes`** : #39 (priorité haute, complexité S).
- **Statut** : À tester

## Contexte

« Il n'y a plus d'éléments dans la liste des collecteurs dans billets.html. »
Régression de la bascule collecteur (#37) : `billets.Collecteur` a été supprimé, or le
filtre « collecteur » du catalogue se construisait dessus.

## Analyse / décision

- `populateFilters` construisait la liste sur `item.Collecteur` (champ disparu) → vide.
- Le collecteur d'un billet vient désormais de sa **collecte principale**
  (`collecteurPrincipalCatalogue`). De plus, `collectePrincipaleByBillet` se charge de
  façon asynchrone (après le premier `populateFilters`), d'où la nécessité de
  reconstruire les filtres une fois les collectes chargées.

## Réalisation

- `app-new.js` :
  - `populateFilters` : le filtre `sel-coll` utilise `collecteurPrincipalCatalogue`
    (via un accès `valFn`) au lieu de `item.Collecteur`.
  - `loadCollectesByBillet` : rappelle `populateFilters` une fois
    `collectePrincipaleByBillet` prêt.
- **Commit** : `e3d1301`
