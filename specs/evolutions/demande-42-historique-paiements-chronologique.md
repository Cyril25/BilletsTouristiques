# Demande #42 (prod) — Historique des paiements par date, et non plus par membre

- **Épic :** Corrections et évolutions
- **Demande :** #42 (prod) — Jean-Philippe, 2026-08-05, priorité **haute**, complexité M.
- **Concerne :** collecteurs
- **Écran :** Mes collectes → Historique des paiements validés
- **Statut :** À tester
- **Absorbe #47** (même écran, déposée le 07/09), close comme doublon.
- **Commit :** _(voir Réalisation)_

## Contexte (demande)

> dans mes paiements, pour l'historique, ça ne va pas ce que tu as fait, il faut mettre date par
> date avec l'heure / minute, le paiement validé, une ligne et un ou des paiements validés en
> groupé, par membre, comme cela on sait que telle date on a validé le paiement du membre et si on
> s'est trompé on peut l'annuler.

Et #47, deux jours plus tard, qui précise le format : « ne pas grouper l'historique par membre,
mais par date, ex. 12-09-2026 nom du membre - billet payé, prix payé ».

## Réponses de Jean-Philippe au cadrage

1. Une ligne = **un membre + un horodatage**, listant ce qui a été validé à ce moment-là — *oui*.
2. « Annuler » sur une ligne groupée : **billet par billet**, pas le groupe entier.
3. Les frais de port : **dans la même liste chronologique** — « c'est un paiement, que ce soit un
   billet ou un frais de port ».

## Analyse / décisions

- **Un règlement est un règlement.** La réponse 3 donne la règle générale : on ramène les trois
  natures — billets, frais de port, et **écarts de prix (#44)** — à une forme commune, puis on les
  classe dans le temps. Sans ça, une ligne d'écart validée disparaîtrait de l'écran sans laisser
  de trace : c'est le seul vrai point de contact entre #42 et #44, et il est traité ici.
- **Regroupement à la minute**, pas à la milliseconde. Une validation groupée pose le même
  horodatage sur toutes ses lignes, mais deux validations faites à la suite à la main relèvent du
  même geste pour qui relit son historique.
- **« Annuler » sur chaque élément**, conformément à la réponse 2 : se tromper sur un billet ne
  doit pas obliger à défaire les cinq autres.
- **L'horodatage monte dans l'en-tête du groupe.** #35 l'avait posé sur chaque ligne ; répété
  cinq fois sous le même titre, il n'apporte rien. Le besoin de #35 — retrouver la transaction sur
  PayPal — reste servi, avec l'heure et la minute. `labelDateValidation()` devient du code mort et
  disparaît.
- **Les validations sans date sont dites, pas cachées.** 79 % des inscriptions confirmées n'ont
  aucune `date_validation` : elles sont antérieures à #11, l'information n'a jamais été
  enregistrée. Elles vont dans une section repliée en bas, « Validés avant juillet 2026, date non
  enregistrée », toujours groupée par membre. Inventer une date aurait été pire que l'absence.
- **Aucune migration** : tout existe déjà en base.

## Critères d'acceptation

1. L'historique se lit du plus récent au plus ancien, un bloc par (membre, horodatage à la minute).
2. L'en-tête d'un bloc donne la date, l'heure:minute, le membre, le nombre de lignes et le total.
3. Chaque ligne porte son propre « Annuler », qui ne touche qu'elle.
4. Les frais de port et les écarts de prix figurent dans la même frise que les billets.
5. Les validations sans date sont regroupées à part, dans une section repliée, avec leur compte.
6. L'écran fonctionne à l'identique si la table `dettes` n'existe pas encore.

## Réalisation

- **Fichiers :** `mes-collectes.js` — `clefMinuteValidation()`, `libelleHorodatage()`,
  `renderPaiementsConfirmes()` réécrite, `annulerDetteConfirmee()`, chargement des écarts soldés
  dans `loadPaiementsConfirmes()` ; `style.css`.
- **Migration :** aucune.
- **Commit :** _(à compléter)_
