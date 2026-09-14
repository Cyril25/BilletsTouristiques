# Demande #1 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `c0cc8a9` (14/09/2026, après les décisions de Cyril).

## Ce qui a changé depuis la version du 10/09

Jean-Philippe a réécrit le parcours de l'exemple. Sa version est reprise plus bas presque mot pour
mot, et elle change trois choses :

- le collecteur **met son rab en vente dans l'application**, billet par billet, avec le numéro de
  chaque billet et son prix — ou un même prix pour tous ;
- c'est **le membre qui demande** à acheter, au prix affiché ;
- c'est **le collecteur qui valide** qu'il a encore le billet — et c'est seulement là que la somme
  apparaît chez le membre.

Avant, c'était l'inverse : le collecteur enregistrait une vente conclue sur Facebook, et le membre
devait l'accepter.

**Et depuis ce matin**, Jean-Philippe a répondu aux questions qu'on lui posait :

- le numéro de série reste **facultatif** ;
- un membre **déjà servi** achète bien du rab, pour un numéro spécial — ce qui change la façon dont
  le billet part (voir « Le membre déjà servi — réglé ») ;
- quand il s'est **déjà mis d'accord avec Marie sur Facebook**, il doit pouvoir **lui attribuer
  directement** le billet, **sans que Marie ait quoi que ce soit à faire**.

Ce second point revient sur une règle qu'on croyait suivre — et qui, vérification faite, n'existait
pas. C'est expliqué plus bas, dans « Une règle qu'on croyait suivre ».

## De quoi il s'agit

Quand une collecte se termine, il reste souvent des billets sur les bras du collecteur — **le
« rab »**. Aujourd'hui il les revend sur Facebook : quelqu'un se manifeste, ils conviennent d'un
prix, et **plus rien n'en garde la trace**. Le collecteur doit se souvenir tout seul de qui lui
doit combien et à qui il doit envoyer quoi. Les commentaires des anciennes collectes en portent la
marque : « voir JP pour le rab », « inscriptions closes, voir René ».

Il y a aussi le cas des **numéros spéciaux** : un billet qui porte un joli numéro de série, vendu à
un prix fixé pour ce numéro-là.

L'idée : le collecteur **met son rab en vente dans l'application**, un membre le **demande**, **le
billet part dans l'enveloppe habituelle**, et l'argent suit le même chemin que le reste — le membre
déclare avoir payé, le collecteur confirme.

## Ce que ça changera concrètement

Jean-Philippe a 3 billets en trop d'une collecte terminée.

1. **JP les met en vente sur le site**, avec le numéro de chaque billet et son prix. Il peut fixer
   le prix billet par billet, selon le numéro, ou choisir le même prix pour les trois.
2. **Marie voit le rab.** Le prix proposé par JP lui convient : elle **demande à acheter** le
   n° 00042, à 8 €. Plus personne d'autre ne peut demander ce billet-là. JP est prévenu.
3. **JP reçoit la demande de Marie et valide qu'il a encore le billet.** Une fois validé, les 8 €
   apparaissent chez Marie, dans ce qu'elle doit à JP. **Avant cette validation, rien
   n'apparaît.**
4. Marie indique qu'elle a payé ; **JP valide le paiement** et **met le billet dans l'enveloppe de
   Marie**.
5. L'envoi se fait avec ses autres billets et **rejoint le processus habituel d'envoi**.

Si JP n'a plus le billet, il le dit : le billet sort de la vente et Marie est prévenue. Tant que JP
n'a pas répondu, Marie peut retirer sa demande, et le billet redevient disponible pour les autres.
L'application ne relance personne.

### Quand l'accord est déjà conclu sur Facebook

JP a proposé le **n° 1000 à 5 €** à Marie sur Facebook, et elle a dit oui.

1. **JP attribue le billet à Marie** depuis « Mes collectes » — qu'il l'ait déjà mis en vente ou
   non.
2. Les 5 € apparaissent aussitôt dans ce que Marie doit à JP. **Marie n'a rien à faire** : elle
   reçoit simplement une notification.
3. La suite est la même : paiement, puis enveloppe.

Si JP s'est trompé de personne, il **annule la vente** tant qu'elle n'est pas payée — comme il peut
aujourd'hui désinscrire quelqu'un d'une collecte.

## Une règle qu'on croyait suivre

Les versions précédentes de ce document disaient : **« aujourd'hui, aucun montant n'apparaît chez
un membre sans qu'il se soit inscrit lui-même, et on ne veut pas créer d'exception »**. C'est sur
cette phrase que la décision « le membre doit accepter » avait été prise avec Cyril, le 9 septembre.

**Elle est fausse.** Dans « Mes collectes », un collecteur peut déjà **inscrire un membre** à sa
collecte : la somme apparaît chez ce membre sans qu'il ait rien fait.

Ce que demande Jean-Philippe pour le rab, un collecteur le fait donc déjà pour une collecte. La
recommandation est de **faire pareil pour le rab**, plutôt que de lui imposer une règle que le reste
de l'application ne suit pas. Comme ça revient sur une décision prise avec Cyril, c'était à lui de
confirmer — **c'est fait** : « pour l'attribution directe, je suis ce que préconise JP ».

