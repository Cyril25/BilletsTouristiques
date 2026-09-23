# Demande #72 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `1d367c4` (23/09/2026).

## Où on en est (23 septembre)

L'analyse a été validée le 18/09. **Les trois premières étapes sont faites et en ligne** ; la
quatrième (l'envoi automatique des rappels) attend une décision de Cyril.

**Ce qui marche dès maintenant — la fiche à compléter.** Un membre dont la fiche n'est pas complète
arrive sur son profil, avec un bandeau qui dit ce qui manque. Il peut toujours lire le règlement et
la page contact. Dès qu'il a enregistré, il repart là où il allait. Le téléphone n'est jamais
exigé. Aujourd'hui, **50 fiches sur 108** sont concernées : les 42 sans adresse, plus 8 qui n'ont
que le pays vide. Parmi elles, 11 membres venus ces deux derniers mois, dont 2 admins : ce sont
eux qui le verront en premier.

**Ce qui marchera une fois que Cyril aura préparé la base** — une manipulation de quelques minutes :

- un nouvel écran **« Comptes inactifs »** dans le menu d'administration. En haut, les réglages : la
  durée (**1 an** au départ), le délai du rappel (30 jours) et l'interrupteur, **éteint**. Dessous,
  quatre onglets : *Bientôt en veille*, *Retenus* (avec la raison en clair), *En veille*,
  *Historique* ;
- la mise en veille elle-même, la réintégration en un bouton (ici ou dans Gestion Membres, qui a un
  nouveau filtre « En veille »), le report avec une raison, et l'écran de connexion qui explique au
  membre ce qui lui arrive.

**Une différence avec ce qui était prévu : le rappel part de votre messagerie.** L'envoi automatique
n'existe pas encore. En attendant, l'écran prépare le message (au tutoiement, modifiable) et ouvre
votre messagerie avec les destinataires en copie cachée. Vous cliquez ensuite « J'ai envoyé le
rappel » et la date est notée. **Personne ne peut être mis en veille sans que ce rappel ait été noté
au moins 30 jours avant** : la promesse « personne ne s'endort sans avoir été prévenu » tient.

**Un garde-fou de plus que prévu : le mode vacances.** Un membre qui a signalé son absence n'est pas
mis en veille tant qu'elle dure.

**Ce que ça donnerait aujourd'hui**, pour vous aider à trancher la question 1 ci-dessous :

- à **1 an**, personne n'est concerné avant **février 2027**. Le site ne note les visites que depuis
  le 20 mars 2026, donc personne n'a encore un an d'absence connue ;
- à **6 mois**, 42 comptes seraient à prévenir tout de suite. 24 d'entre eux seraient retenus,
  presque tous parce qu'ils ont une inscription pas encore payée ou pas encore envoyée. Un mois après
  le rappel, 17 seraient mis en veille.

## De quoi il s'agit

Sébastien l'a demandé : un membre qui ne vient plus depuis longtemps ne devrait plus avoir accès au
site, et une fiche incomplète — une adresse manquante, par exemple — ne devrait pas pouvoir durer.

Il a précisé le 16/09 : au bout de **6 mois ou 1 an**, à décider entre vous ; le membre doit
**compléter son profil en entier**, le téléphone pouvant rester facultatif ; une fois **en veille**,
il n'a plus accès et **seul un admin le réintègre** ; les **collecteurs et les admins** sont
concernés aussi ; et il faut un **rappel par mail un mois avant**.

## Ce qu'on propose : deux réponses différentes

Les deux situations sont dans la même phrase de la demande, mais elles n'appellent pas le même geste.

**La personne ne vient plus → mise en veille.** Son compte est mis de côté : elle ne peut plus
entrer, et un admin doit la réintégrer. Rien n'est effacé : ses inscriptions, sa collection et son
historique sont conservés.

**La fiche est incomplète → on l'oblige à compléter, sans couper l'accès.** En arrivant sur le site,
le membre tombe sur son profil, avec un bandeau qui dit ce qui manque, et il ne peut pas aller
ailleurs tant qu'il ne l'a pas rempli. Dès que c'est fait, tout redevient normal, sans qu'un admin
intervienne.

**Pourquoi cette différence :** aujourd'hui, **42 membres sur 108** n'ont pas d'adresse complète.
Leur couper l'accès du jour au lendemain, ce serait bloquer quatre membres sur dix, et des collectes
en cours avec eux. Les envoyer compléter leur fiche donne le même résultat, sans casse. Et c'est bien
ce que demandait Sébastien : « faire compléter au membre son profil ».

## Ce qui existe déjà, et ce qui manque

Bonne nouvelle : le site garde **la date de dernière visite** de chaque membre depuis le 20 mars
2026, et elle s'affiche déjà dans l'écran des utilisateurs. La règle « fiche complète » existe aussi,
avec exactement les champs voulus — nom, prénom, rue, code postal, ville, pays —, **le téléphone
étant déjà facultatif**. Elle ne sert aujourd'hui qu'au moment de s'inscrire à une collecte.

Trois choses manquent :

- **l'envoi de mails.** Le site n'en envoie aucun : ses messages sont des notifications dans la
  cloche. Or la cloche ne s'affiche que pour un compte actif : **elle ne touche jamais quelqu'un qui
  ne vient plus**, c'est-à-dire exactement la personne à prévenir. Le mail est donc le seul moyen de
  l'atteindre ;
- **quelque chose qui tourne tout seul** chaque nuit pour compter les jours ;
- **un endroit où ranger un réglage** comme « 6 mois » ou « 1 an ».

## La durée : un réglage, pas un chiffre gravé

Plutôt que d'écrire 6 mois ou 1 an dans le code, on propose un petit écran de réglages avec trois
valeurs : la durée, le délai du rappel, et surtout **un interrupteur général**.

Cet interrupteur compte : on installe tout, la liste montre qui serait concerné, vous regardez — et
vous n'allumez que quand vous êtes d'accord. Rien ne s'endort tant qu'il est éteint.

## Les garde-fous

- **Jamais le dernier admin.** Sébastien inclut les admins, et c'est justement là qu'un automatisme
  peut fermer la porte de l'intérieur. Si endormir un compte laissait le site sans aucun admin, on ne
  le fait pas : on prévient les autres.
- **Personne au milieu d'une affaire en cours.** Une inscription en cours, une dette non réglée, une
  enveloppe non reçue : le compte n'est pas endormi, il est signalé aux admins.
- **Le premier passage.** 37 membres n'ont aucune date de visite : ils ne sont pas revenus depuis
  mars, mais on ne sait pas s'ils étaient venus avant. On propose de les compter comme vus le 20 mars
  2026, et de leur envoyer le rappel comme aux autres : **personne ne s'endort sans avoir été
  prévenu**.
- **Une trace** de chaque mise en veille, de chaque rappel et de chaque réintégration, pour pouvoir
  répondre à « pourquoi je ne peux plus entrer ? ».

## L'écran « Comptes inactifs »

Un écran d'administration, à côté d'Utilisateurs, avec trois listes : **bientôt en veille**, **en
veille**, et **retenus par un garde-fou**. Pour chacun, la dernière visite et le motif ; et deux
boutons, **réintégrer** et **repousser**.

## Dans quel ordre ce serait fait

1. L'état « en veille » et les réglages, interrupteur éteint.
2. La fiche à compléter — utile tout de suite, indépendamment du reste.
3. L'écran « Comptes inactifs », qui montre qui serait concerné sans rien endormir.
4. Le déclenchement automatique et le rappel par mail.

Les trois premières étapes servent déjà à quelque chose : elles donnent à voir avant de décider.

## Ce que l'application ne fera PAS

- **Elle n'effacera rien.** Un compte en veille garde toutes ses données.
- **Elle ne bloquera personne pour une fiche incomplète** : elle l'enverra la compléter.
- **Elle ne réveillera personne toute seule** : revenir sur le site ne suffit pas, c'est un admin qui
  réintègre — c'est ce que Sébastien a demandé.
- **Elle ne touche pas** à la validation des nouveaux membres ni aux refus.

## Ce sur quoi on vous demande de vous prononcer

*Mis à jour le 23/09 : les points 3 et 4 ont été appliqués comme proposé, les points 1 et 2 restent
ouverts.*

1. **6 mois ou 1 an ?** Toujours ouvert. L'écran démarre à **1 an**, et la valeur se change en deux
   clics dans ses réglages. Voir plus haut « Ce que ça donnerait aujourd'hui » : à 6 mois, une
   première vague partirait tout de suite.
2. **Le rappel par mail automatique :** Cyril ne l'a pas encore tranché. En attendant, le rappel part
   de la messagerie d'un admin (voir plus haut).
3. ~~Les 37 comptes sans date de visite~~ — appliqué : ils comptent comme vus le 20 mars 2026, et
   reçoivent le rappel comme les autres.
4. ~~Les admins et les collecteurs~~ — appliqué : ils sont concernés, avec le garde-fou du dernier
   admin. Un collecteur qui a une collecte en cours est retenu.

## Ce qu'il faudra vérifier (une fois la base prête)

- Ouvrir « Comptes inactifs » : réglages à 1 an, 30 jours, éteint ; listes vides.
- Passer à 6 mois **sans allumer** : les listes se remplissent, les boutons restent grisés. Regarder
  les *Retenus* : les raisons sont-elles justes pour les membres que vous connaissez ?
- Remettre la durée voulue. **N'allumer qu'une fois la question 1 tranchée entre vous.**
- Sur téléphone et en mode sombre : l'écran, la fenêtre du rappel, la fenêtre « repousser ».
- Un membre à la fiche incomplète : il arrive sur son profil, le bandeau dit ce qui manque, et après
  enregistrement il revient là où il allait.

Vos remarques sont bienvenues : laissez un commentaire, vous aurez une réponse disant ce qui en a été
fait. Si tout vous va, cochez « J'ai lu et je valide l'analyse » sur la fiche.
