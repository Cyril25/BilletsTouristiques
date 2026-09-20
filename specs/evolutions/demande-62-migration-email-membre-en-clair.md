# Demande #62 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document) — vous n'avez pas
> besoin de la lire pour valider.
>
> Reflète la version technique du commit `00c43b3` (18/09/2026).

## Où on en est (18 septembre)

**L'analyse a été validée par Cyril le 15 septembre**, et les quatre recommandations de la fin de ce
document sont retenues. **Le développement a commencé le 16.**

**Les deux premières étapes sont faites, en ligne depuis le 17 septembre.** Elles avaient d'abord été
essayées sur une copie fidèle du site et de sa base, puis Cyril les a appliquées à la vraie base ;
toutes les vérifications sont passées. Chaque membre a désormais son numéro (120 fiches, anciens
membres et assistant compris), et toutes ses données le portent.

Ce que contiennent ces deux étapes :

- **Préparer** (étape 0). Le site sait désormais tenir à l'écart un compte **désactivé** : il n'apparaît
  plus dans les listes où l'on choisit un membre (inscrire quelqu'un à une collecte, la liste noire d'un
  collecteur, les pré-inscriptions, les annonces), mais son nom reste affiché sur ses anciennes
  inscriptions. Dans Gestion Membres, un nouveau filtre « Désactivés » les regroupe. Et un membre
  désactivé qui essaie de se connecter voit un message clair, au lieu d'une page vide.
  Côté base, on crée une fiche désactivée pour l'assistant et une pour chacune des **dix** adresses
  fantômes (elles s'afficheront « Ancien membre »).
- **Ajouter les numéros** (étape 1). Chaque membre reçoit son numéro, et chaque inscription, enveloppe,
  collection… reçoit le numéro de son membre, **à côté** de l'adresse. Rien n'est retiré, rien ne change
  à l'écran. Sur la copie, on a vérifié qu'aucune donnée ne bouge d'un octet, et que tout ce que fait le
  site aujourd'hui (s'inscrire, déclarer un paiement, créer une enveloppe, marquer une annonce comme
  lue…) continue de fonctionner.

**Pour vous, presque rien n'a changé à l'écran** : le filtre « Désactivés » de Gestion Membres montre
maintenant 11 fiches.

### L'étape 2 est faite (18 septembre)

**Les règles qui décident qui a le droit de voir ou de modifier quoi passent au numéro.** Jusqu'ici,
elles comparaient l'adresse de la personne connectée à celle recopiée sur chaque ligne. Elles comparent
désormais les numéros — et ne reconnaissent la personne que si **son compte est actif**.

Pour un membre actif, **rien ne change**. Trois choses changent volontairement :

- **un compte désactivé ne voit plus rien**, même en s'y prenant autrement que par le site — y compris
  un admin ou un collecteur désactivé, qui gardait jusqu'ici une partie de ses droits ;
- **les pré-inscriptions d'un membre ne sont plus lisibles que par lui et par les admins.** Jusqu'ici,
  n'importe quel compte, même en attente de validation, pouvait techniquement lire celles de tout le
  monde. Seuls les écrans d'admin s'en servent : personne ne verra la différence ;
- **les frais de port ne sont plus lisibles par un compte qui n'est pas actif.**

