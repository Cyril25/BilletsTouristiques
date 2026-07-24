# Demande #41 — Statut à la création + édition des collectes en modale

- **Table `demandes`** : #41 (priorité haute, complexité M) — écran Admin-billet.
- **Statut** : À tester

## Contexte

Deux points sur la page d'édition/création d'un billet (page dédiée #35) :

1. **Statut à la création** : le sélecteur ne propose que 3 statuts manuels (Pas de
   collecte / Jamais édité, projet / Masqué). Or, à la création, une pré-collecte est
   créée automatiquement → le statut est en fait dérivé. Le choix manuel déroute.
2. **Édition des collectes** : le sous-formulaire inline (#38) rallonge la page. Cyril
   veut un bouton « Ajouter » + « Modifier » par collecte ouvrant une **popup**.

## Décisions (Cyril, 2026-07-24)

- **Statut création** : sélecteur avec une option **« Hérité des collectes »** par
  défaut (+ les 3 statuts manuels). « Hérité » ⇒ pré-collecte auto (statut dérivé) ;
  statut manuel ⇒ billet sans pré-collecte.
- **Édition collecte** : passage en **modale** (remplace l'inline de #38).

## Réalisation

- `admin-billet.html` : option `« Hérité des collectes »` (valeur sentinelle
  `__herite__`) ; bouton « Ajouter une collecte » ; le formulaire de collecte passe
  dans une modale (`#collecte-modal-overlay` + dialogue + en-tête/croix + actions).
- `admin.js` :
  - `CATEGORIE_HERITE` ; défauts création/duplication = « Hérité ».
  - `saveBillet` : `sansCollecte` = un statut MANUEL a été choisi (sinon pré-collecte
    auto). Corrige au passage « Pas de collecte » qui déclenchait une pré-collecte.
  - `refreshStatutBilletUI` + handler `change` : message d'aide hérité / manuel.
  - `ouvrirAjoutCollecte` / `ouvrirCollecteModalUI` / `fermerCollecteModal` ; boutons
    ouvrir/fermer, clic sur le fond, Échap, Entrée (valide sans soumettre le billet).
  - `editerCollecte` / `saveCollecte` / `modifierCollecte` ouvrent/ferment la modale.
- `style.css` : `.collecte-modal-*`.
- **Lien #38** : l'édition d'une collecte (créée en #38 en inline) est **conservée**,
  mais présentée en modale. **Lien #40** : le badge de statut ouvre cette même modale.
- **Commit** : `0e6e5f4`