Entre deux membres ordinaires (demande #22), rien ne change : là, personne n'a d'autorité sur
l'autre, et l'acceptation reste le seul garde-fou.

## Ce qui a été décidé, et pourquoi

| Décision | La raison |
|---|---|
| **Le rab est mis en vente dans l'application** | C'est ce que décrit Jean-Philippe : le collecteur n'a plus à se souvenir de qui a répondu quoi sur Facebook. |
| **Le membre demande, le collecteur valide** | Le collecteur est le seul à savoir s'il a encore le billet. Et le membre a fait le premier geste. |
| **Le collecteur peut aussi attribuer directement** *(confirmé par Cyril)* | Pour les accords conclus sur Facebook, comme le demande Jean-Philippe. C'est ce qu'un collecteur fait déjà quand il inscrit un membre à sa collecte. |
| **Un billet demandé est réservé** | Deux personnes ne peuvent pas acheter le même n° 00042. La première demande l'emporte ; la seconde voit « déjà demandé ». |
| **Le numéro de série reste facultatif** | Le collecteur vend tantôt « 2 billets du rab » sans précision, tantôt « le billet n° 00042 ». Les deux doivent marcher. |
| **La vente s'affiche à part** | Le membre voit une ligne « Vente du rab — billet n° 00042 : 8,00 € » dans ce qu'il doit. Aucun risque de lui facturer en plus le prix de la collecte. |
| **Le règlement suit le chemin habituel** | Déclarer, puis validation par le collecteur : exactement ce que tout le monde connaît déjà. Rien de nouveau à apprendre. |

## Ce que l'application ne fera PAS

- **Elle ne négocie pas.** Le prix est celui que le collecteur affiche. Pour le baisser, il le
  modifie tant que personne n'a demandé le billet.
- **Elle ne relance pas** un collecteur qui tarde à répondre, ni un membre qui tarde à payer.
- **Elle n'a pas de système de vente à part** : même attribué directement, le billet passe par la
  liste du rab de la collecte. Jean-Philippe l'a confirmé.
- **Elle ne gère pas les ventes entre deux membres ordinaires** — c'est la demande #22.
- **Elle ne reprend pas les ventes passées.**

## Le membre déjà servi — réglé

Marie était **déjà inscrite** à cette collecte, et **ses billets lui ont déjà été envoyés**. Elle
veut ensuite un numéro spécial du rab. Est-ce que ça arrive ? **Oui**, a répondu Jean-Philippe :
« si c'est un numéro spécial ».

Les versions précédentes faisaient voyager le billet du rab « accroché » à l'inscription de Marie
sur la collecte. Dans ce cas-là, ça ne marche pas : son inscription a déjà voyagé, elle ne peut pas
repartir. Et les numéros spéciaux, c'est la moitié du titre de la demande.

**Ce qui est retenu** : le billet du rab va **directement dans l'enveloppe en cours** de Marie chez
JP, celle où s'accumulent ses prochains billets — qu'elle ait déjà été servie ou non. Il part avec
elle, et quand Marie confirme la réception de l'enveloppe, le billet du rab est reçu avec le reste.
Les frais de port de l'enveloppe le comptent, comme n'importe quel billet.

C'est plus de travail côté « Mes collectes », qui doit apprendre qu'une enveloppe peut contenir
autre chose que des inscriptions. Mais c'est une seule règle pour tous les cas, et un oubli se verra
à l'écran au lieu de se cacher dans un montant.

## Et la demande #22 ?

La version du 10/09 disait que cette demande devait attendre la première brique de #22. **Ce n'est
plus vrai** : pour l'argent, la vente du rab n'a besoin que de ce qui existe déjà pour les collectes.

En revanche, **la mise en vente que décrit Jean-Philippe, c'est exactement ce que #22 prévoit pour
ses annonces** : mettre un billet en vente, quelqu'un qui dit « ça m'intéresse », le vendeur qui
accepte. La construire deux fois — une pour le rab, une pour les doubles des membres — serait une
erreur.

La recommandation : **construire la mise en vente d'abord pour le rab des collecteurs**, le cas le
plus simple, en la pensant dès le départ pour qu'elle serve ensuite aux annonces de #22. **Cyril a
retenu cette proposition.** Cette demande n'attend donc plus rien de #22 ; ce sont les annonces de
#22 qui viendront après, en s'appuyant sur ce que celle-ci aura construit.

## Ce qui reste à trancher

Les trois questions posées à Jean-Philippe ont leur réponse : le numéro reste facultatif, il veut
pouvoir attribuer directement un billet, et le membre déjà servi est un cas réel, désormais réglé
(voir plus haut). Et Cyril a tranché ses deux questions : l'attribution directe est retenue, et
la mise en vente sera construite d'abord pour le rab.

**Il ne reste qu'un point, qui peut attendre le développement** : qui voit le rab, et où ?
Proposition : **tous les membres**, sur la page du billet — le rab va souvent à ceux qui ne se sont
pas inscrits à temps.

## Ce sur quoi on vous demande de vous prononcer

- Est-ce que **le parcours réécrit d'après Jean-Philippe** correspond à la façon dont vous vendez, ou
  vendriez, votre rab ?
- **Réserver un billet dès qu'il est demandé**, jusqu'à la réponse du collecteur : ça vous va ?
- **L'attribution directe par le collecteur, sans action du membre** : vous paraît-elle normale,
  sachant qu'un collecteur peut déjà inscrire un membre à sa collecte ?
- Est-ce que **ce que l'application ne fera pas** vous convient ?

**L'analyse est complète et peut être validée.** Si tout vous va, cochez « J'ai lu et je valide
l'analyse » sur la fiche : une seule validation fait passer la demande en « Prêt à dev ». Sinon,
laissez un commentaire : vous aurez une réponse disant ce qui en a été fait.
