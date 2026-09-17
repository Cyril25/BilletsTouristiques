# Demande #74 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `02b8c96` (17/09/2026).

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
des messages depuis l'extérieur du site (le rappel par mail) et qui tourne seul. On propose un seul
« messager » pour les deux demandes.

## Ce qui ne sera pas possible

- **Prévenir quelqu'un qui n'a pas accepté**, ou sur un appareil où il n'a pas accepté : c'est
  appareil par appareil. Un membre avec un téléphone et un ordinateur accepte deux fois.
- **Prévenir un iPhone où le site est juste ouvert dans Safari**, sans être installé.
- **Garantir l'heure exacte** : un téléphone en économie de batterie peut retarder l'affichage.
- **Forcer un son**, ou passer outre le mode « Ne pas déranger ».
- **Retrouver un membre qui a changé de téléphone** : il devra réactiver l'interrupteur sur le
  nouveau.

## Ce que Cyril aura à faire

Quelques gestes n'appartiennent qu'à lui : créer la clé secrète d'envoi, installer le programme
d'envoi chez Cloudflare, et vérifier qu'une option de la base de données est disponible.

## Ce sur quoi on vous demande de vous prononcer

1. **Tout ce qui arrive dans la cloche doit-il sonner sur le téléphone ?** Ou seulement certaines
   choses ? On propose tout, pour commencer.
2. **Les demandes d'inscription et les signalements** doivent-ils aussi sonner chez les admins ? On le
   recommande : c'est ce qu'on attend le plus vite.
3. **Un seul « messager » pour #74 et #72** (notifications, mails et tâche de nuit) ? On le recommande.

Et une question que seul Cyril peut trancher, parce qu'elle demande de regarder la base : l'option qui
permet à la base de prévenir le programme d'envoi est-elle disponible ? Sinon, c'est l'écran qui
préviendra, avec un peu plus de précautions.

Vos remarques sont bienvenues : laissez un commentaire, vous aurez une réponse disant ce qui en a été
fait. Si tout vous va, cochez « J'ai lu et je valide l'analyse » sur la fiche.
