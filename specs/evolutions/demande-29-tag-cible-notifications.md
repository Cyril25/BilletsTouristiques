# Demande #29 — Tag de cible sur les cartes de notifications

- **Épic :** Corrections et évolutions
- **Demande :** #29 (table `demandes`)
- **Priorité / Complexité :** haute / S
- **Concerne :** membres, collecteurs, admins
- **Écran :** Nouveautés (`notifications.html`)
- **Statut :** À tester
- **Commit :** _(voir Réalisation)_

## Contexte (demande)

> Pour l'écran des notifications, j'aimerais un tag qui montre si c'est une notif pour tous
> les membres, pour les collecteurs ou pour les admins uniquement.

Le ciblage des notifications existe depuis la demande #26 : colonne `notifications.cible`
(`'tous'` / `'collecteurs'` / `'admins'`), filtrée par la RLS **et** re-filtrée côté client par
`window.notifVisiblePour()` (utile en impersonation). La page Nouveautés sélectionne déjà
`cible` dans sa requête, mais ne l'affiche nulle part : rien ne distingue visuellement une
nouveauté « tout public » d'une nouveauté réservée aux collecteurs ou aux admins.

## Analyse / décisions

- **Badge affiché uniquement quand `cible ≠ 'tous'`** (arbitrage Cyril, 2026-07-22). Une notif
  « tous » ne porte aucun badge : c'est le cas par défaut, et un membre simple — qui ne reçoit
  que des notifs `tous` — ne verrait qu'un badge « Tous » répété sans valeur informative.
  Le badge devient donc un vrai signal : « cette nouveauté ne concerne pas tout le monde ».
- **Pas de conditionnement par rôle** : le badge dépend de la notif, pas de qui la regarde.
  Inutile d'ajouter une branche sur l'audience, puisque seuls les collecteurs et les admins
  peuvent voir une notif ciblée (garanti par la RLS + `notifVisiblePour`).
- **Libellés** : `collecteurs` → « Collecteurs », `admins` → « Admins ». Une valeur inconnue
  (ajout futur d'une cible) est affichée telle quelle plutôt qu'ignorée, pour ne pas masquer
  silencieusement une information de ciblage.
- **Icône** `fa-user-group` (collecteurs) / `fa-user-shield` (admins), cohérente avec le reste
  de l'app, pour que le badge se lise même en diagonale.
- **Style distinct du badge « Nouveau »** : ce dernier est plein violet (état de lecture), le
  badge de cible est en pastille claire bordée (métadonnée). Deux registres visuels différents
  pour deux natures d'information, et pas de confusion quand les deux coexistent.
- **Périmètre : la page Nouveautés uniquement.** La cloche du menu agrège des items hétérogènes
  (broadcasts, demandes d'inscription, paiements…) où un badge de cible ajouterait du bruit dans
  un espace déjà contraint ; la demande vise explicitement « l'écran des notifications ».
- Helper `window.notifCibleBadge(cible)` placé dans `global.js` (à côté de `notifVisiblePour`,
  qui porte déjà la connaissance des valeurs de `cible`), pour rester réutilisable si la cloche
  doit l'afficher un jour.

## Critères d'acceptation

1. Sur la page Nouveautés, une notification `cible = 'collecteurs'` affiche un badge
   « Collecteurs » ; une notification `cible = 'admins'` affiche un badge « Admins ».
2. Une notification `cible = 'tous'` (ou `cible` NULL) n'affiche **aucun** badge de cible.
3. Le badge de cible est visuellement distinct du badge « Nouveau », et les deux peuvent
   coexister sur la même carte sans casser la mise en page (y compris sur mobile).
4. Un membre simple ne voit aucun changement (il ne reçoit que des notifs `tous`).
5. Le filtrage existant par audience est inchangé : le badge n'affecte pas quelles notifs
   sont visibles.

## Réalisation

- **Fichiers :** `global.js` (helper `window.notifCibleBadge` + bump cache-buster `menu.html?v=166`),
  `notifications.js` (insertion du badge dans l'en-tête de carte), `notifications.html`
  (styles `.notif-card-cible`), `sw.js` (cache `billets-v258`).
- **Migration :** aucune (colonne `notifications.cible` déjà en place depuis #26).
- **Commit :** `9d1cc60` — feat(notifications): demande #29 - badge de cible sur les cartes de nouveautes.
