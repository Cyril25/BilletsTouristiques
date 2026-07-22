# Demande #14 — Archiver les collectes réparties

- **Épic :** Corrections et évolutions
- **Demande :** #14 · basse / M · collecteurs · Mes collectes
- **Statut :** À tester (correctifs du 2026-07-22) · **Commits :** `5572556` + `9749755` + correctif #2

## Contexte

> Une fois la collecte répartie, la faire disparaître ou la classer dans une autre
> catégorie pour ne garder que les collectes en attente de réception.
> Clarifications de Cyril : (1) déclencheur = tous les billets placés en enveloppe ;
> (2) l'archiver ; (3) « mettre la collecte côté collecteur dans une catégorie
> "billet reçu / réparti" et, lorsque tous les envois vers les membres seront faits,
> une catégorie "collecte terminée / billets envoyés" ».

## Décisions

- Deux paliers calculés, sur les inscrits **hors bénéficiaire** :
  - **Répartie** = ≥ 1 inscrit et tous placés en enveloppe (`statut_livraison` = `pret_a_envoyer` ou `expedie`) ;
  - **Envoyée** = ≥ 1 inscrit et tous `expedie` (implique « répartie »), **ou** collecte
    fermée sans aucun inscrit (anciennes collectes de l'ex-système : plus rien à envoyer).
- Calcul dans `mesInscriptionsParBillet` (compteurs `repartis`/`expedies`, flags
  `tousRepartis`/`tousExpedies`), via `statut_livraison` ajouté à la requête d'inscriptions.
- Affichage : ces collectes sortent de la liste (actives **et** fermées) vers deux
  **sections repliables** en bas de page : « Billets reçus et répartis — envois à faire (N) »,
  **dépliée par défaut** (c'est du travail restant), puis « Collectes terminées —
  billets envoyés (N) », repliée par défaut.
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

## Correctif n°2 du 2026-07-22 (retour Cyril : « les vieilles collectes apparaissent encore »)

Les collectes de l'**ancien système** n'ont aucune inscription en base : le critère
`total > 0` les excluait des deux paliers, elles restaient donc toutes dans la liste des
collectes fermées (l'essentiel du volume pour la plupart des collecteurs). Une collecte
**fermée et sans inscrit** n'a par définition plus rien à envoyer → elle bascule
directement dans « Collectes terminées — billets envoyés ». Les collectes **ouvertes**
sans inscrit restent visibles (elles attendent des inscriptions).

Contrôle sur les données de prod après correctif (extraits, 81 collecteurs au total) :

| Collecteur | Total | Actives | Fermées | Réparties | Envoyées | dont sans inscrit |
|---|---|---|---|---|---|---|
| Jean-Philippe | 1618 | 4 | 58 | 25 | 1531 | 1531 |
| Damien PAVE | 584 | 0 | 4 | 2 | 578 | 578 |
| Laura NCY | 587 | 0 | 30 | 0 | 557 | 557 |
| Antoine | 403 | 0 | 17 | 20 | 366 | 366 |
| Alain Grumelard | 267 | 1 | 12 | 0 | 254 | 254 |
| Cyril | 123 | 1 | 2 | 3 | 117 | 95 |
| Caro CHATAIN | 51 | 0 | 2 | 3 | 46 | 46 |
| Marc LAGRANGE | 11 | 0 | 1 | 1 | 9 | 9 |

La liste principale ne garde donc plus que quelques dizaines de collectes par collecteur
au lieu de plusieurs centaines.

## Réalisation

- `mes-collectes.js` (`loadMesCollectes` : `statut_livraison` + `tousRepartis` ;
  `renderMesCollectes` : split actives/réparties + section repliable ; `toggleReparties`),
  `style.css` (`.btn-toggle-reparties`), `sw.js` (`billets-v250`). Commit `5572556`.
- Correctif : `mes-collectes.js` (critère étendu à toutes les catégories, second palier
  `tousExpedies`, sections en fin de page via `sectionArchive`), `sw.js` (`billets-v255`).
  Commit `9749755`.
- Correctif n°2 : `mes-collectes.js` (`estFermee` + `estEnvoyee` couvrant les collectes
  fermées sans inscrit, exclusion des envoyées des listes actives/fermées),
  `sw.js` (`billets-v256`), `global.js` (`menu.html?v=164`). Commit `464c9b1`.
- Correctif n°3 (retours de test) : section « envois à faire » dépliée par défaut
  (paramètre `ouvert` de `sectionArchive`) ; espacement manquant entre deux blocs
  `.collectes-cards` consécutifs — le `gap` flex ne s'applique qu'à l'intérieur d'un bloc,
  donc la dernière carte des actives et la première des fermées se touchaient
  (`.collectes-cards + .collectes-cards { margin-top }`), et le bloc des actives n'est
  plus émis quand il est vide. `sw.js` (`billets-v257`), `global.js` (`menu.html?v=165`).
