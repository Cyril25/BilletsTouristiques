# Demande #73 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin ou collecteur, qui devez dire si ce qui est
> prévu correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `b544321` (15/09/2026).

## De quoi il s'agit

Les images de billets affichées sur le site portaient un **QR code** qui mène vers notre site,
entouré de « Flashez-moi » et « Groupe Billets Touristiques ». Un vendeur n'aime pas voir ce QR sur
les images de ses billets : on le retire, **partout**, pour rester cohérent.

## Ce qui change, sur un exemple

Vous ouvrez la liste des billets et vous regardez le billet Nausicaa 2026-14 :

- **dans la liste**, son image n'a plus de QR code à gauche ;
- **dans Ma collection**, pareil ;
- **sur sa fiche**, pareil, et si vous faites « Enregistrer l'image sous… », l'image enregistrée
  n'a plus de QR non plus ;
- côté admin, dans la **gestion des billets**, le bouton **« Partager »** prépare toujours le texte
  du post Facebook avec l'image du billet — cette image n'a plus de QR.

## Ce qui a été décidé, et pourquoi

- **Rien n'est à reprendre dans les images.** Le QR n'a jamais été enregistré dans vos images : les
  originaux que vous avez importés sont intacts. Il était ajouté au moment de l'affichage. Il
  suffisait donc de ne plus l'ajouter.
- **Les images restent réduites.** Le site affiche une version plus légère que l'original (800
  pixels de large dans la liste). Ça accélère la page, surtout sur téléphone : on le garde.
- **Le bouton de téléchargement ne change pas** : il donnait déjà l'image d'origine, sans QR.

## Ce qui ne change pas

- La page **« Partager le site »**, dans le menu, garde son QR code. C'est une affiche pour faire
  connaître le groupe, sans image de billet. Cyril a confirmé qu'elle n'était pas concernée.

## Ce qu'on ne peut pas rattraper

Les images **déjà enregistrées** par quelqu'un, ou **déjà publiées sur Facebook**, gardent leur QR.
Elles ne sont plus sur le site, on n'y a pas accès.

## Ce sur quoi on vous demande de vous prononcer

- Voyez-vous encore un QR code sur **une** image de billet, quelque part sur le site ?
  (Pensez à recharger la page si le site vous montre encore l'ancienne version.)
