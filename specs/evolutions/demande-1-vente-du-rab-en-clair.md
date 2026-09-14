# Demande #1 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `d416754` (14/09/2026).

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

**Le point important, qui ne change pas** : personne ne se voit attribuer une somme à payer sans
l'avoir voulu. Avant, ce geste était « j'accepte la vente » ; maintenant, c'est « je demande à
acheter ».

## Ce qui a été décidé, et pourquoi

| Décision | La raison |
|---|---|
| **Le rab est mis en vente dans l'application** | C'est ce que décrit Jean-Philippe : le collecteur n'a plus à se souvenir de qui a répondu quoi sur Facebook. |
| **Le membre demande, le collecteur valide** | Le collecteur est le seul à savoir s'il a encore le billet. Et le membre a fait le premier geste : rien n'entre dans ce qu'il doit sans qu'il l'ait voulu. |
| **Un billet demandé est réservé** | Deux personnes ne peuvent pas acheter le même n° 00042. La première demande l'emporte ; la seconde voit « déjà demandé ». |
| **Le numéro de série reste facultatif** | Le collecteur vend tantôt « 2 billets du rab » sans précision, tantôt « le billet n° 00042 ». Les deux doivent marcher. |
| **La vente s'affiche à part** | Le membre voit une ligne « Vente du rab — billet n° 00042 : 8,00 € » dans ce qu'il doit. Aucun risque de lui facturer en plus le prix de la collecte. |
| **Le règlement suit le chemin habituel** | Déclarer, puis validation par le collecteur : exactement ce que tout le monde connaît déjà. Rien de nouveau à apprendre. |

## Ce que l'application ne fera PAS

- **Elle ne négocie pas.** Le prix est celui que le collecteur affiche. Pour le baisser, il le
  modifie tant que personne n'a demandé le billet.
- **Elle ne relance pas** un collecteur qui tarde à répondre, ni un membre qui tarde à payer.
- **Elle ne vend pas directement à un membre sans passer par la mise en vente** — sauf si
  Jean-Philippe nous dit qu'il le voulait aussi (question 1 plus bas).
- **Elle ne gère pas les ventes entre deux membres ordinaires** — c'est la demande #22.
- **Elle ne reprend pas les ventes passées.**

## Un cas qui n'est pas encore réglé

Marie était **déjà inscrite** à cette collecte, et **ses billets lui ont déjà été envoyés**. Le
billet du rab ne peut pas rejoindre une enveloppe déjà partie.

Trois possibilités : refuser la demande avec un message clair ; noter l'argent dans l'application
mais laisser l'envoi se faire à la main ; ou permettre un second envoi pour la même collecte, de
loin le plus lourd. Tout dépend de la fréquence : **est-ce que ça arrive, chez vous, qu'un membre
déjà servi achète du rab ?**

En regardant ce cas de près, on a aussi découvert que la version du 10/09 **n'aurait pas marché**
pour un membre déjà inscrit à la collecte, même avant l'envoi. C'est corrigé : son billet du rab
part simplement avec ses autres billets.

## Et la demande #22 ?

La version du 10/09 disait que cette demande devait attendre la première brique de #22. **Ce n'est
plus vrai** : pour l'argent, la vente du rab n'a besoin que de ce qui existe déjà pour les collectes.

En revanche, **la mise en vente que décrit Jean-Philippe, c'est exactement ce que #22 prévoit pour
ses annonces** : mettre un billet en vente, quelqu'un qui dit « ça m'intéresse », le vendeur qui
accepte. La construire deux fois — une pour le rab, une pour les doubles des membres — serait une
erreur.

La recommandation : **construire la mise en vente d'abord pour le rab des collecteurs**, le cas le
plus simple, en la pensant dès le départ pour qu'elle serve ensuite aux annonces de #22. C'est à
Cyril de décider de l'ordre des travaux.

## Ce qui reste à trancher

1. **Pour Jean-Philippe — la question qui compte.** Vous avez gardé « JP enregistre la vente depuis
   Mes collectes : pour Marie ». On l'a comprise comme **la validation de la demande de Marie**.
   Faut-il **aussi** que le collecteur puisse enregistrer directement une vente conclue sur
   Facebook, sans mise en vente ? On le déconseille : ça ramènerait le « j'accepte / je refuse »
   côté membre.
2. **Pour Jean-Philippe, sans urgence.** Le numéro de chaque billet : obligatoire, ou facultatif pour
   les billets dont le collecteur n'a pas noté le numéro ? On le garde facultatif.
3. **Pour Cyril.** L'ordre des travaux entre cette demande et #22 (voir juste au-dessus).
4. **Pour tous.** Le membre déjà servi (voir « Un cas qui n'est pas encore réglé »).
5. **Pour tous.** Qui voit le rab, et où ? Proposition : **tous les membres**, sur la page du
   billet — le rab va souvent à ceux qui ne se sont pas inscrits à temps.

## Ce sur quoi on vous demande de vous prononcer

- Est-ce que **le parcours réécrit d'après Jean-Philippe** correspond à la façon dont vous vendez, ou
  vendriez, votre rab ?
- **Réserver un billet dès qu'il est demandé**, jusqu'à la réponse du collecteur : ça vous va ?
- Est-ce que **ce que l'application ne fera pas** vous convient ?

**Mieux vaut attendre la réponse de Jean-Philippe à la question 1, et celle de Cyril à la
question 3, avant de valider** : une seule validation fait passer la demande en « Prêt à dev ». Si
leurs réponses changent ce qui est prévu, ce document sera repris. Vos remarques sont bienvenues dès
maintenant : laissez un commentaire, vous aurez une réponse disant ce qui en a été fait.
