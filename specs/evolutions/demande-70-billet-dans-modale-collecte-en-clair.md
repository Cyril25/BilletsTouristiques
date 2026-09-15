# Demande #70 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin ou collecteur, qui devez dire si ce qui est
> prévu correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `5866751` (15/09/2026).

## De quoi il s'agit

Sur la fiche d'un billet, quand on clique sur une collecte pour la modifier — pour la passer de
« Pré collecte » à « Collecte », par exemple —, une fenêtre s'ouvre **par-dessus la fiche**. Elle ne
disait que « Modifier la collecte « Collecte initiale » ». Or tous les billets ont une « Collecte
initiale » : une fois la fenêtre ouverte, **plus rien ne rappelait de quel billet il s'agissait**.

## Ce qui change, sur un exemple

Vous ouvrez la fiche du billet Nausicaa 2026-14 et vous cliquez sur sa collecte. La fenêtre affiche :

- en titre, comme avant : **Modifier la collecte « Collecte initiale »** ;
- juste en dessous, sur une seule ligne : **la petite image du billet**, et à côté
  **UEBK 2026-14 NAUSICAA**.

C'est la même ligne quand on **ajoute** une collecte au billet.

## Ce qui a été décidé, et pourquoi

- **Une ligne sous le titre plutôt qu'un titre plus long.** Jean-Antoine proposait « Modifier la
  collecte « Collecte 2026 » du billet … UEXX 2XXX-Y ». Sur un téléphone, ce titre prendrait trois ou
  quatre lignes — et la demande insistait pour ne pas agrandir une fenêtre déjà longue. La ligne
  ajoutée est petite : l'image ne dépasse pas la hauteur d'une ligne de texte et demie.
- **Le nom et l'image, pas l'un ou l'autre.** Le nom avec l'amorce et le millésime distingue
  deux billets qui se ressemblent ; l'image se reconnaît d'un coup d'œil.
- **Ce qui est affiché, c'est la fiche telle que vous la voyez.** Si vous venez de changer l'image
  ou de corriger le nom sans avoir encore enregistré, la fenêtre montre déjà la nouvelle version.
- **Un billet sans image** : la ligne n'affiche que le nom, sans cadre vide.

## Ce qui ne change pas

- Le reste de la fenêtre : mêmes champs, mêmes boutons.
- **Le changement de statut rapide depuis la liste des billets** n'est pas concerné. S'il pose le
  même problème, il faudra le signaler à part.

## Ce sur quoi on vous demande de vous prononcer

- En ouvrant une collecte, **reconnaissez-vous le billet tout de suite** ?
- La ligne ajoutée **gêne-t-elle** sur votre téléphone ?
