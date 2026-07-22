# Demande #14 — Archiver les collectes réparties

- **Épic :** Corrections et évolutions
- **Demande :** #14 · basse / M · collecteurs · Mes collectes
- **Statut :** À tester (correctif du 2026-07-22) · **Commits :** `5572556` + correctif

## Contexte

> Une fois la collecte répartie, la faire disparaître ou la classer dans une autre
> catégorie pour ne garder que les collectes en attente de réception.
> Clarifications de Cyril : (1) déclencheur = tous les billets placés en enveloppe ;
> (2) l'archiver.

## Décisions

- **Répartie** = la collecte a ≥ 1 inscrit et **tous** ses inscrits (hors bénéficiaire)
  sont placés en enveloppe (`statut_livraison` = `pret_a_envoyer` ou `expedie`).
- Calcul ajouté à `mesInscriptionsParBillet` (compteur `repartis` + flag `tousRepartis`),
  via l'ajout de `statut_livraison` à la requête d'inscriptions.
- Affichage : les collectes réparties sont sorties de la liste (principale **et** fermées)
  et placées dans une **section repliable** « Collectes réparties (N) » en bas de page,
  repliée par défaut.
- Pas de nouvel état stocké : l'archivage est **calculé** (dès que tout est en enveloppe),
  donc réversible automatiquement si on retire un billet de l'enveloppe.

## Correctif du 2026-07-22 (retour testeurs : « ça ne fait rien »)

La v1 n'appliquait le critère qu'aux collectes ouvertes (`Collecte`/`Pré collecte`), or la
répartition se fait en pratique après le passage en « Terminé » : en prod, 77 collectes
réparties sur 78 étaient en « Terminé » et restaient affichées comme avant. Le critère
s'applique désormais à **toutes** les catégories ; la section repliable est déplacée en
fin de page (après les fermées) et renommée « Collectes réparties (N) » — l'ancien libellé
« en attente de réception » décrivait en réalité les collectes restées dans la liste.
Limite connue : les collectes supplémentaires (table `collectes`) ne sont pas concernées
(aucune inscription avec `collecte_id` en prod à ce jour).

## Réalisation

- `mes-collectes.js` (`loadMesCollectes` : `statut_livraison` + `tousRepartis` ;
  `renderMesCollectes` : split actives/réparties + section repliable ; `toggleReparties`),
  `style.css` (`.btn-toggle-reparties`), `sw.js` (`billets-v250`). Commit `5572556`.
- Correctif : `mes-collectes.js` (critère étendu aux « Terminé », section en fin de page),
  `sw.js` (`billets-v254`).
