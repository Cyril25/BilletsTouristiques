# Demande #43 (prod) — Export Excel de la liste de billets affichée

- **Épic :** Corrections et évolutions
- **Demande :** #43 de la table `demandes` **de production** — Vanessa, 2026-08-22, basse / S.
- **Concerne :** membres
- **Écran :** Les billets
- **Statut :** À tester
- **Commit :** `e27c519`

## Contexte (demande)

> Pouvoir exporter dans un fichier Excel les billets qui ont été publiés après une certaine date
> que l'on doit spécifier. Par exemple si je mentionne le 03/08/2026, je veux avoir dans le fichier
> Excel tous les billets qui ont été publiés à partir de cette date.

## Analyse / décisions

- **Le filtre de période existe déjà** sur la page (« Période (Date) », `date-start` / `date-end`,
  sur `date_effective`). Plutôt qu'une seconde saisie de date dans une boîte d'export — qui pourrait
  contredire ce que l'écran affiche — on exporte **ce qui est affiché**. Poser la date de début et
  cliquer « Exporter » répond exactement au besoin, et l'export sert aussi aux autres filtres
  (pays, millésime, thème, collecteur, statut, recherche).
- **Colonnes** : identité du billet (référence, millésime, version, nom, ville, code postal, dep,
  pays, thème) puis les informations de la collecte affichée (statut, date, collecteur, prix, prix
  variante) — mêmes sources que la carte, donc cohérent avec l'écran depuis #16.
- **SheetJS**, comme l'export de Ma collection, même version épinglée. Il a fallu ajouter
  `https://cdn.sheetjs.com` au `script-src` de la CSP de `billets.html` (déjà autorisé sur
  `ma-collection.html`) — sans ça le script est bloqué silencieusement.
- **Nom du fichier** : `billets-du-<début>-au-<fin>.xlsx`, pour que le fichier rappelle la période
  demandée.
- Les billets « Masqué » restent exclus : l'export part de la liste filtrée, qui les écarte déjà.

## Critères d'acceptation

1. Un bouton « Exporter » est disponible dans la barre d'outils de la page Les billets.
2. Le fichier contient exactement les billets affichés, filtres compris.
3. Poser une date de début et exporter donne les billets publiés à partir de cette date.
4. Le nom du fichier reprend la période choisie.
5. Sans aucun billet affiché, un message le dit et aucun fichier n'est produit.

## Réalisation

- **Fichiers :** `billets.html` (CSP + SheetJS + bouton), `app-new.js` (`exporterBilletsXlsx()`).
- **Migration :** aucune.
- **Commit :** `e27c519`
