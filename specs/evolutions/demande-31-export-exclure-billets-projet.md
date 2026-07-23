# Demande #31 — Export xlsx : exclure les billets « Jamais édité, projet »

- **Épic :** Corrections et évolutions
- **Demande :** #31 (table `demandes`)
- **Priorité / Complexité :** normale / S
- **Concerne :** membres, collecteurs, admins
- **Écran :** Ma collection (`ma-collection.html`)
- **Statut :** À tester
- **Commit :** _(voir Réalisation)_

## Contexte (demande)

> Lors de l'exportation de ma collection en fichier xlsx, ne pas inclure les billets
> qui ont le statut « Jamais édité, projet ».

L'export xlsx de « Ma collection » (`collExport()`) liste **tout le périmètre** du membre,
une ligne par billet, avec une colonne *Possédé oui/non*. Y figurent aussi les billets encore
au statut catalogue **« Jamais édité, projet »** : ce sont des billets qui n'ont pas encore été
émis (projet), qu'un membre ne peut donc pas posséder. Ils gonflent l'export inutilement.

## Analyse / décisions

- **Statut catalogue, pas donnée de collection.** « Jamais édité, projet » est une **valeur unique**
  de la liste des statuts billet (`CATEGORIES` dans `admin.js`), portée par le champ `Categorie`
  du billet — et non une notion liée à la possession du membre (c'était l'ambiguïté du 1er triage,
  levée par la reformulation de la demande).
- **`Categorie` n'était pas chargé côté membre.** Le `select` des billets dans `ma-collection.js`
  ne demandait pas `Categorie`. On l'ajoute au `select` pour pouvoir filtrer. La RLS de Supabase
  est *row-level* : un membre qui lit déjà les lignes `billets` peut lire toutes leurs colonnes,
  donc aucun changement de policy nécessaire.
- **Périmètre = l'export uniquement.** La demande ne porte que sur le fichier xlsx. La vue à
  l'écran (et le compteur héros) restent inchangés : on n'y touche pas.
- **Filtre placé tôt dans `collExport()`**, juste après le test périmètre/exclusion, avant les
  filtres pays/année et la construction de la ligne. Le compteur du toast (`rows.length +
  ' billets exportés'`) reflète donc naturellement le nombre réduit.
- **Comparaison sur la valeur exacte** `'Jamais édité, projet'` (une seule valeur concernée). Les
  autres statuts « projet-like » n'existent pas : la liste est fermée (`CATEGORIES`).

## Critères d'acceptation

1. Un billet dont `Categorie === 'Jamais édité, projet'` **n'apparaît pas** dans le fichier xlsx exporté.
2. Les billets de tout autre statut (Pré collecte, Collecte, Terminé, Pas de collecte, Masqué, non défini)
   restent exportés comme avant, avec les mêmes colonnes et le même tri.
3. Le message « N billets exportés » indique le nombre de lignes réellement écrites (billets « projet » exclus).
4. La vue à l'écran de « Ma collection » (liste, compteurs) est **inchangée**.
5. Les filtres pays/année actifs continuent de s'appliquer en plus de cette exclusion.

## Vérification

Contrôle de syntaxe `node --check` sur `ma-collection.js` et `sw.js` : OK. Relecture du filtre
dans `collExport()` : l'exclusion s'applique bien avant la construction de la ligne et avant les
filtres pays/année, donc `rows.length` (compteur du toast) reflète le nombre réduit. **Non
vérifié :** l'export réel dans le navigateur sur un jeu contenant des billets « Jamais édité,
projet » (à faire au test manuel — critère 1).

## Réalisation

- **Fichiers :** `ma-collection.js` (`Categorie` ajouté au `select` des billets ; filtre
  `b.Categorie === 'Jamais édité, projet'` en tête de `collExport()`), `sw.js` (cache `billets-v260`).
- **Migration :** aucune (colonne `Categorie` déjà présente sur `billets`, simplement non
  sélectionnée côté membre jusqu'ici).
- **Commit :** _(complété ci-dessous)_
