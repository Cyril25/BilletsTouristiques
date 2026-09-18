# Demande #74 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `0f9b268` (18/09/2026, après les réponses de Cyril).

## Ce qui a changé le 18/09

Cyril a répondu **oui aux trois questions** : tout ce qui arrive dans la cloche sonnera sur le
téléphone, les demandes d'inscription et les signalements sonneront chez les admins, et un seul
« messager » servira à #74 et #72.

Sur la quatrième — la base peut-elle prévenir le programme d'envoi ? — il n'a pas la réponse et
pense que non. Deux choses ont donc été faites : **un petit contrôle en lecture seule** est prêt pour
lui, et surtout **l'autre chemin a été retravaillé** pour que la réponse ne change plus rien
d'important. Voir « Et si la base ne peut pas prévenir le programme ? ».

## La question

Aujourd'hui, une notification n'existe que dans la cloche du site : on ne la voit qu'en ouvrant le
site. Cyril demande si, une fois le site installé avec le bouton « Installer », on pourrait recevoir
**une vraie notification du téléphone**, comme celles des autres applications, même site fermé.

## La réponse : oui, avec une condition sur iPhone

C'est possible sur les trois familles d'appareils :

| Appareil | Ce qui marche |
|---|---|
| **Android** | Oui. Même sans installer le site ; le navigateur n'a pas besoin d'être ouvert |
| **iPhone et iPad** | Oui, **seulement si le site est ajouté à l'écran d'accueil** et ouvert depuis cette icône, avec un iPhone à jour (iOS 16.4 ou plus récent, sorti en 2023). Dans Safari, en simple onglet : rien |
| **Ordinateur** | Oui, tant que le navigateur tourne, même en arrière-plan |

## Pourquoi ce n'est pas déjà là

Une notification de ce genre **ne part jamais du site lui-même**. Le chemin est le suivant :

1. sur son téléphone, le membre accepte de recevoir des notifications ;
2. le site retient « ce téléphone-là veut être prévenu » ;
3. quand il y a quelque chose à annoncer, **un serveur** envoie le message à Google, Apple ou Mozilla,
   selon le téléphone ;
4. qui le transmettent au téléphone, qui l'affiche — site fermé.

Notre site est une simple page : il n'a pas de serveur pour faire l'étape 3. C'est ce qu'il faut
ajouter.

## Ce qu'on propose

- **Un petit programme d'envoi** chez Cloudflare, là où le site a déjà trois programmes du même genre.
  Il garde la clé secrète qui prouve que les messages viennent bien de nous.
- **Il se déclenche tout seul** chaque fois qu'une notification est créée — par un admin, par le site
  ou par la base elle-même. Aucune annonce n'est oubliée.
- **Dans le profil, un bloc « Notifications sur cet appareil »** : un interrupteur, et l'état actuel.
  Sur un iPhone où le site n'est pas installé, le bloc explique quoi faire d'abord.
- **Le site ne demande jamais la permission tout seul** : seulement quand le membre touche
  l'interrupteur. C'est obligatoire sur iPhone, et plus agréable partout.
- **Des icônes en image classique** : aujourd'hui le site n'a qu'une icône dans un format que l'iPhone
  ne sait pas afficher sur l'écran d'accueil.

**Ce qui sonnerait :** pour commencer, tout ce qui arrive dans la cloche, avec la même cible. Une
annonce à tous sonne chez tous ceux qui ont accepté, un message privé chez son seul destinataire, une
alerte admin chez les admins. On pourra ensuite laisser chacun choisir ce qu'il veut recevoir.

**Un bonus pour #72 :** la mise en veille des comptes a besoin, elle aussi, d'un programme qui envoie
des messages depuis l'extérieur du site (le rappel par mail) et qui tourne seul. Un seul « messager »
servira aux deux demandes. *(Retenu par Cyril le 18/09.)*

## Et si la base ne peut pas prévenir le programme ?

Le mieux serait que la base elle-même prévienne le programme d'envoi dès qu'une notification est
créée : rien ne peut lui échapper. Ça demande une option de la base dont Cyril doute qu'elle soit
disponible. Un contrôle en lecture seule est prêt pour lui : trois lignes de réponse, et c'est tranché.

Si la réponse est non, **c'est l'écran qui prévient le programme**, et ce n'est plus un pis-aller :

- **le programme ne croit personne sur parole.** On ne lui donne qu'un **numéro de notification** ; il
  va lire lui-même la notification dans la base et l'envoie telle quelle, à la cible qu'elle déclare.
  Quelqu'un qui l'appellerait à tort ne pourrait que faire renvoyer une notification qui existe déjà,
  à ses destinataires normaux ;
- **il note ce qu'il a envoyé**, donc rien ne part deux fois, et **il repasse derrière** : à chaque
  appel, et de toute façon chaque nuit, il ramasse les notifications récentes jamais envoyées — y
  compris celles que la base crée toute seule, comme les rappels de dettes.

Autrement dit : dans les deux cas, personne ne rate sa notification.

## Ce qui ne sera pas possible

- **Prévenir quelqu'un qui n'a pas accepté**, ou sur un appareil où il n'a pas accepté : c'est
  appareil par appareil. Un membre avec un téléphone et un ordinateur accepte deux fois.
- **Prévenir un iPhone où le site est juste ouvert dans Safari**, sans être installé.
- **Garantir l'heure exacte** : un téléphone en économie de batterie peut retarder l'affichage.
- **Forcer un son**, ou passer outre le mode « Ne pas déranger ».
- **Retrouver un membre qui a changé de téléphone** : il devra réactiver l'interrupteur sur le
  nouveau.

## Ce que Cyril aura à faire

Quelques gestes n'appartiennent qu'à lui : **jouer le petit contrôle** en lecture seule et coller ses
trois lignes de résultat en commentaire sur la fiche, créer la clé secrète d'envoi, et installer le
programme d'envoi chez Cloudflare.

## Ce sur quoi on vous demande de vous prononcer

**Les trois questions sont tranchées** depuis le 18/09 : tout sonne, les demandes d'inscription et les
signalements aussi, et un seul messager pour #74 et #72.

Il ne reste que le contrôle à jouer, et il ne change ni l'écran, ni le travail à faire : seulement le
chemin par lequel le programme d'envoi est prévenu. **L'analyse peut donc être validée.**

Vos remarques sont bienvenues : laissez un commentaire, vous aurez une réponse disant ce qui en a été
fait. Si tout vous va, cochez « J'ai lu et je valide l'analyse » sur la fiche.
