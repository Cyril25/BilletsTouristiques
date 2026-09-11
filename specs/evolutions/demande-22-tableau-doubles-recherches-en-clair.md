# Demande #22 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document) — vous n'avez pas
> besoin de la lire pour valider.
> Reflète la version technique du commit `1def716` (11/09/2026).

## Ce qui a changé depuis la version du 10/09

Jean-Philippe a réécrit le parcours de l'exemple. Sa version est reprise plus bas presque mot pour
mot, et elle change quatre choses :

- un échange peut se faire contre **un ou plusieurs billets** ;
- l'acheteur **paie d'abord**, le vendeur **envoie ensuite** ;
- le vendeur peut **regrouper plusieurs billets dans la même enveloppe**, et l'acheteur **confirme
  l'enveloppe** ;
- au départ, le double est **mis dans l'application**, en disant s'il est cédé contre de l'argent
  ou contre un billet.

Avec Cyril, on a aussi décidé qu'un échange **peut être complété d'une somme**.

## De quoi il s'agit

Aujourd'hui, quand deux membres veulent s'échanger ou se vendre un billet, **tout se passe sur
Facebook** : on se met d'accord dans les commentaires, on s'envoie l'argent, on poste le billet, et
plus rien n'en garde la trace. Si quelqu'un oublie de payer ou d'envoyer, personne ne s'en aperçoit.

L'idée est que **l'application tienne les comptes** : qui a vendu ou échangé quoi à qui, qui doit
combien à qui, et qui a confirmé avoir bien reçu.

**L'application n'encaisse aucun argent** et **ne tranche aucun litige**. Elle enregistre, c'est tout.

## Ce que ça changera concrètement

Marie a un billet en double. Jean-Philippe le cherche. Ils se mettent d'accord : soit sur **un
prix** — disons **6 €, port compris** —, soit sur **un échange** contre un ou plusieurs billets de
Jean-Philippe.

1. **Marie enregistre l'accord** dans l'application : ce qu'elle donne, et ce que JP donne en
   retour.
2. **JP accepte.** Les 6 € apparaissent aussitôt dans son « vous devez » du menu, à côté de ce
   qu'il doit déjà aux collecteurs. **Un seul chiffre, tout compris.**
3. **JP indique qu'il a payé.** Quand l'argent arrive, **Marie confirme l'avoir reçu**.
4. **Marie poste le billet** — avec d'autres billets si elle en a d'autres pour JP — et l'indique
   dans l'application.
5. Quand l'enveloppe arrive, **JP confirme l'avoir reçue** : un seul geste pour tout ce qu'elle
   contient. C'est déjà comme ça que ça se passe pour les enveloppes des collectes.
6. Les deux ayant confirmé, l'échange est **terminé**. Il rejoint l'historique des deux, et leur
   compteur « transactions conclues » avance d'une unité.

Si l'un des deux ne confirme jamais, **la transaction reste simplement ouverte**. Les deux la
voient, personne d'autre. L'application ne relance pas, n'accuse personne et ne ferme rien d'office.

**Payer d'abord, envoyer ensuite** : c'est l'ordre habituel, et c'est celui que l'écran
présentera. Mais l'application **ne l'imposera pas** : un vendeur qui fait confiance peut envoyer
d'abord, et dans un échange, les deux envoient en même temps.

### Un échange fonctionne exactement pareil

Marie donne son billet. JP donne deux billets, et ajoute 2 € pour équilibrer. Marie confirme avoir
reçu les 2 €, chacun poste son enveloppe, chacun confirme avoir reçu celle de l'autre : c'est
terminé.

**C'est la découverte qui a débloqué le dossier** : un échange n'est pas un mécanisme à part.
Chacun remet quelque chose — des billets, de l'argent, ou les deux — et celui qui reçoit confirme.

## Ce qui a été décidé, et pourquoi

| Décision | La raison |
|---|---|
| **Celui qui reçoit confirme**, des deux côtés | C'est ce qui fait qu'un échange marche comme une vente, sans rien inventer de plus. |
| **Plusieurs billets**, d'un côté comme de l'autre | Jean-Philippe l'a signalé : un échange se fait souvent contre un ou plusieurs billets. |
| **Un échange peut être complété d'une somme** | « Mon billet contre tes deux, plus 2 € » : ça ne coûte rien de plus à l'application, autant ne pas l'interdire. |
| **On confirme l'enveloppe, pas chaque billet** | C'est ce que vous faites déjà pour les collectes. Une enveloppe peut contenir les billets de plusieurs échanges avec la même personne. |
| **Payer puis envoyer : proposé, pas imposé** | L'imposer bloquerait un vendeur qui fait confiance, et n'aurait pas de sens pour un échange. |
| **Le détail reste privé** entre les deux personnes concernées (et les admins) | C'est de l'argent entre particuliers. Personne d'autre n'a à savoir qui a acheté quoi à qui. |
| **Un compteur public** « 12 transactions conclues » par membre | Savoir à qui on a affaire, **sans note ni avis** : juste combien d'échanges cette personne a menés à bout. |
| **Un seul total** dans le menu | Un membre se demande « combien je dois », pas « combien je dois à qui ». |
| **L'application n'arbitre pas** | Si quelqu'un dit avoir payé et que l'autre ne confirme pas, l'affaire reste ouverte. Sinon, ce sont les 6 admins bénévoles qui deviendraient juges. |

