# Demande #45 — Changement de statut d'une collecte : mini-formulaire inline cohérent

- **Table `demandes`** : #45 (priorité normale, complexité M) — écran admin.
- **Statut** : À tester

## Contexte

Depuis #40, cliquer le statut d'une collecte sur la carte admin avait deux
comportements **incohérents** selon le nombre de collectes :
- **mono-collecte** : changement direct (mini-formulaire collecteur/prix si passage en
  « Collecte ») ;
- **multi-collecte** : renvoi vers la **page d'édition du billet entier**.

Demande de Cyril (« à challenger ») : que ça ouvre plutôt **la collecte elle-même** avec
le nouveau statut, en permettant de saisir **collecteur + prix**.

## Décision (Cyril, 2026-07-25)

**Option A — mini-formulaire inline cohérent.** Quand le passage exige collecteur + prix
(→ « Collecte »), un petit formulaire (collecteur + prix + FDP) s'ouvre **dans la pastille
de la collecte cliquée**, identique en mono et en multi. On saisit, on valide, ça reste
sur la carte. Plus de saut vers l'édition du billet entier. Les transitions simples
(→ Terminé, ou → Collecte avec prix/collecteur déjà présents) restent directes.

## Réalisation

- `showCollecteQuickForm(docId, billetData, cible, collecte, opts)` : généralisé pour
  s'afficher dans **n'importe quelle popup** via `opts.popupId` + `opts.key` (au lieu de
  la seule popup du billet). Le contexte stocke `popupId` et `docId`.
- `cancelQuickCollecte(key)` / `confirmQuickCollecte(key)` : clés génériques ; retrouvent
  la popup via `ctx.popupId` et le billet via `ctx.docId`. `confirmQuickCollecte` fait un
  `renderAdminCards()` au succès (rafraîchit aussi les pastilles par collecte en multi).
- `handleCollecteStatusChange` : passage en « Collecte » sans prix/collecteur → ouvre le
  mini-formulaire dans la popup **où se trouve la pastille cliquée** (`chip.closest`),
  qu'elle soit celle du billet (mono) ou d'une collecte (multi). Plus de
  `window.location.href` vers admin-billet.html.
- **Commit** : `<à compléter>`
