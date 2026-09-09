# Demande #52 (prod) — Bug mobile : le bas de la modale « Nouveau contact » est inatteignable

- **Épic :** Corrections et évolutions
- **Demande :** #52 (prod) — sebleniglo54@gmail.com, 2026-09-08, priorité normale, complexité S.
- **Concerne :** membres, collecteurs, admins
- **Écran :** Mes contacts
- **Statut :** À tester
- **Commit :** `7e1668e`

## Contexte (demande)

> Il y a un problème d'affichage sur téléphone quand ont veux rentrer un contact dans son profil,
> le bas de la page ne s'affiche pas, ont ne peux pas valider le contact.

Reproduit par lecture du code : il ne s'agit pas de la page mais de la **modale** ouverte par
« Nouveau contact » (`mes-contacts.html`), qui porte les classes partagées `.user-modal-overlay`
/ `.user-modal`.

## Analyse / décisions

### La cause : une modale partagée qui n'a jamais pu défiler

`.user-modal-overlay` est en `position: fixed`, hauteur `100%`, `display:flex` avec
`align-items:center`. `.user-modal` n'avait **ni `max-height` ni `overflow`**. Conséquence : une
modale plus haute que l'écran est centrée, donc rognée **en haut et en bas à parts égales**, et
rien ne défile — ni la modale (pas d'`overflow`), ni la page derrière (l'overlay est `fixed`).
Le bouton « Enregistrer », dernier élément, devient littéralement hors d'atteinte.

Le formulaire de contact est le seul à dépasser : il compte dix champs, et sous 600 px la grille
passe à **une seule colonne** (règle existante de `mes-contacts.html`), ce qui double sa hauteur.
Sur un téléphone de 640 px de haut, il dépasse largement. Les sept autres écrans qui utilisent
la même modale n'affichent que des dialogues de confirmation courts : personne n'avait encore
rencontré le problème. La preuve que le défaut était connu sans être traité à la racine :
`.demande-modal` (écran Gestion Demandes) s'était déjà rajouté un `max-height: 90vh; overflow-y:
auto` dans son coin.

**On corrige donc la classe partagée**, pas seulement cet écran : c'est la même ligne de CSS qui
protège les sept autres modales le jour où l'une d'elles s'allongera.

### Le défaut voisin : `box-sizing` absent

En cherchant, un second débordement est apparu, horizontal celui-là. Ni l'overlay ni la modale
ne déclaraient `box-sizing`, or les deux cumulent `width: 100%` **et** du padding : en modèle
`content-box`, l'overlay mesurait « écran + 32 px » et la modale « écran + 32 px » de large sur
téléphone. Un `max-height: 100%` posé sur une boîte au modèle faux n'aurait rien donné de fiable :
on passe donc les deux en `border-box`, ce qui règle le débordement latéral au passage.

Pour ne rien changer à l'apparence sur les sept autres écrans, `max-width` passe de **480 à
544 px** : c'est exactement la largeur que la modale occupait déjà (480 de contenu + 2 × 32 de
padding). Le correctif est donc invisible sur grand écran — c'est voulu.

### `dvh` plutôt que `vh`

Sur mobile, `100%`/`100vh` désignent la hauteur **hors rétraction des barres du navigateur** : le
bas de la modale se retrouverait sous la barre d'adresse. `100dvh` suit la hauteur réellement
visible. La déclaration `height: 100%` est **conservée juste avant** comme repli pour les
navigateurs antérieurs à fin 2022, qui ignoreront simplement la ligne suivante.

### Le clavier virtuel n'aide pas

`ouvrirContactModal()` posait le focus sur le premier champ 50 ms après l'ouverture. Sur
téléphone, cela ouvre le clavier immédiatement et ampute encore la hauteur utile, juste au
moment où l'utilisateur cherche à se repérer. Le focus automatique est donc **désactivé sous
700 px** ; sur ordinateur, où il fait gagner un clic, il reste.

Ajouté aussi : la modale repart du haut à chaque ouverture (`scrollTop = 0`). Sans ça, après
avoir défilé dans une fiche, la suivante s'ouvrirait au milieu du formulaire.

### Ce qu'on ne fait pas

- **Pas de barre d'actions collée en bas** (`position: sticky`) : « Enregistrer » redevient
  accessible par un défilement normal, comportement attendu partout ailleurs. Une barre fixe
  aurait mordu sur la hauteur déjà courte des petits écrans.
- **Pas de blocage du défilement de la page derrière** : gênant à la marge, sans rapport avec
  l'impossibilité de valider.

## Critères d'acceptation

1. Sur téléphone, « Nouveau contact » ouvre une modale dont on atteint le bas en faisant
   défiler : les boutons « Annuler » et « Enregistrer » sont accessibles et cliquables.
2. Le haut de la modale (titre « Nouveau contact ») est visible à l'ouverture, sans défiler.
3. Un contact saisi sur téléphone s'enregistre et apparaît dans la liste.
4. La modification d'un contact existant se comporte de même, y compris le bouton « Supprimer ».
5. La modale ne déborde plus latéralement : aucun défilement horizontal sur téléphone.
6. À l'ouverture sur téléphone, le clavier ne s'ouvre pas tout seul.
7. Sur ordinateur, les modales des autres écrans (Gestion Membres, Mes collectes, Mes
   inscriptions, Les billets, Collecteurs, Gestion Demandes, Notifications) gardent la même
   largeur et la même apparence qu'avant.

## Réalisation

- **Fichiers :** `style.css` (`.user-modal-overlay` et `.user-modal` : `box-sizing`, `100dvh`,
  `max-height`, `overflow-y`, `max-width` 480 → 544), `mes-contacts.js` (`ouvrirContactModal()` :
  remise à zéro du défilement, focus automatique réservé aux écrans larges), `sw.js`
  (`CACHE_NAME` v292 → v293).
- **Migration :** aucune.
- **Commit :** `7e1668e`
