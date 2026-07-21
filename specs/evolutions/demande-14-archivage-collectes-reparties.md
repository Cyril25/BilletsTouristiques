# Demande #14 — Archiver les collectes réparties

- **Épic :** Corrections et évolutions
- **Demande :** #14 · basse / M · collecteurs · Mes collectes
- **Statut :** À tester · **Commit :** `5572556`

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
- Affichage : les collectes réparties sont sorties de la liste principale et placées dans
  une **section repliable** « Collectes réparties — en attente de réception (N) »,
  repliée par défaut. La liste principale ne montre plus que les collectes actives.
- Pas de nouvel état stocké : l'archivage est **calculé** (dès que tout est en enveloppe),
  donc réversible automatiquement si on retire un billet de l'enveloppe.

## Réalisation

- `mes-collectes.js` (`loadMesCollectes` : `statut_livraison` + `tousRepartis` ;
  `renderMesCollectes` : split actives/réparties + section repliable ; `toggleReparties`),
  `style.css` (`.btn-toggle-reparties`), `sw.js` (`billets-v250`). Commit `5572556`.
