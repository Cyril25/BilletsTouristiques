# Demande #62 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document) — vous n'avez pas
> besoin de la lire pour valider.
>
> Reflète la version technique du commit `2c12042` (14/09/2026).
>
> **Mise à jour du 14/09 : Cyril a répondu.** Le besoin est confirmé ; supprimer un membre qui a
> des données devient une **désactivation** ; tous les admins pourront changer une adresse ; le
> membre ne sera pas prévenu. Reste une question, le garde-fou — expliquée plus bas.
>
> **Mise à jour du 12/09 : le point de mécanique est réglé, l'analyse vous revient.** Le 11/09, en
> développant la petite correction préalable (demande #64), on avait découvert qu'elle ne suffisait
> pas à ouvrir la voie, contrairement à ce qu'annonçait la première version de ce document. C'est
> traité : voir « Le point réglé le 12/09 ». **Rien n'a changé dans ce qui vous est proposé** —
> c'était de la mécanique interne.

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

## Le point réglé le 12/09

Dans la base, il n'y a pas que des données : il y a aussi de petites règles de surveillance qui
regardent passer chaque modification. « Un membre n'a pas le droit de changer ça. » « Note qui a
modifié quoi, et quand. » Un changement d'adresse passe devant elles comme n'importe quelle autre
modification — et c'est ce qu'on avait sous-estimé : l'une le **refusait** purement et simplement,
une autre **effaçait au passage** la trace de qui avait fait quoi.

En faisant le tour complet, on en a trouvé **cinq** concernées, et non deux comme on le croyait le
11/09. Les trois nouvelles sont bénignes, mais elles mentaient : elles marquaient comme « modifiées
aujourd'hui » les demandes, les signalements et les contacts de la personne, alors que personne n'y
avait touché.

**La solution retenue** : pendant l'opération, et pendant elle seule, la base sait qu'un changement
d'adresse bien précis est en cours — de telle adresse vers telle autre. Chacune de ces règles laisse
alors passer **cette modification-là et rien d'autre** : si quoi que ce soit change en même temps,
elle reprend aussitôt son travail habituel. Les protections restent donc entières pour tout le reste
du site, y compris pendant le changement d'adresse.

Rien à décider de votre côté : c'est un choix technique, il est tranché, et il ne change rien à ce
qui vous est proposé plus haut.

## Supprimer un membre qui a des données : il sera désactivé

Avec cette seconde voie, **un membre qui a encore des données ne pourra plus être effacé**.
Aujourd'hui ça passe, et ça perd ses données en silence — c'est le défaut qui a créé neuf des dix
adresses fantômes.

~~Demain l'application dira « impossible : cette personne a 24 enveloppes et 27 billets en
collection ».~~ **Décision de Cyril, le 14/09 : à la place, le membre est désactivé.** Concrètement :

- le bouton « Supprimer » devient **« Désactiver »** pour un membre qui a des données ; un membre
  sans aucune donnée se supprime comme aujourd'hui ;
- un membre désactivé **ne peut plus se connecter**, mais **tout est conservé** : inscriptions,
  collection, envois ;
- il n'apparaît plus quand un collecteur choisit un membre à inscrire ;
- un admin peut le **réactiver** s'il revient.

L'application sait déjà mettre un membre « en attente » ou « refusé » : la désactivation est un état
de plus, pas un mécanisme nouveau.

**Un détail de sécurité trouvé en préparant**, déjà prévu dans la version technique : un admin
désactivé doit perdre ses droits d'admin partout, pas seulement à l'entrée du site.

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
   reste. C'est réglé depuis le 12/09, voir « Le point réglé le 12/09 ».*
2. La mécanique de fond : le lien tenu par la base, et le changement d'adresse lui-même.
3. Puis le bouton dans Gestion Membres, avec le décompte et la confirmation — et, depuis le 14/09,
   la désactivation et la réactivation d'un membre.
4. Enfin, un jour, le ménage dans les adresses fantômes. Indépendant du reste.

## Ce sur quoi on vous demande de vous prononcer

Cyril a répondu le 14/09 aux quatre premières questions :

- ~~Est-ce bien le besoin ?~~ **Oui** : changer l'adresse d'un compte. Fusionner deux comptes qui ont
  chacun des données reste hors du périmètre — il faudrait choisir les données de l'un, de l'autre,
  ou des deux.
- ~~La suppression d'un membre qui a des données doit-elle devenir refusée ?~~ **Elle devient une
  désactivation** (voir plus haut).
- ~~Qui a le droit de changer une adresse ?~~ **Tous les admins.**
- ~~Faut-il prévenir le membre ?~~ **Non.**

**Reste une question : faut-il le garde-fou automatique ?** Cyril n'en voyait pas bien l'intérêt —
voici l'explication.

L'adresse d'un membre est recopiée à une vingtaine d'endroits. La solution retenue demande à la base
de tenir le lien : quand l'adresse change, tous les endroits **déclarés** suivent seuls. Le risque,
c'est l'endroit **pas déclaré** : dans un an, quelqu'un ajoute une fonctionnalité qui note l'adresse
d'un membre dans une nouvelle table, et oublie de la relier. Le jour où un admin change une adresse,
cette table est oubliée, **sans erreur ni alerte** — exactement ce qui est arrivé en 2024 avec les
six enveloppes, restées au nom de l'ancienne adresse pendant des mois.

Le garde-fou, c'est une vérification faite **juste avant chaque changement d'adresse** : « existe-t-il
un endroit qui ressemble à une adresse de membre, et que je ne connais pas ? » Si oui, il **refuse le
changement et dit lequel**. L'oubli ne passe plus en silence : il se voit le jour même, avant de faire
des dégâts. Il fait la même chose pour les petites règles de surveillance découvertes le 12/09.

**Ce qu'il coûte** : une vingtaine de lignes, écrites une fois, sans écran. **Ce qu'il ne fait pas** :
il ne répare rien tout seul — il empêche seulement de continuer à l'aveugle.

Sans lui, le changement d'adresse marche aussi, tant que personne n'oublie rien. La question est
donc : **veut-on cette assurance pour une vingtaine de lignes ?** Recommandation : oui.
