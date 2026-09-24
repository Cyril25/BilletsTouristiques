# Demande #78 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `72d33be` (24/09/2026).

## De quoi il s'agit

Dans **Gestion des membres**, chaque fiche porte ses boutons en bas : Modifier la fiche, Bloquer,
Promouvoir admin, Changer l'adresse, Désactiver, Supprimer. Depuis l'arrivée de « Changer
l'adresse » et « Désactiver », ils ne tenaient plus sur une ligne : sur ordinateur, **les derniers
sortaient de la fiche** et passaient sous la fiche d'à côté.

## Ce qui change, sur un exemple

Vous ouvrez la fiche de Geneviève, simple membre. Elle a six boutons. Ils sont maintenant rangés
**deux par deux**, sur trois lignes, tous à l'intérieur de sa fiche :

| | |
|---|---|
| Modifier la fiche | Bloquer |
| Promouvoir admin | Changer l'adresse |
| Désactiver | Supprimer |

L'icône de chaque bouton est à côté de son nom, plus au-dessus.

Et si la fiche de Jean-Philippe, à côté, est plus courte (pas d'adresse), ses boutons restent
**alignés en bas**, à la même hauteur que ceux de Geneviève.

Sur téléphone, c'est aussi deux par deux, au lieu de six boutons empilés : la liste est deux fois
moins longue à faire défiler.

## Ce qui a été corrigé au passage

En **thème sombre**, le bouton « Changer l'adresse » était presque invisible (violet foncé sur fond
sombre), et « Modifier la fiche » peu lisible. Ils passent en violet clair, comme les autres textes
violets du site en sombre. Le bouton « Modifier » de l'écran Collecteurs en profite aussi.

## Ce qui ne change pas

- Les boutons eux-mêmes : mêmes noms, même ordre, même rôle.
- L'écran Collecteurs garde son bouton « Modifier » tel qu'il est (sauf en thème sombre, voir
  plus haut).

## Remarqué, pas touché

Deux petits défauts vus sur les mêmes fiches, laissés de côté parce que personne ne les a
demandés : la fiche d'un membre désactivé a un **pointillé épais et noir** (blanc en sombre)
autour d'elle, et la fiche d'un membre bloqué était censée avoir un **contour rouge** qui n'apparaît
pas. Dites-le si vous voulez qu'on les reprenne.

## Ce sur quoi on vous demande de vous prononcer

- Voyez-vous encore un bouton qui dépasse d'une fiche ? (Recharger la page si l'ancienne version
  s'affiche encore.)
- Les boutons deux par deux vous conviennent-ils, sur ordinateur **et** sur téléphone ?