## Ce que l'application ne fera PAS

C'est important pour votre validation : **si l'un de ces points vous paraît devoir changer,
dites-le maintenant.**

- **Elle n'encaisse pas.** Le paiement se fait comme aujourd'hui, entre les deux personnes, par le
  moyen qu'elles veulent. L'application note seulement qu'il a eu lieu.
- **Elle n'arbitre pas.** En cas de désaccord, elle laisse l'affaire ouverte.
- **Elle ne note personne.** Pas d'étoiles, pas d'avis. Juste le nombre d'échanges menés à bout.
- **Elle ne calcule pas les frais de port.** Le port est compris dans la somme dont vous convenez :
  6 € plus 1,50 € de port, on enregistre 7,50 €.
- **Elle ne suit pas le colis.** On saura que l'enveloppe est partie et qu'elle est arrivée, mais
  sans numéro de suivi. Et on confirme l'enveloppe entière : s'il manque un billet, on ne confirme
  pas, et on s'arrange entre soi.
- **Elle ne relance pas** quelqu'un qui traîne à payer. Jean-Philippe a gardé cette phrase telle
  quelle : on la considère comme acquise, sauf avis contraire.

## En combien de fois

**1. Les transactions** *(en premier)*
Enregistrer une vente ou un échange conclu ailleurs — sur Facebook, par message — comme tous ceux
d'aujourd'hui ; suivre qui doit quoi ; confirmer les paiements et les enveloppes ; consulter son
historique.
*Pourquoi en premier :* c'est la fondation, et elle sert aussi à la demande #1 (la vente du rab
d'une collecte par son collecteur).

**2. Les annonces**
C'est là que Marie pourra **« mettre son double dans l'application »**, comme le décrit
Jean-Philippe, en disant si elle le cède **contre de l'argent, contre un échange, ou les deux**. Et
surtout : **l'application vous préviendra quand ce que vous avez en double est justement ce qu'un
autre recherche.** C'est la seule chose que Facebook ne sait pas faire.
*Pourquoi pas dès le premier lot :* le premier lot sert déjà à tous les échanges qui se concluent
aujourd'hui sur Facebook, et le garder court évite de retarder la vente du rab (#1).

**3. Ouvrir « Ma collection » à tous les membres** *(indépendant)*
La page existe mais n'est visible que des admins. L'ouvrir permettrait un jour de publier ses
doubles en un clic. Ce lot ne bloque rien : aujourd'hui, **aucun membre n'a déclaré le moindre
double** dans l'application, donc mieux vaut ne pas attendre après lui.

## Ce qui reste à trancher

1. **Pour Jean-Philippe — la seule question qui bloque.** Les « autres billets » que Marie glisse
   dans l'enveloppe pour JP, ce sont les billets **d'autres ventes ou échanges** entre eux deux ?
   Ou aussi les billets **d'une collecte** que Marie organise et à laquelle JP est inscrit — le
   double partant alors dans l'enveloppe de la collecte ? La réponse change beaucoup le travail :
   dans le second cas, il faut toucher aux enveloppes des collectes, qui sont le cœur de
   « Mes collectes ».
2. **Peut-on annuler une transaction déjà acceptée** tout seul, ou faut-il l'accord des deux ?

## Ce sur quoi on vous demande de vous prononcer

- Est-ce que **le parcours réécrit d'après Jean-Philippe** correspond à ce que vous feriez, vous,
  pour vendre ou échanger un billet ?
- **Les frais de port compris dans la somme convenue** : ça vous va, ou faut-il les distinguer ?
- Est-ce que **ce que l'application ne fera pas** vous convient ?
- Est-ce qu'il **manque quelque chose** d'évident pour quelqu'un qui pratique l'échange ?

**La validation n'est pas encore ouverte** : la demande attend la réponse de Jean-Philippe à la
question 1 ci-dessus, puis repassera en « Analyse à valider ». Vos remarques sont bienvenues dès
maintenant : laissez un commentaire, vous aurez une réponse disant ce qui en a été fait.
