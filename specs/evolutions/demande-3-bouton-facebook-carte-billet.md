# Demande #3 — Bouton Facebook sur la carte billet (admin)

- **Épic :** Corrections et évolutions
- **Demande :** #3 (table `demandes`)
- **Priorité / Complexité :** basse / S
- **Concerne :** admins
- **Écran :** Gestion Billets (cartes)
- **Statut :** À tester
- **Commit :** `7592acc`

## Contexte (demande)

> Ajouter un bouton Facebook (entre Modifier et Partager) si le lien existe, pour aller
> directement sur la publication. (Le champ `LinkFB` existe déjà sur les billets.)

## Analyse / décisions

- Bouton affiché **uniquement si** `billet.LinkFB` est une URL http(s) valide.
- Placé juste après « Modifier » dans la barre d'actions de la carte (avant Google Sheet /
  Image / Partager), conformément à « entre Modifier et Partager ».
- Simple lien `<a target="_blank">`, `event.stopPropagation()` pour ne pas déclencher le
  clic de la carte — même pattern que les boutons Sheet/Image existants.

## Critères d'acceptation

1. Un billet avec un `LinkFB` valide affiche une icône Facebook cliquable ouvrant la
   publication dans un nouvel onglet.
2. Un billet sans `LinkFB` (ou lien non http) n'affiche pas le bouton.

## Réalisation

- **Fichiers :** `admin.js` (bouton conditionnel dans la barre d'actions carte),
  `style.css` (`.admin-card-fb-btn`), `sw.js` (cache `billets-v238`).
- **Commit :** `7592acc` — feat: demandes #2, #3, #4.
