# Demande #87 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui préparez les posts Facebook d'un
> billet depuis Gestion Billets. Aucune connaissance technique n'est nécessaire.
> Reflète la version technique du commit `952e2b9` (21/10/2026).

## Ce qui a été demandé

Jean-Philippe : sur un billet qui a deux collectes, le bouton « Partager » ne nommait pas le bon
collecteur. Sur Lapalisse, il fallait que le texte annonce Damien, avec le détail de sa collecte.
Cyril a ajouté, sur la fiche de la demande : le bouton « Partager » devrait être sur chaque
collecte.

## Pourquoi ça arrivait

Le texte était préparé à partir du billet, et allait chercher ses morceaux dans des collectes
différentes : le collecteur dans la première collecte créée (même terminée), le prix dans une
autre. Sur un billet à plusieurs collectes, on pouvait annoncer le collecteur de l'une avec le prix
de l'autre.

## Ce qui change

**Le texte présente une collecte, et une seule** : son statut, son collecteur et son adresse PayPal
quand elle est ouverte, la version qu'elle concerne, et son prix.

> Lapalisse, collecte de Damien :
> 🎫 France - UEQX 2026-8 - 03 - LAPALISSE
> 📌 Statut : Collecte | Collecteur : Damien PAVE (son adresse PayPal)
> 🔹 Version : normale
> 💰 Prix : 3.20€

**Sur la page d'un billet**, chaque collecte en cours a maintenant son bouton **« Partager »**, à
côté de « Modifier ». Il ouvre le texte de cette collecte-là.

**Le bouton « Partager » de la carte** (liste de Gestion Billets) :
- une seule collecte en cours : il la partage directement, comme avant ;
- plusieurs : il demande laquelle partager (« Collecte Normale — Collecte — Damien PAVE » ou
  « Collecte 2026 — Pré collecte »).

## Ce qui ne change pas

- Un billet qui n'a qu'une collecte donne exactement le même texte qu'avant.
- L'image et le lien « S'inscrire » sont les mêmes.

## Ce sur quoi on vous demande de vous prononcer

- Jean-Philippe : sur Lapalisse, le texte de la collecte de Damien est-il celui que tu attendais ?
- La ligne « Version : normale / Doré » n'apparaît que quand la collecte ne couvre qu'une des deux
  versions. Ça vous va ?
