# Demande #22 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document) — vous n'avez pas
> besoin de la lire pour valider.
>
> *Reflète la version technique du commit `b771672` (10/09/2026).*

## De quoi il s'agit

Aujourd'hui, quand deux membres veulent s'échanger ou se vendre un billet, **tout se passe sur
Facebook** : on se met d'accord dans les commentaires, on s'envoie l'argent, on poste le billet, et
plus rien n'en garde la trace. Si quelqu'un oublie de payer ou d'envoyer, personne ne s'en aperçoit.

L'idée est que **l'application tienne les comptes** : qui a vendu ou échangé quoi à qui, qui doit
combien à qui, et qui a confirmé avoir bien reçu.

**L'application n'encaisse aucun argent** et **ne tranche aucun litige**. Elle enregistre, c'est tout.

## Ce que ça changera concrètement

Marie a un billet en double. Jean-Philippe le cherche. Ils se sont mis d'accord à **6 €**.

1. **Marie enregistre l'accord** dans l'application : elle donne le billet, JP donne 6 €.
2. **JP accepte.** Les 6 € apparaissent aussitôt dans son « vous devez » du menu, à côté de ce
   qu'il doit déjà aux collecteurs. **Un seul chiffre, tout compris.**
3. **Marie indique qu'elle a posté le billet.** Quand il arrive, **JP confirme l'avoir reçu**.
4. **JP indique qu'il a payé.** Quand l'argent arrive, **Marie confirme l'avoir reçu**.
5. Les deux ayant confirmé, l'échange est **terminé**. Il rejoint l'historique des deux, et leur
   compteur « transactions conclues » avance d'une unité.

Si l'un des deux ne confirme jamais, **la transaction reste simplement ouverte**. Les deux la
voient, personne d'autre. L'application ne relance pas, n'accuse personne et ne ferme rien d'office.

### Un échange sans argent fonctionne exactement pareil

Marie donne un billet, JP donne un autre billet. Chacun confirme avoir reçu celui de l'autre, et
c'est terminé. **C'est la découverte qui a débloqué le dossier** : on croyait qu'un troc demandait
un mécanisme entièrement différent d'une vente. En réalité c'est la même chose — chacun remet
quelque chose, et celui qui reçoit confirme. Dans une vente, il se trouve simplement que ce que
l'un remet, c'est de l'argent.

## Ce qui a été décidé, et pourquoi

| Décision | La raison |
|---|---|
| **Celui qui reçoit confirme**, des deux côtés | C'est ce qui fait qu'un échange marche comme une vente, sans rien inventer de plus. |
| **Le détail reste privé** entre les deux personnes concernées (et les admins) | C'est de l'argent entre particuliers. Personne d'autre n'a à savoir qui a acheté quoi à qui. |
| **Un compteur public** « 12 transactions conclues » par membre | Permet de savoir à qui on a affaire, **sans note ni avis** : juste un fait, combien d'échanges cette personne a menés à bout. |
| **Un seul total** dans le menu | Un membre se demande « combien je dois », pas « combien je dois à qui ». Ce qu'il doit aux collecteurs et aux autres membres s'additionnent. |
| **L'application n'arbitre pas** | Si quelqu'un dit avoir payé et que l'autre ne confirme pas, l'affaire reste ouverte. Sans ça, ce sont les 6 admins bénévoles qui deviendraient juges — ce dont personne ne veut. |
| **Les transactions d'abord**, les annonces ensuite | Voir « En combien de fois » ci-dessous. |

## Ce que l'application ne fera PAS

C'est important pour votre validation : **si l'un de ces points vous paraît devoir changer,
dites-le maintenant.**

- **Elle n'encaisse pas.** Le paiement se fait comme aujourd'hui, entre les deux personnes, par le
  moyen qu'elles veulent. L'application note seulement qu'il a eu lieu.
- **Elle n'arbitre pas.** En cas de désaccord, elle laisse l'affaire ouverte et n'envoie personne
  au tribunal.
- **Elle ne note personne.** Pas d'étoiles, pas d'avis, pas de commentaire sur la personne. Juste
  le nombre d'échanges menés à bout.
- **Elle ne suit pas le colis.** On saura que l'un a dit « envoyé » et que l'autre a dit « reçu »,
  mais il n'y aura pas de numéro de suivi ni de gestion d'enveloppes comme pour les collectes.
- **Elle ne relance pas** automatiquement quelqu'un qui traîne à payer *(à confirmer, voir plus bas)*.

## En combien de fois

**1. Les transactions** *(en premier)*
Enregistrer une vente ou un échange, suivre qui doit quoi, confirmer les réceptions, consulter son
historique.
*Pourquoi en premier :* c'est la fondation, et elle sert **aussi** à la demande #1 (la vente du
reliquat de collecte par un collecteur). La construire une fois plutôt que deux.

**2. Les annonces**
Publier « j'ai ce billet en double » et « je recherche ce billet », et surtout : **l'application
vous prévient quand ce que vous avez en double est justement ce qu'un autre recherche.** C'est la
seule chose que Facebook ne sait pas faire — et donc la vraie valeur ajoutée.

**3. Ouvrir « Ma collection » à tous les membres** *(indépendant)*
La page existe mais n'est visible que des admins. L'ouvrir permettrait un jour de publier ses
doubles en un clic. Ce lot ne bloque rien : aujourd'hui, **aucun membre n'a déclaré le moindre
double** dans l'application, donc mieux vaut ne pas attendre après lui.

## Ce qui reste à trancher

Trois points, aucun ne bloque la validation :

1. **Quand une dette traîne**, est-ce que l'application relance la personne ? Une relance
   automatique entre deux membres, c'est un message que le groupe envoie en leur nom — ce n'est
   pas anodin.
2. **Peut-on annuler une transaction déjà acceptée** tout seul, ou faut-il l'accord des deux ?
3. **Peut-on enregistrer un échange qui s'est conclu sur Facebook**, sans passer par une annonce ?
   *(on suppose que oui — ce sera même le cas normal au début)*

## Ce sur quoi on vous demande de vous prononcer

- Est-ce que **le parcours décrit plus haut** correspond à ce que vous feriez, vous, pour vendre
  ou échanger un billet ?
- Est-ce que **ce que l'application ne fera pas** vous convient — en particulier le fait qu'elle
  n'arbitre pas et ne note personne ?
- Est-ce qu'il **manque quelque chose** d'évident pour quelqu'un qui pratique l'échange ?

Si tout vous va, cochez « J'ai lu et je valide l'analyse » sur la fiche. Sinon, laissez un
commentaire : il sera pris en compte et vous aurez une réponse disant ce qui en a été fait.