Comment on s'en est assuré, sur la copie : pour seize profils différents (admin, collecteur, membres dans
diverses situations, comptes désactivés, en attente, refusés, visiteur anonyme…), on a essayé **ligne par
ligne** de lire, modifier, supprimer et créer, avant et après. Près de 3 900 essais : les seules
différences sont les trois ci-dessus, et **personne n'a gagné un seul droit**. Puis on a rejoué les gestes
du site (s'inscrire, payer, confirmer un paiement, créer une enveloppe, commenter une demande…), et vérifié
qu'on peut revenir en arrière à l'identique.

**Cyril l'a appliquée le 18 septembre** : toutes les vérifications sont passées. Le site, qui écrit
encore des adresses, continue de fonctionner — c'est l'étape 1 qui remplit le numéro juste avant que la
règle ne le lise.

Viennent ensuite : reprendre les écrans un par un, retirer les adresses recopiées, puis le bouton
« Changer l'adresse ».

### L'étape 3 : les écrans (18 septembre)

**Onze écrans sur douze sont passés au numéro**, en deux mises en ligne le même jour : d'abord les
cinq plus petits (annonces, mes contacts, fiche d'un billet, signalements côté admin), puis les dix
autres — ma collection, Gestion Membres, collecteurs, mes inscriptions, le catalogue, les annonces
côté admin, la fiche d'une demande, le suivi des demandes, les pré-inscriptions et l'administration
des billets.

**Vous ne devriez rien voir de différent.** C'est tout l'enjeu : ces écrans demandaient jusqu'ici
« les lignes de telle adresse », ils demandent maintenant « les lignes du membre n° tant ». Un seul
changement se remarque, et il est invisible tant que rien ne cloche : là où un écran affichait
l'adresse de **quelqu'un d'autre** — l'auteur d'un signalement, le destinataire d'un message —, elle
est désormais lue sur sa fiche au lieu d'être recopiée sur la ligne. C'est ce qui permettra, à
l'étape suivante, de retirer les adresses recopiées sans rien perdre à l'écran.

Avant la mise en ligne, chaque geste a été rejoué sur la copie du site : cocher un billet dans ma
collection, bloquer puis débloquer un membre, rattacher un collecteur, marquer « pas intéressé »,
envoyer un message à une personne précise, publier un commentaire sur une demande, enregistrer une
pré-inscription, inscrire quelqu'un à une collecte depuis l'administration, la pastille « à payer »
du menu, une annonce marquée comme lue. Trente-quatre vérifications, toutes passées.

**Le plus gros écran, « Mes collectes »**, à lui seul plus volumineux que les dix autres réunis,
est écrit et vérifié (vingt-deux gestes rejoués sur la copie : mise en enveloppe, inscription d'un
membre, vérification des paiements, liste noire, relances…). Il part **dans une mise en ligne
séparée**, pour qu'un souci se rattache sans hésitation à l'un ou à l'autre.

**Une panne le 19 septembre, corrigée dans la journée** : l'écran de suivi des demandes ne se
chargeait plus (« erreur chargement demandes »). Un seul endroit, dans la petite étiquette qui
indique de qui on attend une réaction, demandait encore une adresse là où il reçoit désormais un
numéro. C'était une branche de l'écran qui ne s'affiche que dans un cas précis — une analyse à
valider dont la dernière réponse vient de l'assistant —, et aucune des données d'essai ne la
traversait. Le cas est maintenant fabriqué exprès dans les vérifications, avec les formulaires de
**modification** (et non plus seulement de création), qui étaient dans le même angle mort.

## C'est fait : on peut changer l'adresse d'un membre (20 septembre)

**Dans Gestion Membres, la carte d'un membre a trois boutons de plus** : « Changer l'adresse »,
« Désactiver », « Réactiver ».

Changer l'adresse, c'est maintenant une fenêtre et un champ. Tout ce qui appartient au membre suit
tout seul — ses inscriptions, sa collection, ses enveloppes, ses paiements, ses commentaires — parce
que ses données ne connaissent plus que son numéro. Il lui suffit ensuite de se connecter avec son
nouveau compte Google.

Le cas tordu était prévu et il est traité : quand quelqu'un s'est déjà connecté une fois avec sa
nouvelle adresse, le site lui a créé sans le dire une **deuxième fiche vide**. Elle est retirée
automatiquement. Et si cette deuxième fiche n'est pas vide — parce qu'il s'en est servi pour de vrai
—, le changement est **refusé en disant ce qui bloque** (« … qui a des données (enveloppes) »),
plutôt que de mélanger deux comptes.

**Désactiver** coupe l'accès sans rien supprimer : la personne ne peut plus se connecter ni être
choisie dans une liste, mais son nom reste sur ses anciennes inscriptions, et c'est réversible d'un
clic. Impossible de se désactiver soi-même, ni de désactiver un superadmin.

Essayé sur la copie, de bout en bout : un membre renommé retrouve ses 28 inscriptions, sa
collection et ses 14 enveloppes ; une fois désactivé, il ne lit plus rien du tout — vérifié en
tapant directement à la base, pas seulement à l'écran.

## L'étape 4 a été jouée (20 septembre)

**Les adresses recopiées sont retirées de la base.** C'est l'étape qui rend le reste possible :
l'adresse d'un membre n'existe plus qu'à un seul endroit, sa fiche.

Elle a été **refusée au premier essai**, et c'est une bonne nouvelle : le script est fait d'un seul
bloc, il a buté sur un obstacle imprévu et a tout annulé — rien n'a été modifié. L'obstacle : une
copie d'un tableau de détail rangée dans un coin de la base que ni l'inventaire ni la copie d'essai
ne regardaient. Corrigé en posant la question à la base elle-même plutôt qu'à ma liste, puis rejoué :
tout est passé, et les comptes de lignes sont rigoureusement identiques avant et après (913 lignes
de collection, 5 606 inscriptions, 673 annonces vues…).

## L'étape 4 était prête (19 septembre)

**Retirer les adresses recopiées.** C'est l'étape qui donne son sens à tout le reste : une fois
qu'aucun écran ne s'en sert, les copies d'adresses disparaissent de la base, et il ne reste qu'un
seul endroit où l'adresse d'un membre est écrite — sa fiche.

Ce qui reste, volontairement : **l'adresse de connexion** sur la fiche, bien sûr, et les traces
« modifié par », « bloqué par », « traité par », qui gardent l'adresse au moment de l'action.
Les treize demandes importées de mars gardent aussi leur mention « Import Google Sheet ».

**Deux choses ont été vérifiées avant de proposer cette étape** :

- **on peut revenir en arrière.** Le plan disait le contraire (« c'est la dernière, plus de
  retour »). En fait si : le numéro d'un membre ne changeant jamais, les adresses se recalculent
  à partir de sa fiche. L'essai sur la copie fait l'aller-retour et compare : tout revient
  **identique**, jusqu'au moindre détail de structure.
- **plus aucun écran ne lit d'adresse.** Les vérifications des onze écrans ont été rejouées sur
  une copie **où les colonnes ont vraiment été supprimées** : 80 vérifications, toutes vertes.
  Tant que les colonnes existaient, une vérification verte ne prouvait rien — la base remplissait
  les deux.

*(Elle a été jouée le lendemain — voir plus haut.)*

**Trouvé au passage, sans rapport avec ce chantier** : l'envoi d'une annonce à des personnes
nommées, développé en juin, n'a jamais été activé en base — l'écran s'en aperçoit et grise
proprement l'option. Rien n'est cassé ; la fonctionnalité, elle, n'existe pas en ligne. À décider
séparément.

### Deux points tranchés en cours de route

1. **Deux inscriptions n'appartenaient à personne.** Leur « membre » était le texte « pour 2024 », un
   reste de l'import de mars (deux billets de 2024, jamais payés ni envoyés). Impossible de leur donner
   un numéro : **Cyril a décidé de les supprimer.**
2. **Une erreur corrigée dans l'analyse.** Elle prévoyait, quand on supprime un membre, de garder ses
   annonces personnelles en effaçant leur destinataire. Or une annonce sans destinataire est montrée à
   **tout le monde** : un message privé (un complément de paiement, par exemple) serait devenu public.
   Ses annonces personnelles partent donc avec lui.

### Ce qui a changé pour les admins avec l'étape 1

**Supprimer un membre qui a des données devient impossible** : la base le refuse, et Gestion Membres
dit ce qui bloque (« ce membre a encore des données : enveloppes »). C'est voulu — c'est comme cela
que des adresses fantômes sont nées. Le bouton « Désactiver », qui remplacera la suppression dans ce
cas, arrive avec la dernière étape. D'ici là, on ne supprime que les fiches vides, comme une demande
d'accès restée sans suite.

## Ce qui a changé le 14 septembre

Ce document a été **réécrit le 14 septembre**. La version précédente proposait de faire suivre
l'adresse d'un membre partout où elle est recopiée. **Cyril a choisi une autre voie** : donner à chaque
membre **un numéro**, utilisé partout à la place de son adresse. Il n'y a plus d'urgence, et cette
organisation simplifie et limite les erreurs.

Ce qui avait déjà été décidé reste valable :

- supprimer un membre qui a des données le **désactive** au lieu de l'effacer ;
- **tous les admins** peuvent changer une adresse ;
- le membre **n'est pas prévenu** ;
- **pas de fusion** de deux comptes qui ont chacun des données.

## De quoi il s'agit

De temps en temps, un membre n'arrive plus à se connecter avec son adresse email. Il s'en crée une
nouvelle, revient sur le site... et **ne retrouve rien**. Pour l'application, la personne avec la
nouvelle adresse est **quelqu'un d'autre**. C'est arrivé le 9 septembre : dix ans d'historique dormaient
sous l'ancienne adresse.

La raison : **dans l'application, l'adresse email est l'identité du membre.** Elle est recopiée sur
chaque inscription, chaque billet de sa collection, chaque enveloppe, chaque commentaire — une
vingtaine d'endroits. Changer d'adresse, c'est aujourd'hui les retrouver tous, à la main. En 2024, un
changement fait ainsi en avait oublié un : six enveloppes sont restées au nom de l'ancienne adresse.

## Ce qui est proposé

**Chaque membre reçoit un numéro qui ne change jamais.** Partout où l'application note aujourd'hui
« cette inscription est à telle adresse », elle notera « cette inscription est au membre n° 42 ».
L'adresse ne servira plus qu'à une chose : **reconnaître le membre quand il se connecte avec Google.**

Et changer d'adresse devient trivial : on corrige **l'adresse sur la fiche du membre n° 42**, et
c'est tout. Tout le reste pointe vers le numéro, qui n'a pas bougé. Plus rien à retrouver, plus rien à
oublier.

### Comment ça se passera, pour Marie, admin

Paul s'est créé un deuxième compte avec sa nouvelle adresse Google. Marie ouvre la fiche de Paul dans
Gestion Membres et clique **« Changer l'adresse »**. Elle saisit la nouvelle adresse.

L'application voit que cette adresse a **déjà une fiche** — celle que Paul a créée en se connectant, et
qui est vide. Elle le dit à Marie, **retire la fiche vide**, et met la nouvelle adresse sur la vraie
fiche de Paul. Paul se reconnecte avec sa nouvelle adresse et **retrouve tout**.

Si la fiche de la nouvelle adresse contenait de vraies données — des inscriptions, une collection —,
l'application **refuserait** et dirait ce qui bloque : ce serait une fusion de deux comptes, qui n'est
pas au programme.

## Trois choses qu'on a trouvées en préparant

1. **Le deuxième compte existe presque toujours.** Quand quelqu'un se connecte avec une adresse
   inconnue, le site lui crée une fiche « en attente ». Le membre qui a changé d'adresse a donc déjà une
   fiche vide à la nouvelle adresse. C'est pour ça que l'application doit savoir la retirer, comme dans
   l'exemple de Paul.
2. **L'assistant n'est pas un membre.** Il signe ses réponses dans les fiches des demandes, mais n'a
   pas de fiche. Avec des numéros, il lui en faudra un (question 2).
3. **Certaines « adresses » n'en sont pas.** Les demandes importées d'un ancien tableau portent le nom
   « Import Google Sheet » ; et une quinzaine d'adresses fantômes appartiennent à des membres supprimés
   par le passé. On ne peut pas leur donner un numéro telles quelles (question 3).

## Le prix, et comment on le paie

Le numéro de membre est la bonne organisation, mais il touche **presque tout le site** : plus de
300 endroits dans 17 fichiers, dont une centaine dans « Mes collectes », et la plupart des règles qui
décident qui a le droit de voir quoi.

Pour ne pas tout risquer le même jour, on propose d'avancer **par petites étapes**, chacune essayée
d'abord sur la copie de test du site, puis vérifiée en production, et qu'on peut défaire si quelque
chose cloche :

1. **Préparer** : régler les adresses fantômes et le cas de l'assistant. Rien de visible.
2. **Ajouter les numéros** à côté des adresses, sans rien retirer. Rien de visible.
3. **Faire passer les règles d'accès** par les numéros. Rien de visible si tout va bien.
4. **Reprendre les écrans un par un**, du plus simple au plus gros (« Mes collectes » en dernier).
5. **Retirer les adresses recopiées**, une fois que plus rien ne s'en sert.
6. **Ajouter le bouton** « Changer l'adresse », la désactivation et la réactivation dans Gestion
   Membres.

C'est plus long qu'un grand jour J, mais une erreur ne touche qu'un écran à la fois, et se voit tout de
suite.

## Ce que l'application ne fera PAS

- **Fusionner deux comptes qui ont chacun des données.**
- **Laisser un membre changer son adresse lui-même** : c'est une opération d'admin.
- **Toucher à l'adresse PayPal d'un collecteur** ni aux adresses de ses contacts : ce ne sont pas des
  membres.
- **Prévenir le membre** du changement.

## Ce sur quoi on vous demandait de vous prononcer

**Validé le 15 septembre : les quatre recommandations sont retenues.**

1. **Avancer par petites étapes** plutôt que tout faire le même jour ? On le recommande.
2. **L'assistant** : lui créer une fiche de membre « technique », désactivée et sans aucun droit, pour
   qu'il garde un numéro comme tout le monde ? On le recommande.
3. **Les adresses fantômes** : leur créer des fiches **désactivées** — comme pour un membre qu'on ne
   peut plus supprimer —, plutôt que d'effacer ce qui leur appartient ? On le recommande : rien ne se
   perd.
4. **Les traces** « modifié par », « bloqué par », « traité par » : elles gardent l'adresse de la
   personne au moment de l'action. Après un changement d'adresse, l'ancienne y resterait. Acceptable
   pour un historique ? On le pense.

Une remarque reste bienvenue : laissez un commentaire sur la fiche, vous aurez une réponse disant ce
qui en a été fait.
