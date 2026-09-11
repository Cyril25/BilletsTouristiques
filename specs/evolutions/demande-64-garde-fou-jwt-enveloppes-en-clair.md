# Demande #64 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
>
> *Reflète la version technique du commit `dac0c8b` (11/09/2026).*

## De quoi il s'agit

**Pour vous, rien ne change à l'écran.** C'est une correction d'entretien.

Les enveloppes ont un garde-fou : un membre peut confirmer qu'il a reçu son enveloppe ou déclarer
qu'il a payé le port, mais il ne peut pas toucher au numéro de suivi, au prix ou au destinataire.
C'est le collecteur qui gère ça. Ce garde-fou fonctionne bien, et il reste en place.

Le problème, c'est qu'il ne sait pas faire la différence entre un membre et **Cyril qui intervient
directement dans la base** pour réparer quelque chose. Dans ce cas il n'y a personne de connecté au
site, et le garde-fou croit avoir affaire à un membre qui essaie de tricher : il refuse.

C'est ce qui s'est passé le 10 septembre en rattachant l'historique d'un membre à sa nouvelle
adresse : il a fallu **débrancher** le garde-fou le temps de l'opération. Ça a marché, mais débrancher
une protection pour travailler, c'est exactement le genre de geste qu'on veut éviter.

## Ce qui est corrigé

Le garde-fou apprend à reconnaître les interventions faites **hors du site** — directement dans la
base, ou par l'outil de maintenance — et à les laisser passer.

**Tout le reste est identique.** Un membre ne peut toujours pas modifier ce qui ne le regarde pas,
un collecteur garde la main sur ses envois.

## Deux pièges évités en chemin

**Le premier : réécrire la mauvaise version.** La correction remplace le garde-fou entier. En juillet,
il avait été renforcé : depuis, un membre ne peut plus revenir sur un paiement que le collecteur a
confirmé. En partant d'une copie plus ancienne, on aurait **supprimé ce renforcement sans s'en
apercevoir**. La correction part donc de la bonne version, et avant de remplacer quoi que ce soit,
elle vérifie que c'est bien celle-là qui tourne en production. Si ce n'est pas le cas, elle s'arrête.

**Le second : ouvrir la porte trop grand.** La solution la plus évidente aurait laissé passer toute
personne qui n'est pas identifiée — et sur ce site, un visiteur anonyme et un membre ne se
distinguent que par leur adresse email. Ce n'aurait pas été une faille dans l'immédiat, car d'autres
protections bloquent déjà ce cas. Mais le garde-fou est justement **la protection qui tient le jour
où une autre lâche**. La correction retenue ne laisse passer que les interventions de maintenance,
et rien d'autre.

## Comment on sait que ça marche

On a joué **onze situations**, avant et après la correction, sur une copie de test : un membre qui
essaie de changer le numéro de suivi, un collecteur qui l'enregistre, un membre qui déclare son
paiement, un visiteur anonyme, une intervention de maintenance, etc.

**Seules les trois situations de maintenance changent de résultat.** Les huit autres donnent
exactement la même réponse qu'avant — y compris le visiteur anonyme, toujours refusé, et le paiement
confirmé, toujours intouchable.

## Ce que ça ne fait pas

Ça ne permet pas encore de **changer l'adresse d'un membre depuis Gestion Membres** (demande #62).
On pensait que cette correction suffirait à ouvrir la voie ; en la testant, on a découvert que non.
Quand c'est un admin qui lance l'opération depuis le site, le garde-fou le traite comme n'importe
quel admin — et un admin qui n'est pas le collecteur n'a pas le droit de modifier une enveloppe. La
demande #62 doit donc prévoir sa propre solution, et son analyse est reprise.

## Ce sur quoi on vous demande de vous prononcer

Rien de particulier : c'est une correction interne sans effet visible. Elle est décrite ici pour que
chacun sache qu'elle existe, et pourquoi.
