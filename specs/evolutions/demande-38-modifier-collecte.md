# Demande #38 — Modifier une collecte existante

- **Table `demandes`** : #38 (créée 2026-07-23, priorité basse, dans le cycle de test #16)
- **Complexité** : S
- **Statut** : À tester

## Contexte

Reformulation de la demande : « Comment modifier une collecte ? Sur la modification du
billet ça devrait être possible. »

Depuis la refonte #16, une collecte porte ses propres champs (nom, statut, scope,
collecteur, prix, prix variante, FDP, dates, plafond `nb_max`). Sur la page d'édition
du billet (page dédiée #35), la liste des collectes n'offrait que **Clôturer** et
**Supprimer** (pré-collecte). Il n'existait **aucun moyen de modifier** une collecte
déjà créée (corriger un prix, saisir une date, changer le collecteur, la passer en
Terminé, poser un plafond…). Cyril l'avait anticipé dans #35 (« une modale quand on
cliquera sur une collecte pour la modifier »).

## Analyse / décisions

- **Réutiliser le formulaire de collecte existant** (`#collecte-add-form`) en mode
  « édition » plutôt que dupliquer un second formulaire : un bouton **Modifier** par
  collecte pré-remplit le formulaire avec ses valeurs, le titre et le bouton passent
  en mode édition, et l'enregistrement fait un **PATCH** au lieu d'un POST.
- **Le scope n'est PAS modifiable après création** : il détermine quelles
  pré-inscriptions (normal / variante) ont été matérialisées à la création. Le changer
  a posteriori désynchroniserait les inscriptions. Le select `scope` est donc
  **verrouillé** en mode édition, avec un indice explicite. (Pour changer de scope :
  supprimer/recréer la collecte.)
- **Validation identique** à la création (`validateCollecteForm`) : nom + scope
  obligatoires ; à partir du statut « Collecte », prix de la version ouverte + collecteur
  obligatoires.
- **Pas de recréation d'auto-inscriptions au PATCH** : les pré-inscriptions ont déjà été
  créées à la naissance de la collecte ; l'édition ne fait que mettre à jour ses champs.
  Le statut du billet reste **dérivé** côté serveur (trigger) → simple rechargement.
- Bouton **Annuler** pour sortir du mode édition sans enregistrer.

## Critères d'acceptation

- Chaque collecte de la liste a un bouton **Modifier**.
- Cliquer dessus pré-remplit le formulaire avec toutes les valeurs de la collecte, le
  titre devient « Modifier la collecte », le bouton « Enregistrer les modifications »,
  un bouton « Annuler » apparaît, le scope est verrouillé.
- Enregistrer applique un PATCH et recharge la liste ; le statut du billet se met à jour
  s'il change (dérivation).
- Annuler (ou un enregistrement réussi) remet le formulaire en mode « Ajouter ».
- Les règles de validation prix/collecteur (statut Collecte) s'appliquent aussi à l'édition.

## Réalisation

- `admin-billet.html` : titre `#collecte-form-title` + bouton `#btn-cancel-edit-collecte`
  ajoutés au formulaire de collecte.
- `admin.js` :
  - `renderCollectesList` : bouton **Modifier** (`.btn-modifier-collecte`) par collecte.
  - délégation clic `#collectes-list` : branche vers `editerCollecte`.
  - `editerCollecte(id)` : pré-remplit le formulaire, passe en mode édition (verrou
    scope, titre/bouton, bouton Annuler), scroll.
  - `sortirEditionCollecte()` / bouton Annuler : retour au mode ajout.
  - `btn-add-collecte` : branche PATCH (`modifierCollecte`) vs POST (`saveCollecte`)
    selon le mode.
  - `modifierCollecte(collecteId, billetId)` : PATCH des champs + rechargement.
- `sw.js` / `global.js` : bump cache-busters.
- **Commit** : `2ba34c5`
