# Demande #32 (prod) — Trier par amorce dans Mes collectes et Mes inscriptions

- **Épic :** Corrections et évolutions
- **Demande :** #32 de la table `demandes` **de production** — Sébastien, 2026-07-25,
  priorité normale, complexité M.
- **Concerne :** membres, collecteurs
- **Écran :** Mes collectes + Mes inscriptions
- **Statut :** À tester
- **Commit :** `5b9c984`

## Contexte (demande)

> Dans la partie « mes collectes » et « mes inscriptions » mettre un filtre pour trier l'ordre de
> la liste des billets par amorce, c'est plus facile pour s'y retrouver quand la liste est longue.

Les deux écrans n'offrent aucun choix de tri : « Mes collectes » classe par date décroissante,
« Mes inscriptions » suit l'ordre d'inscription renvoyé par le serveur. Sur une longue liste, il
n'existe donc aucun moyen de retrouver un billet dont on connaît l'amorce. Le catalogue, lui, a
déjà ce choix (« Trier par : Date / Référence ») depuis longtemps.

## Analyse / décisions

- **On reprend le geste du catalogue**, à l'identique : deux boutons « Trier par Date / Amorce »,
  classes `btn-mode` / `btn-mode--active`, Date actif par défaut. Le membre qui connaît déjà la
  page « Les billets » n'a rien à réapprendre. Le libellé dit « Amorce » et non « Référence » :
  c'est le mot qu'emploie la demande, et celui du groupe.
- **Le tri par défaut ne change pas** : Date sur les deux écrans, exactement le comportement
  actuel. On ajoute un choix, on ne modifie pas l'existant.
- **Clé de tri = amorce, puis millésime-version, puis nom.** À amorce égale il faut un
  départage stable, sinon l'ordre de deux billets de la même amorce changerait d'un rendu à
  l'autre. Un billet sans amorce est envoyé en fin de liste (`￿`) plutôt qu'en tête : une
  donnée manquante ne doit pas occuper la première place.
- **Pas de persistance** (ni profil, ni `localStorage`) : c'est le choix déjà fait pour le tri du
  catalogue, et le tri se rechoisit en un clic. Uniformité plutôt qu'un troisième comportement.
- **Mes collectes** : le tri s'applique aux quatre sections d'un coup (en cours, terminées,
  réparties, envoyées). Le découpage en sections reste prioritaire sur le tri — sans quoi une
  collecte terminée remonterait au milieu des collectes actives.
- **Mes inscriptions** : le tri est appliqué **avant** le regroupement par collecteur. En mode
  amorce, les groupes de collecteurs suivent donc eux aussi l'ordre des amorces, ce qui est bien
  l'effet recherché quand on cherche un billet précis. Les lignes de frais de port n'ont pas
  d'amorce : elles restent en fin de groupe.
- **Ni requête ni migration** : les deux listes sont déjà entièrement en mémoire, on ne fait que
  les réordonner.

## Critères d'acceptation

1. Les deux écrans affichent « Trier par Date / Amorce », Date actif au chargement.
2. En mode Amorce, les cartes sont classées par amorce croissante, puis millésime-version,
   puis nom.
3. Revenir sur Date restitue exactement l'ordre d'avant.
4. Sur Mes collectes, le tri s'applique à toutes les sections et ne mélange pas les sections
   entre elles.
5. Sur Mes inscriptions, le tri respecte les groupes de statut, et les lignes de frais de port
   restent en fin de groupe.
6. Les filtres et la recherche existants continuent de fonctionner avec le tri choisi.

## Réalisation

- **Fichiers :** `mes-collectes.js` (`collectesSort`, `cleAmorceBillet()`, `setCollectesSort()`,
  `barreTriCollectesHtml()`, tris de `renderCollectesList()`), `mes-inscriptions.js` (`inscSort`,
  `cleAmorceInsc()`, `setInscriptionsSort()`, tri dans `renderInscriptions()`),
  `mes-inscriptions.html` (barre de tri), `style.css` (`.liste-tri`).
- **Migration :** aucune.
- **Cache-buster :** `sw.js` v283 + `menu.html?v=191`.
- **Commit :** `5b9c984`
