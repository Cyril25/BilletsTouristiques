# Demande #14 — Archiver les collectes réparties

- **Épic :** Corrections et évolutions
- **Demande :** #14 · basse / M · collecteurs · Mes collectes
- **Statut :** À tester (correctif du 2026-07-22) · **Commits :** `5572556` + correctif

## Contexte

> Une fois la collecte répartie, la faire disparaître ou la classer dans une autre
> catégorie pour ne garder que les collectes en attente de réception.
> Clarifications de Cyril : (1) déclencheur = tous les billets placés en enveloppe ;
> (2) l'archiver ; (3) « mettre la collecte côté collecteur dans une catégorie
> "billet reçu / réparti" et, lorsque tous les envois vers les membres seront faits,
> une catégorie "collecte terminée / billets envoyés" ».

## Décisions

- Deux paliers calculés, sur les inscrits **hors bénéficiaire** d'une collecte ayant ≥ 1 inscrit :
  - **Répartie** = tous placés en enveloppe (`statut_livraison` = `pret_a_envoyer` ou `expedie`) ;
  - **Envoyée** = tous `expedie` (implique « répartie »).
- Calcul dans `mesInscriptionsParBillet` (compteurs `repartis`/`expedies`, flags
  `tousRepartis`/`tousExpedies`), via `statut_livraison` ajouté à la requête d'inscriptions.
- Affichage : ces collectes sortent de la liste (actives **et** fermées) vers deux
  **sections repliables** en bas de page, repliées par défaut : « Billets reçus et répartis
  — envois à faire (N) » puis « Collectes terminées — billets envoyés (N) ».
- Pas de nouvel état stocké : l'archivage est **calculé**, donc réversible automatiquement
  si on retire un billet de l'enveloppe.

## Correctif du 2026-07-22 (retour testeurs : « ça ne fait rien »)

Deux écarts corrigés :

1. **La cause du « ça ne fait rien »** : la v1 n'appliquait le critère qu'aux collectes
   ouvertes (`Collecte`/`Pré collecte`), or la répartition se fait en pratique *après* le
   passage en « Terminé ». En prod, 77 des 78 collectes réparties étaient en « Terminé »
   et restaient donc affichées comme avant — seul Marc LAGRANGE voyait un changement.
   Le critère s'applique désormais à toutes les catégories.
2. **Le second palier manquait** : la v1 fusionnait « en enveloppe » et « expédié » en une
   seule section, alors que la demande distinguait bien deux catégories.

Contrôle sur les données de prod après correctif (56 réparties + 22 envoyées) :

| Collecteur | Actives | Fermées | Réparties | Envoyées |
|---|---|---|---|---|
| Cyril | 1 | 97 | 3 | 22 |
| Jean-Philippe | 5 | 1588 | 25 | 0 |
| Antoine | 0 | 383 | 20 | 0 |
| Caro CHATAIN | 0 | 48 | 3 | 0 |
| Damien PAVE | 0 | 582 | 2 | 0 |
| Eric Detiche | 0 | 69 | 2 | 0 |
| Marc LAGRANGE | 0 | 10 | 1 | 0 |

Limite connue : les collectes supplémentaires (table `collectes`) ne sont pas concernées
(aucune inscription avec `collecte_id` en prod à ce jour).

## Réalisation

- `mes-collectes.js` (`loadMesCollectes` : `statut_livraison` + `tousRepartis` ;
  `renderMesCollectes` : split actives/réparties + section repliable ; `toggleReparties`),
  `style.css` (`.btn-toggle-reparties`), `sw.js` (`billets-v250`). Commit `5572556`.
- Correctif : `mes-collectes.js` (critère étendu à toutes les catégories, second palier
  `tousExpedies`, sections en fin de page via `sectionArchive`), `sw.js` (`billets-v255`).
