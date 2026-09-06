# Demande #35 (prod) — Heure de validation dans l'historique des paiements

- **Épic :** Corrections et évolutions
- **Demande :** #35 de la table `demandes` **de production** — Jean-Philippe, 2026-07-25,
  priorité normale, complexité S.
- **Concerne :** collecteurs
- **Écran :** Mes collectes → Historique des paiements validés
- **Statut :** À tester
- **Commit :** `b482cc0`

## Contexte (demande)

> dans l'historique des paiements, mettre la date lorsque le collecteur a validé le paiement afin
> de savoir quand il l'a validé pour contrôler sur le PayPal et faire une recherche plus facilement

## Analyse / décisions

- **L'essentiel était déjà livré, et personne ne l'avait vu.** La demande #11 n'a pas seulement
  créé les colonnes `inscriptions.date_validation` et `enveloppes.date_validation_port` : elle a
  aussi posé l'affichage, `labelDateValidation()`, utilisé sur les deux types de lignes de
  l'historique. Le commentaire de tri du 2026-07-25 (« la colonne existe déjà → simple affichage »)
  supposait l'affichage manquant : il était en production depuis `billets-v249`. Vérifié sur le
  fichier réellement servi avant d'écrire une ligne de code.
- **Ce qui manquait vraiment : l'heure.** Le but déclaré est de retrouver la transaction sur
  PayPal. Mesuré en base : sur **40 journées de validation, 39 portent plusieurs validations** —
  la date seule ne désigne donc presque jamais un paiement unique, et le collecteur doit quand
  même fouiller. On ajoute l'heure et la minute au libellé existant.
- **Ce changement survit à #42.** #42 va réorganiser cet écran (liste chronologique, une ligne par
  validation, regroupement) mais quelle que soit la mise en page retenue, l'horodatage devra y
  figurer — #42 le demande explicitement « date par date avec l'heure / minute ». Ce n'était donc
  pas une raison de ne rien faire ici : c'est le tri de l'écran que #42 refait, pas ce libellé.
- **Limite connue, à dire plutôt qu'à masquer** : **3 200 des 4 071 inscriptions confirmées (79 %)
  n'ont aucune `date_validation`**, ayant été validées avant que la colonne existe (#11, juillet
  2026). Ces lignes n'affichent rien — l'information n'a jamais été enregistrée, elle est
  irrécupérable. Le collecteur doit le savoir, sans quoi il croira à un bug. Même contrainte pour
  #42 : un historique chronologique ne pourra couvrir que les validations postérieures à #11.

## Critères d'acceptation

1. Une ligne de l'historique des paiements validés affiche « validé le JJ/MM/AAAA à HH:MM ».
2. Cela vaut pour les paiements de billets et pour les frais de port.
3. Une validation antérieure à #11 (sans date enregistrée) n'affiche rien, sans casser la ligne.
4. Le reste de l'historique est inchangé.

## Réalisation

- **Fichiers :** `mes-collectes.js` (`labelDateValidation`).
- **Migration :** aucune (colonnes posées par #11).
- **Cache-buster :** `sw.js` v284 + `menu.html?v=192`.
- **Commit :** `b482cc0`
