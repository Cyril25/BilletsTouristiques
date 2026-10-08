# Demande #79 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin ou collecteur, qui voulez savoir ce que
> change cette demande. Aucune connaissance technique n'est nécessaire.
> Reflète la version technique du commit `2a93dc9` (08/10/2026).

## Ce qui a été demandé

Jean-Philippe : « sur les collectes, peux-tu ajouter la date et l'heure de l'inscription d'un
membre ». Le site notait déjà ce moment à chaque inscription. Il ne le montrait simplement pas.

## Ce qui change

- **Collecteurs, « Mes collectes »** : dans le tableau des inscrits d'une collecte, une nouvelle
  colonne **« Inscrit le »**. Par exemple : Marie Dupont, inscrite le 05/10/2026 à 08:13. Au
  téléphone, c'est une ligne de plus dans la carte de chaque inscrit.
- **Admins, fenêtre des inscriptions d'un billet** : la même colonne, à côté du nom du membre.
- **Membres, « Mes inscriptions »** : chaque inscription montrait déjà le jour, elle montre aussi
  l'heure.

## Ce qu'il faut savoir en lisant ces dates

- **C'est le moment de la première inscription.** Si Marie passe ensuite de 2 à 3 billets, sa date
  ne bouge pas.
- **Un membre inscrit automatiquement par sa pré-inscription** porte le moment où la collecte a été
  créée, pas celui où il s'est pré-inscrit. Tous les pré-inscrits d'une même collecte ont donc à peu
  près la même heure.
- **Les inscriptions reprises de l'ancien fichier, le 31/03/2026**, n'ont pas de vraie date : on ne
  connaît que le moment de la reprise. Elles affichent **« avant le 31/03/2026 »**. Il y en a 805,
  dont 317 sur 26 collectes encore en pré-collecte. Leur afficher une heure ferait croire qu'elles
  sont toutes arrivées à la même minute, et donnerait un faux ordre d'arrivée.

## Ce qui ne change pas

- Les tableaux restent classés par nom. On ne peut pas les trier par date : ce n'était pas demandé.
- Le récapitulatif de « Vérification paiement » garde le jour seul.
- Le site ne distingue pas une inscription faite par le membre d'une inscription automatique : il
  n'a pas l'information.

## Ce sur quoi on vous demande de vous prononcer

- Est-ce bien **là** que vous attendiez la date ? Manque-t-il un écran ?
- **« avant le 31/03/2026 »** pour les anciennes inscriptions, ça vous va ?
