# Demande #34 (prod) — Ne pas re-trier la vérification paiement après une validation

- **Épic :** Corrections et évolutions
- **Demande :** #34 de la table `demandes` **de production** — Jean-Philippe, 2026-07-25, normale / S.
- **Concerne :** collecteurs
- **Écran :** Mes collectes → Vérification paiement
- **Statut :** À tester
- **Commit :** _(voir Réalisation)_

## Contexte (demande)

> lorsque les paiements sont déclarés comme payé par un membre, c'est bien qu'il apparaisse en
> tête, par contre si pour ce membre il y a d'autres billets non payés, ne le remets pas par
> ordre alphabétique automatiquement, laisse-le jusqu'à ce que le collecteur rafraîchisse la page

Depuis #10, les membres ayant un paiement **déclaré** remontent en tête de la vérification
paiement. Mais valider ce paiement recharge la vue : le membre n'a plus de paiement déclaré, il
retombe donc dans l'ordre alphabétique — au milieu de la liste — alors que le collecteur n'a pas
fini de traiter ses autres billets. Il doit le retrouver à la main après chaque validation.

## Analyse / décisions

- **On gèle l'ordre d'affichage**, on ne touche pas au tri lui-même : le tri #10 reste la règle
  de départ, il n'est simplement plus réappliqué à chaque rechargement de la vue.
- **Mémoire = la liste des emails dans l'ordre affiché** (`ordreVerifPaiement`). Au rendu suivant,
  chaque membre déjà connu reprend son rang ; les arrivants se rangent à la fin, dans l'ordre
  naturel calculé juste avant (le tri JS est stable, les rangs égaux ne bougent pas). La liste est
  ensuite mise à jour, pour que les arrivants gardent à leur tour leur place.
- **Quand l'ordre se recalcule** : au chargement de la page, et en revenant sur l'onglet
  « Vérification paiement » — deux gestes qui correspondent au « rafraîchir » de la demande.
- **Un bouton « Réordonner »** apparaît, mais **seulement quand l'ordre affiché a réellement
  divergé** du tri naturel. Sans lui, le collecteur n'aurait aucun moyen de reclasser la liste
  sans quitter l'onglet ; toujours l'afficher aurait ajouté un bouton inutile la plupart du temps.

## Critères d'acceptation

1. Valider un paiement laisse le membre à sa place dans la liste.
2. Ses lignes se mettent quand même à jour (statut, montants, total en attente).
3. Un membre qui déclare un paiement pendant la session apparaît dans la liste, à la fin.
4. Le bouton « Réordonner » n'apparaît que si l'ordre a divergé, et reclasse la liste au clic.
5. Quitter puis revenir sur l'onglet reclasse la liste (déclarés en tête, puis alphabétique).

## Réalisation

- **Fichiers :** `mes-collectes.js` — variable `ordreVerifPaiement`, remise à zéro dans
  `showTab('paiements')`, application dans `renderVerificationPaiement()`, bouton
  `reordonnerVerificationPaiement()`.
- **Migration :** aucune.
- **Commit :** _(à compléter)_
