# Demande #74 — De vraies notifications sur le téléphone

- **Complexité :** L (tri du 2026-09-17).
- **Demande :** #74, déposée par Cyril le 2026-09-17, priorité normale.
- **Statut :** analyse écrite le 2026-09-17. Aucun développement commencé.
- Version en clair pour les relecteurs : `demande-74-notifications-telephone-en-clair.md`.

## Contexte (demande)

> Voir s'il est possible, une fois le site « installé » sur un téléphone Android ou iOS (ou peut-être
> même un ordinateur) via le bouton « Installer », d'envoyer une vraie notification comme une notif
> Android — actuellement, la notif n'est visible que si on ouvre le site. Fais une analyse pour me
> dire ce qui est possible ou pas.

## La réponse courte

**Oui, c'est possible**, sur Android, sur iPhone et sur ordinateur, avec le mécanisme standard des
navigateurs, le *Web Push*. Mais une notification de ce genre **ne part jamais du site lui-même** :
un serveur doit l'envoyer au téléphone. C'est ce serveur, et la liste des appareils abonnés, qui
manquent aujourd'hui. L'iPhone pose en plus une condition ferme : le site doit être installé sur
l'écran d'accueil.

## Le terrain, vérifié le 2026-09-17

| Ce qui existe | Où | Ce que ça vaut pour #74 |
|---|---|---|
| Le site s'installe : manifeste, mode « standalone », bouton « Installer » (avec des instructions à part pour iOS, qui n'a pas d'installation automatique) | `manifest.json`, `global.js` (`installPwa`, `beforeinstallprompt`) | **Acquis** : c'est le prérequis de l'iPhone |
| Un service worker, enregistré sur toutes les pages | `sw.js`, enregistré par `global.js` | **Acquis** : c'est lui qui recevra les notifications. Aujourd'hui il ne fait que du cache (`install`, `activate`, `fetch`) : il faudra lui ajouter l'écoute `push` et le clic sur la notification |
| La cloche, qui lit quatre sources à l'ouverture d'une page | `refreshNotifications()` dans `global.js` | Les « nouveautés » (table `notifications`), les demandes d'inscription et les signalements en attente (admins), le suivi de ses propres signalements |
| La table `notifications`, avec une cible : tous, collecteurs, admins, ou un membre précis (`cible_email`, #33) | migrations #28, #33, cibles à 3 niveaux | **La bonne porte d'entrée** : une ligne ajoutée ici est exactement « quelque chose à annoncer à quelqu'un » |
| Des notifications créées par l'écran (`admin-notifications.js`, `admin-demandes.js`, `demande.js`), par des déclencheurs en base (dettes, #44) et par des scripts | | L'envoi doit partir **de la base**, sinon celles des déclencheurs passeraient à la trappe |
| Trois Workers Cloudflare, dont `supabase-admin-proxy` | `workers/` | Le savoir-faire est là ; aucun n'envoie de notification, aucun n'a de déclencheur |
| Une seule icône, en SVG | `icon.svg`, reprise comme `apple-touch-icon` | **À compléter** : l'iPhone n'accepte pas de SVG comme icône d'écran d'accueil, et les notifications Android s'affichent mieux avec des PNG |

Et ce qui **manque** : un expéditeur, des clés d'envoi, la liste des appareils abonnés.

## Comment marche une notification « Web Push »

1. Sur l'appareil, le membre accepte de recevoir des notifications. Le navigateur fabrique alors un
   **abonnement** : une adresse d'envoi propre à cet appareil (chez Google pour Chrome et Android,
   chez Apple pour Safari et l'iPhone, chez Mozilla pour Firefox) et deux clés.
2. Le site enregistre cet abonnement dans la base, rattaché au membre.
3. Quand il y a quelque chose à annoncer, **le serveur** envoie un message chiffré à cette adresse,
   signé avec la clé privée du site (clés « VAPID »).
4. Le service d'Apple, Google ou Mozilla réveille l'appareil ; le service worker du site affiche la
   notification, **même site fermé**. Un toucher ouvre le site à la bonne page.

Rien de tout cela ne peut se faire depuis la page seule : l'étape 3 exige un serveur qui détient la clé
privée.

## Ce qui est possible, et à quelles conditions

| Appareil | Possible ? | Conditions |
|---|---|---|
| **Android** (Chrome, Edge, Firefox, Samsung Internet) | **Oui** | Fonctionne même sans installer le site ; installé, c'est plus naturel. Le navigateur n'a pas besoin d'être ouvert |
| **iPhone et iPad** | **Oui, sous conditions** | iOS 16.4 ou plus récent. **Seulement si le site est ajouté à l'écran d'accueil**, et ouvert depuis cette icône. La permission ne peut être demandée qu'après un geste du membre (un bouton à toucher). Dans un simple onglet Safari : **rien** |
| **Ordinateur** (Chrome, Edge, Firefox, Safari sur Mac) | **Oui** | Installé ou non. En pratique, le navigateur doit tourner, au moins en arrière-plan |

## Ce qui n'est **pas** possible

- **Notifier quelqu'un qui n'a pas accepté**, ou sur un appareil où il n'a pas accepté : l'abonnement
  est par appareil et par navigateur. Un membre avec un téléphone et un ordinateur accepte deux fois.
- **Notifier un iPhone où le site est seulement ouvert dans Safari**, sans être installé.
- **Garantir le moment exact** : les économiseurs de batterie retardent parfois l'affichage.
- **Forcer un son, ou passer outre le mode « Ne pas déranger »** : c'est le téléphone qui décide.
- **Envoyer sans serveur** : c'est la limite de fond. Le site est une page statique ; il lui faut un
  expéditeur.
- **Récupérer un abonnement perdu** : si le membre retire la permission, désinstalle le site ou
  change de téléphone, l'abonnement meurt. Le serveur le découvre à l'envoi suivant (réponse 404 ou
  410) et doit alors l'effacer.

## Ce que cette analyse propose

### L'expéditeur : un Worker Cloudflare

Un Worker `notifications-push`, à côté des trois existants :

- il détient la **clé privée VAPID** dans ses secrets, jamais dans le dépôt public ;
- il reçoit « la notification n° X vient d'être créée », lit sa cible, trouve les abonnements des
  membres concernés et envoie à chacun ;
- il chiffre le message avec les outils cryptographiques natifs des Workers ;
- il efface les abonnements morts.

Le même Worker pourra servir à #72, qui a besoin d'envoyer des rappels par mail et de tourner seul
chaque nuit : **un seul « messager »** plutôt que deux.

### Le déclenchement : depuis la base

| | Principe | Pour | Contre |
|---|---|---|---|
| **A — un déclencheur sur la table** `notifications` *(recommandé)* | À chaque ligne ajoutée, la base appelle le Worker (« webhook » de base Supabase, qui s'appuie sur l'extension réseau `pg_net`) | Toutes les notifications partent, qu'elles viennent de l'écran, d'un déclencheur ou d'un script | Disponibilité de l'extension à vérifier sur ce projet (même question que #72) |
| **B — l'écran appelle le Worker** | Après avoir créé une notification, la page prévient le Worker | Rien à activer en base | Oublie celles créées par les déclencheurs (#44) et les scripts. Et un membre malveillant pourrait appeler le Worker directement : il faudrait le protéger |

**Recommandé : A. Question Q1** pour Cyril, qui seul peut vérifier le projet Supabase.

Les demandes d'inscription et les signalements ne sont pas des lignes de `notifications` : pour
qu'ils sonnent aussi, leur arrivée devra **créer** une ligne dans `notifications`, ciblée admins.
C'est un petit changement, et la cloche y gagne une source unique. **Question Q3.**

### Les abonnements : une table

`push_abonnements` :

| Colonne | Rôle |
|---|---|
| `id`, `cree_le`, `dernier_envoi_le` | |
| `membre_id` | le membre, par son numéro (#62) — pas par son adresse, qui peut changer |
| `endpoint` | l'adresse d'envoi de l'appareil, unique |
| `cle_p256dh`, `cle_auth` | les deux clés de l'abonnement |
| `appareil` | une étiquette lisible : « Android — Chrome », « iPhone » |

Règles d'accès : un membre crée, voit et supprime **ses** abonnements ; seul le Worker, avec sa clé de
service, lit ceux de tout le monde. Sans `TO authenticated` (le jeton Firebase arrive en rôle `anon`).

### Côté site

- Dans le profil, un bloc **« Notifications sur cet appareil »** : un interrupteur, l'état actuel
  (acceptées, refusées, pas encore demandées) et, sur iPhone hors écran d'accueil, l'explication de
  ce qu'il faut faire d'abord.
- La permission n'est demandée **qu'au toucher de l'interrupteur**, jamais à l'ouverture d'une page :
  c'est obligatoire sur iPhone, et c'est de toute façon plus poli.
- Le service worker apprend deux choses : afficher un message reçu, et ouvrir la bonne page au
  toucher.
- Des icônes PNG (192 et 512 pixels, plus une petite icône monochrome pour la barre d'état Android).

### Ce qui sonne

Proposition pour commencer : **tout ce qui arrive dans la cloche sonne aussi**, avec la même cible —
une annonce à tous sonne chez tous les abonnés, un message privé chez le seul destinataire. Des
réglages par type (« ne me prévenir que pour mes collectes ») viendront si le besoin s'en fait
sentir. **Question Q2.**

## Découpage

| Lot | Contenu | Dépend de |
|---|---|---|
| **1** | Icônes PNG ; bloc « Notifications sur cet appareil » dans le profil ; table `push_abonnements` et ses règles ; écoute `push` dans le service worker | Clés VAPID générées par Cyril |
| **2** | Le Worker `notifications-push` : lecture de la cible, envoi chiffré, nettoyage des abonnements morts ; un bouton « m'envoyer une notification de test » pour les admins | lot 1 |
| **3** | Le déclencheur en base sur `notifications` | lot 2, Q1 |
| **4** | Demandes d'inscription et signalements versés dans `notifications` | lot 3, Q3 |

## Ce que Cyril aura à faire

Ces gestes-là lui appartiennent, l'assistant ne les fera pas :

- générer la paire de clés VAPID et ranger la privée dans les secrets du nouveau Worker ;
- déployer le Worker ;
- vérifier la disponibilité de `pg_net` (ou des « webhooks » de base) sur le projet Supabase, et
  jouer la migration du déclencheur.

## Critères d'acceptation

1. Sur Android, un membre abonné reçoit la notification site fermé, et un toucher ouvre la bonne page.
2. Sur iPhone installé sur l'écran d'accueil, idem ; sur iPhone dans Safari, le profil explique
   pourquoi ce n'est pas possible et comment faire.
3. La permission n'est jamais demandée sans un geste du membre.
4. Une notification ciblée ne sonne que chez son destinataire ; une annonce aux admins, que chez les
   admins.
5. Une notification créée par un déclencheur en base sonne aussi.
6. Un abonnement mort est effacé à l'envoi suivant.
7. Un membre ne voit ni ne modifie les abonnements d'un autre, y compris par appel direct à l'API.
8. La clé privée n'apparaît nulle part dans le dépôt.
9. La cloche continue de fonctionner comme avant, abonné ou non.

## Ce que cette spec ne fait pas

- **Pas d'application à télécharger** dans un magasin d'applications : le site installé suffit.
- **Pas de SMS, pas de mail** : c'est #72 qui traitera le mail.
- **Pas de réglages par type de notification** au premier lot.
- **Pas de garantie de livraison** : c'est le téléphone qui décide du moment.

## Questions ouvertes

| | Question | Pour qui | Recommandation |
|---|---|---|---|
| **Q1** | Le déclenchement depuis la base : `pg_net` ou les webhooks de base sont-ils disponibles sur le projet ? | Cyril | À vérifier ; sinon, repli sur l'option B avec un Worker protégé |
| **Q2** | Tout ce qui arrive dans la cloche sonne-t-il sur le téléphone, ou seulement certains types ? | Tous | Tout, pour commencer |
| **Q3** | Verser les demandes d'inscription et les signalements dans `notifications`, pour qu'ils sonnent chez les admins ? | Cyril | Oui |
| **Q4** | Un seul Worker « messager » pour #74 et #72 (notifications, mails, tâche de nuit) ? | Cyril | Oui |

## Réalisation

*(à compléter après le développement : fichiers touchés, commits)*
