# Demande #40 — Badge de statut par collecte + statut billet dérivé partout

- **Table `demandes`** : #40 (priorité haute, complexité M).
- **Statut** : À tester

## Contexte

« Sur chacune des collectes on devrait avoir le badge qui permet de modifier le statut
de la collecte, et le statut du billet devrait être calculé (chaque collecte a un
statut ; le statut du billet dépend de l'état de ses collectes — pré-collecte / collecte
/ terminé — ou du statut manuel saisi). Et cela partout où les statuts apparaissent
(admin.html, billets.html). »

## Analyse / décisions

- **Statut du billet déjà dérivé** côté base (triggers de la migration #16 :
  `Categorie` et `date_effective` dérivés des collectes). Sur admin.html (carte) le
  badge est dérivé et le chip de statut agit déjà sur la collecte ; sur billets.html le
  statut affiché est `Categorie` (dérivé). → « calculé partout » : déjà en place.
- **Nouveau** : sur la page d'édition du billet, chaque collecte porte un **badge de
  statut cliquable** qui ouvre la **modale d'édition** de la collecte (#41), où l'on
  change le statut (et le reste). Le statut du billet reste en lecture seule (dérivé).

## Critères d'acceptation

- Chaque collecte de la liste (page billet) affiche son statut sous forme de badge
  cliquable ; le clic ouvre la modale d'édition de cette collecte.
- Changer le statut d'une collecte met à jour le statut du billet (dérivation) et se
  reflète sur admin.html et billets.html.

## Réalisation

**Page d'édition** (`0e6e5f4`) :
- `admin.js` : `renderCollectesList` — badge `.collecte-badge-status--clickable`
  (bouton) par collecte ; délégation clic → `editerCollecte` (ouvre la modale #41).
- `style.css` : style du badge cliquable.

**Carte admin.html — Option A** (`d584acb`, décision Cyril 2026-07-24) :
- Chaque collecte de la carte porte son **tag de statut cliquable** (Pré collecte /
  Collecte / Terminé) qui change SON statut (popup de pastilles + PATCH + re-render).
- Le tag du billet (haut à droite) devient le **statut dérivé, lecture seule**
  (`.admin-badge-status--derive`) quand le billet a des collectes ; il reste le
  changeur manuel uniquement pour un billet **sans** collecte.
- Passage en « Collecte » sans prix/collecteur → renvoi vers la page d'édition (la
  modale les saisit).
- `buildCollecteStatusChipsHtml`, `handleCollecteTagClick`, `handleCollecteStatusChange`.
- Remplace les anciens badges d'inscriptions par collecte → clôt aussi définitivement
  #36 (plus de collecte de base en double).

- **Commits** : `0e6e5f4` (page), `d584acb` (carte / Option A)
