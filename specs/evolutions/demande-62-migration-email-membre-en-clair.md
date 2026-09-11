# Demande #62 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document) — vous n'avez pas
> besoin de la lire pour valider.
>
> *Reflète la version technique du commit `de402c7` (11/09/2026).*
>
> **Mise à jour du 11/09 : l'analyse est reprise.** En développant la petite correction préalable
> (demande #64), on a découvert qu'elle ne suffisait pas à ouvrir la voie, contrairement à ce
> qu'annonçait la première version de ce document. Rien ne change dans ce qui vous est proposé ;
> c'est un point de mécanique interne à régler avant de pouvoir vous soumettre la version finale.

## De quoi il s'agit

De temps en temps, un membre n'arrive plus à se connecter avec son adresse email. Il s'en crée une
nouvelle, revient sur le site... et **ne retrouve rien**. Ni ses inscriptions, ni sa collection, ni
ses envois. Pour l'application, la personne avec la nouvelle adresse est **quelqu'un d'autre**.

C'est arrivé le 9 septembre. Dix ans d'historique — 139 inscriptions, 27 billets
en collection, 24 envois — dormaient sous son ancienne adresse pendant qu'il consultait le site
avec la nouvelle, où il n'y avait rien.

L'idée est simple : **pouvoir dire à l'application « cette personne a changé d'adresse »**, depuis
l'écran Gestion Membres, et que tout la suive.

## Ce qu'on a trouvé en regardant sous le capot

Et c'est là que ça devient plus lourd que prévu.

**Dans l'application, l'adresse email n'est pas une simple information de contact : c'est
l'identité même du membre.** Il n'y a pas de numéro de membre caché derrière. Du coup l'adresse est
recopiée à beaucoup d'endroits — sur chaque inscription, chaque billet de la collection, chaque
enveloppe, chaque dette, chaque commentaire.

**Et presque rien ne tient ces copies ensemble.** Sur la vingtaine d'endroits concernés, trois
seulement sont vraiment reliés à la fiche du membre. Pour tous les autres, l'application peut
parfaitement se retrouver avec une inscription au nom de quelqu'un qui n'existe plus, sans que
personne ne s'en aperçoive.

### Ce n'est pas une crainte, c'est déjà arrivé deux fois

**En 2024**, un changement d'adresse a été fait à la main pour un membre. Le script d'alors traitait six
sortes de données. Il en avait oublié une : les enveloppes. **Six enveloppes sont restées au nom de
l'ancienne adresse**, et personne ne l'a jamais vu — jusqu'à ce qu'on aille regarder, cette semaine.

**Et à chaque suppression de membre.** Aujourd'hui, supprimer un membre depuis Gestion Membres
fonctionne même s'il a des enveloppes ou une collection : ces données restent, orphelines. C'est
comme ça que neuf autres adresses fantômes se sont accumulées. Au total : **23 enveloppes qui
appartiennent à des gens qui n'existent plus.**

Rien de grave dans l'immédiat — aucune n'a de frais de port impayés — mais c'est le symptôme.

## Ce qui a déjà été fait

**Ce cas a été réglé à la main le 10 septembre**, avec un script écrit pour l'occasion et
essayé au préalable sur une copie jetable de la base. Il a fonctionné : le membre retrouve tout sous sa nouvelle adresse.

Mais c'est justement le problème : **à la main, à chaque fois, avec le risque d'oublier une case** —
exactement ce qui est arrivé en 2024.

## Ce qui est proposé

Deux façons de faire, et le choix compte plus que le reste.

**La première** : écrire dans l'application la liste des endroits à mettre à jour. Rapide, et ça
marche... jusqu'au jour où quelqu'un ajoute une nouvelle fonctionnalité, donc une nouvelle sorte de
données, et oublie de compléter la liste. **On aurait reproduit le mécanisme qui a coûté les six
enveloppes de 2024**, en plus officiel.

**La seconde, recommandée** : demander à la base de données elle-même de tenir le lien. Une fois
que c'est fait, changer l'adresse d'un membre entraîne automatiquement tout le reste — **y compris
les données qui n'existent pas encore**, parce que le lien fait partie de la façon normale de créer
une nouvelle table. Personne n'a plus de liste à maintenir.

On craignait que cette seconde voie oblige d'abord à faire le ménage dans les 23 enveloppes
fantômes. **Vérification faite, non** : on peut mettre le mécanisme en place dès maintenant en
tolérant l'existant, et faire le ménage plus tard, tranquillement. Les *nouvelles* incohérences,
elles, deviennent impossibles immédiatement.

## Un effet de bord qu'il faut accepter en connaissance de cause

Avec cette seconde voie, **supprimer un membre qui a encore des données deviendra refusé**.

Aujourd'hui ça passe, et ça perd ses données en silence. Demain l'application dira « impossible :
cette personne a 24 enveloppes et 27 billets en collection ». C'est plus embêtant sur le moment, et
c'est surtout **la correction du défaut qui a créé neuf des dix adresses fantômes**.

Il faudra donc aussi revoir le message affiché à l'admin, pour qu'il explique ce qui bloque au lieu
d'afficher une erreur technique incompréhensible.

## Comment ça se passera, concrètement

Marie, admin, ouvre la fiche du membre concerné dans Gestion Membres. Elle clique sur **« Changer l'adresse
email »**. L'application lui montre d'abord **ce qui va bouger** :

> 139 inscriptions, 27 billets en collection, 24 enveloppes, 1 fiche membre.

Elle saisit la nouvelle adresse, confirme, et c'est fait. Le membre se reconnecte avec son nouveau
compte Google et retrouve tout.

**Le décompte affiché avant de confirmer n'est pas décoratif** : c'est ce qui permet à Marie de
voir qu'elle s'apprête à déplacer dix ans d'historique, et donc de s'arrêter si elle s'est trompée
de personne dans la liste.

Chaque changement d'adresse est aussi **noté quelque part**, avec qui l'a fait et quand. Sans ça,
une adresse qui disparaît est inexplicable, et personne ne peut répondre à « où est passée ma
collection ».

## Ce que l'application ne fera PAS

- **Fusionner deux comptes réellement utilisés tous les deux.** On a regardé : il reste deux
  doublons connus, et dans les deux cas, comme dans le cas déjà traité, tout
  l'historique est d'un seul côté. Il s'agit de renommer, pas d'arbitrer entre deux collections.
  Construire cet arbitrage doublerait le travail pour une situation qui n'existe pas.
  Si un jour le cas se présente, l'application **refusera clairement** et dira pourquoi, plutôt que
  de choisir à votre place.
- **Laisser un membre changer son adresse lui-même.** C'est une opération d'admin.
- **Toucher à l'adresse PayPal d'un collecteur** : c'est un compte de paiement, il peut
  légitimement être différent de l'adresse de connexion.
- **Faire le ménage dans les 23 enveloppes fantômes** — c'est un chantier à part, sans urgence.

## En combien de fois

1. ~~D'abord une petite correction technique préalable (demande #64), sans effet visible.~~
   *Faite le 11/09. Elle simplifie l'entretien de la base, mais on a découvert en la testant
   qu'elle n'ouvrait pas la voie au changement d'adresse depuis le site : les protections qui
   entourent les enveloppes et l'historique des inscriptions s'appliquent aussi pendant
   l'opération, et il faut prévoir comment elles la laissent passer — sans les affaiblir pour le
   reste.*
2. La mécanique de fond : le lien tenu par la base, et le changement d'adresse lui-même.
3. Puis le bouton dans Gestion Membres, avec le décompte et la confirmation.
4. Enfin, un jour, le ménage dans les adresses fantômes. Indépendant du reste.

## Ce sur quoi on vous demande de vous prononcer

1. **Est-ce bien le besoin ?** Renommer un membre, et refuser proprement quand les deux comptes
   ont chacun des données.
2. **La suppression d'un membre qui a des données doit-elle devenir refusée ?** C'est la
   conséquence directe de la solution recommandée, et à mon sens une correction — mais ça change
   un écran qui fonctionne aujourd'hui.
3. **Qui a le droit de changer une adresse ?** Tous les admins, comme le reste de Gestion Membres,
   ou seulement le superadmin, vu que l'opération ne se défait pas ?
4. **Faut-il prévenir le membre ?** Sachant qu'il ne peut justement plus lire son ancienne boîte,
   l'intérêt n'est pas évident.
5. **Faut-il un garde-fou automatique** qui bloque l'opération et alerte si une nouvelle sorte de
   données a été ajoutée sans être reliée ? C'est ce qui empêcherait de revivre l'oubli de 2024,
   au prix d'un peu de complexité en plus.
