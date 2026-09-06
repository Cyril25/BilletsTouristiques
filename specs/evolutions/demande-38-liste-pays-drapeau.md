# Demande #38 (prod) — Liste déroulante de pays + drapeau (profil et gestion des membres)

- **Épic :** Corrections et évolutions
- **Demande :** #38 de la table `demandes` **de production** — Jean-Philippe, 2026-07-26, normale / S.
- **Concerne :** membres, admins
- **Écran :** Mon profil + Gestion des membres
- **Statut :** À tester
- **Commit :** _(voir Réalisation)_

## Contexte (demande)

> Mettre une liste déroulante pour le pays dans la fiche du membre et associer le drapeau
> correspondant au pays ; il faut également que cette liste soit disponible pour les admins dans
> la page de gestion des membres

## Analyse / décisions

- **Constat en ouvrant le code** : « Mon profil » a **déjà** une liste déroulante, alimentée par la
  table `pays` (76 entrées). Il lui manquait seulement le drapeau. C'est la **gestion des membres**
  qui était restée en saisie libre (`<input type="text">`) — donc l'essentiel du travail est là.
- **Source unique : la table `pays`**, pas `window.PAYS_FLAGS`. `PAYS_FLAGS` sert à trouver le
  drapeau d'un pays, la table `pays` est la liste de référence des valeurs saisissables. Les faire
  diverger créerait des pays sélectionnables sans drapeau, et l'inverse.
- **Drapeau = `window.flagImg()`** (image `flags/<code>.svg` du dépôt), pas l'emoji : les emojis
  drapeaux ne sont pas rendus sous Windows — c'est le choix déjà fait pour les cartes membres (#2).
- **La valeur existante est conservée en option** même si elle n'est pas dans la table : ouvrir la
  modale d'un membre ne doit pas silencieusement effacer son pays. Vérifié en base au moment du
  dev : les 7 valeurs distinctes utilisées sont toutes dans la table (51 membres sans pays).
- **Chargement de la liste avec les membres**, en `.catch(() => [])` : la modale est construite en
  HTML synchrone et a besoin des options tout de suite, mais un échec sur `pays` ne doit pas
  empêcher d'afficher les membres.

## Critères d'acceptation

1. Dans Gestion des membres, le pays se choisit dans une liste déroulante, plus au clavier.
2. Le drapeau s'affiche à côté et suit la sélection.
3. Un membre dont le pays n'est pas dans la table garde sa valeur, proposée en tête de liste.
4. « Non renseigné » est possible (le pays n'est pas obligatoire pour un membre).
5. Dans Mon profil, le drapeau s'affiche à côté de la liste et suit la sélection.

## Réalisation

- **Fichiers :** `users.js` (`paysListe`, `optionsPaysHtml()`, `majDrapeauEditionMembre()`, champ
  de la modale), `profil.html` + `profil.js` (`majDrapeauProfil()`), `style.css`.
- **Migration :** aucune (la table `pays` existe déjà).
- **Commit :** _(à compléter)_
