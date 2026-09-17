# Demande #72 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `41658cb` (17/09/2026).

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

1. **6 mois ou 1 an ?** Sébastien vous renvoie la décision. On propose de commencer à **1 an** : un
   collectionneur peut très bien passer une saison sans rien acheter. La valeur se changera ensuite
   sans développement.
2. **Le rappel par mail :** on met en place un envoi automatique, ou un admin envoie le message à la
   main chaque mois ? On recommande l'envoi automatique, seul moyen d'atteindre quelqu'un qui ne
   vient plus. Cyril seul peut trancher : c'est lui qui tient le domaine.
3. **Les 37 comptes sans date de visite** : d'accord pour les compter comme vus le 20 mars 2026, avec
   le rappel avant toute mise en veille ?
4. **Les admins et les collecteurs** sont-ils vraiment concernés ? Sébastien dit oui ; on le suit,
   avec le garde-fou du dernier admin.

Vos remarques sont bienvenues : laissez un commentaire, vous aurez une réponse disant ce qui en a été
fait. Si tout vous va, cochez « J'ai lu et je valide l'analyse » sur la fiche.
