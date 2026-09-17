# Demande #72 — Mettre en veille les comptes inactifs, faire compléter les fiches

- **Complexité :** L (tri du 2026-09-17, après les réponses de Sébastien).
- **Demande :** #72, déposée par Sébastien le 2026-09-14, priorité normale.
- **Statut :** analyse écrite le 2026-09-17. Aucun développement commencé.
- Version en clair pour les relecteurs : `demande-72-veille-comptes-inactifs-en-clair.md`.

## Contexte (demande)

> Au bout d'un certain temps d'inactivité sur le site ou la fiche de profil incomplète (comme
> l'adresse non renseignée), ne pas autoriser le membre à consulter le site ; s'il ne s'est jamais
> connecté, le mettre automatiquement en veille.

## Les réponses de Sébastien *(16/09, 20 h 15)*

| | Question posée | Réponse |
|---|---|---|
| **1** | Quelle durée d'inactivité | « 6 mois ou 1 an, à voir avec les autres admins » |
| **2** | Bloquer ou faire compléter la fiche | « Faire compléter au membre son profil complètement (ça sécurise en plus les nouveaux membres en ayant plus d'infos pour les admins), sauf peut-être le téléphone qui peut être facultatif » |
| **3** | Ce que peut faire un membre en veille | « Il ne peut plus avoir accès et doit se faire réintégrer par un admin » |
| **4** | Qui est concerné | « Membres, collecteurs et admins (s'il n'y a plus d'activité, c'est qu'il y a un problème avec la personne) » |
| **5** | Prévenir avant | « Un rappel un mois avant le blocage, sur son adresse mail » |

## Le terrain, vérifié le 2026-09-17

| Ce qui existe déjà | Où |
|---|---|
| La date de dernière visite de chaque membre, écrite à chaque page ouverte depuis le 20/03/2026 | `membres.last_active_at`, posée par `global.js`, affichée dans Utilisateurs |
| La règle « fiche complète » : nom, prénom, rue, code postal, ville, pays — **le téléphone est déjà facultatif** | `isProfilComplet()` dans `global.js`, et les champs marqués obligatoires dans `profil.html` |
| Un statut par membre : actif, en attente, refusé — et **désactivé**, apporté par #62 | `membres.statut`, contrainte `membres_statut_check` |
| Le principe « seul un compte actif a des droits » | `is_whitelisted()`, `is_admin_ou_superadmin()` et `is_collecteur()` exigent toutes `statut = 'actif'` |
| Un écran d'administration qui liste les comptes, les filtre et montre les désactivés | `users.js` |

**Les chiffres, comptés le 15/09** : 108 membres actifs ; **42** sans adresse complète ; **37** sans
aucune date de visite — ils ne sont pas revenus depuis le 20/03/2026, mais rien ne dit s'ils étaient
venus avant.

Et ce qui **n'existe pas** :

- **aucun envoi de mail.** Le site n'a ni serveur ni service d'envoi : ses messages sont des
  notifications dans la cloche, et les seuls mails partent du logiciel de l'admin par un lien
  `mailto:`. Or la cloche ne lit que pour un compte actif (`notifications` est protégée par
  `is_whitelisted()`) : **elle ne touche jamais quelqu'un qui ne vient plus**, c'est-à-dire
  exactement la personne à prévenir. Le mail n'est donc pas un confort, c'est le seul canal qui
  atteint un membre inactif ;
- **rien qui tourne tout seul.** Pas de tâche planifiée dans la base, aucun workflow GitHub, et les
  trois Workers du dépôt n'ont pas de déclencheur horaire ;
- **aucun réglage rangé quelque part.** Il n'y a pas de table de paramètres : une durée « 6 mois ou
  1 an » n'a aujourd'hui nulle part où vivre, à part en dur dans le code.

**Dépendance à #62** : le statut `desactive` et le filtrage des fonctions par `statut = 'actif'`
viennent de son étape 0, dont la migration est écrite et attend d'être jouée. `global.js` appelle
déjà `window.showStatusDesactive()` pour un compte non actif, mais `login.html` ne définit pas encore
cette fonction : #62 la posera. #72 s'appuie sur les deux.

## Ce que cette analyse propose

### 1. Deux problèmes, deux réponses différentes

La demande les cite dans la même phrase, mais ils n'appellent pas le même geste :

| | Le cas | Ce qu'on fait | Pourquoi |
|---|---|---|---|
| **A** | La personne ne vient plus | **Mise en veille** : plus d'accès, réintégration par un admin | C'est la réponse 3 de Sébastien |
| **B** | La fiche est incomplète | **On oblige à compléter**, sans couper l'accès | C'est sa réponse 2 : « faire compléter au membre son profil ». Couper l'accès à 42 membres sur 108 du jour au lendemain ferait des mécontents et bloquerait des collectes en cours |

### 2. L'état « en veille »

- Un statut de plus : `en_veille`, à côté de `actif`, `en_attente`, `refuse` et `desactive`.
- Comme il n'est pas `actif`, toutes les règles de sécurité de la base le refusent **sans être
  réécrites** : c'est l'intérêt du travail déjà fait dans #62.
- L'écran de connexion explique ce qui se passe et invite à écrire à un admin.
- Les données sont conservées : inscriptions, collection, dettes, historique. Rien n'est effacé.
- Un admin réintègre depuis Utilisateurs, en un bouton. Le compte redevient actif, avec sa date de
  visite remise à ce jour.

Colonnes ajoutées à `membres` :

| Colonne | Rôle |
|---|---|
| `veille_at` | quand le compte est passé en veille |
| `veille_motif` | pourquoi, en clair : « aucune visite depuis le 12/03/2026 » |
| `veille_rappel_at` | quand le rappel a été envoyé — évite d'en envoyer deux |
| `reactive_par`, `reactive_at` | qui a réintégré, et quand |

### 3. La fiche incomplète : on accompagne, on ne coupe pas

- À l'ouverture du site, si `isProfilComplet()` est faux, le membre arrive sur son profil, avec un
  bandeau qui dit ce qui manque. Les autres pages renvoient là tant que ce n'est pas rempli.
- Les champs sont ceux qui existent déjà : nom, prénom, rue, code postal, ville, pays. **Pas le
  téléphone**, conformément à la réponse 2.
- Dès la fiche enregistrée, tout redevient normal. Aucun admin n'a à intervenir.
- Le mécanisme existe à moitié : aujourd'hui, la vérification ne se déclenche qu'au moment de
  s'inscrire à une collecte. Il s'agit de la remonter à l'entrée du site.

### 4. La durée, et les réglages

Une petite table `reglages` (clé, valeur, qui a changé, quand), et un écran d'administration minimal
pour trois valeurs :

| Clé | Défaut proposé | Sens |
|---|---|---|
| `veille_delai_mois` | 12 | au bout de combien de mois sans visite |
| `veille_rappel_jours` | 30 | combien de jours avant, le rappel part |
| `veille_active` | `false` | l'interrupteur général : rien ne se met en veille tant qu'il n'est pas mis à `true` |

Pourquoi un réglage plutôt qu'un chiffre dans le code : Sébastien renvoie la durée à une décision
collective, et un chiffre gravé demanderait un développement à chaque hésitation. L'interrupteur
permet de tout installer, de regarder qui serait concerné, **puis** de décider d'allumer.

### 5. Qui compte les jours

| | Principe | Pour | Contre |
|---|---|---|---|
| **A — un Worker Cloudflare avec déclencheur horaire** *(recommandé)* | Un quatrième Worker, frère de `supabase-admin-proxy`, appelé par Cloudflare une fois par jour ; il appelle une fonction de la base et envoie les rappels | Tourne sans personne ; le dépôt sait déjà faire des Workers ; c'est aussi lui qui enverra les mails | Un Worker de plus à surveiller |
| **B — une tâche dans la base** | `pg_cron` appelle la fonction chaque nuit | Rien à héberger | À vérifier sur ce projet Supabase ; l'envoi de mail depuis la base demande une extension réseau en plus |
| **C — un bouton dans l'administration** | Un admin ouvre « Comptes inactifs » et clique « Passer en revue » | Aucune infrastructure, tout reste visible | Repose sur quelqu'un : si personne ne clique, rien ne se passe. Contraire au « automatiquement » de la demande |

**Recommandé : A**, avec l'écran de C **en plus** — la liste des comptes bientôt en veille est utile
à regarder même quand la machine fait le travail. **Question Q2.**

### 6. Le rappel un mois avant

| | Principe | Ce que ça demande |
|---|---|---|
| **A — un service d'envoi appelé par le Worker** *(recommandé)* | Un compte chez un expéditeur (offre gratuite suffisante pour quelques dizaines de mails par mois), la clé rangée dans le Worker | Poser deux ou trois lignes chez OVH pour que les mails ne partent pas en indésirable, et choisir l'adresse d'expédition |
| **B — l'admin envoie à la main** | L'écran liste les membres à prévenir et prépare le message ; un admin clique et son logiciel de mail s'ouvre | Rien à installer. Mais quelqu'un doit le faire chaque mois, et Sébastien demandait un rappel automatique |

**Recommandé : A**, avec B comme filet le premier mois. **Question Q3** : Cyril seul peut trancher,
c'est lui qui tient le domaine et les clés.

### 7. Les garde-fous

- **Jamais le dernier admin.** Si mettre un compte en veille laissait le site sans aucun admin actif,
  on ne le fait pas : on prévient les autres admins. Sébastien inclut les admins dans le champ, et
  c'est justement là qu'un automatisme peut fermer la porte de l'intérieur.
- **Un membre qui doit quelque chose, ou à qui on doit quelque chose**, n'est pas mis en veille : une
  inscription en cours, une dette non réglée, une enveloppe non reçue. On le signale aux admins.
  Endormir un compte au milieu d'un paiement ferait plus de dégâts que de ménage.
- **Les fiches déjà désactivées** (#62) et la fiche technique de l'assistant sont hors du champ.
- **Le premier passage** est le plus risqué : 37 membres n'ont aucune date de visite. Proposition :
  au premier allumage, ces comptes-là comptent comme vus le 20/03/2026, jour où le site a commencé à
  noter les visites, et reçoivent le rappel comme les autres — personne ne s'endort sans avoir été
  prévenu. **Question Q4.**
- **Un journal** : chaque mise en veille, chaque rappel et chaque réintégration laisse une trace
  datée. Sans ça, « pourquoi je ne peux plus entrer ? » n'a pas de réponse.

## L'écran « Comptes inactifs »

Dans l'administration, à côté d'Utilisateurs :

- trois listes : **bientôt en veille** (le rappel est parti ou va partir), **en veille**, et
  **retenus par un garde-fou** (dette, inscription en cours, dernier admin) ;
- pour chacun : nom, adresse, dernière visite, ce qui manque, et le motif ;
- deux boutons : **réintégrer** (remet actif) et **repousser** (donne un délai de plus, avec une
  raison) ;
- le bouton **« Passer en revue »** de l'option C ;
- mode sombre et téléphone réel (#53).

## Découpage

| Lot | Contenu | Dépend de |
|---|---|---|
| **1** | La table `reglages`, les colonnes de veille, le statut `en_veille`, l'écran de connexion qui l'explique | #62 étape 0 jouée |
| **2** | La fiche incomplète : vérification à l'entrée du site et bandeau sur le profil | rien |
| **3** | La fonction en base qui désigne les comptes concernés (sans rien changer), et l'écran « Comptes inactifs » avec ses garde-fous et son bouton | lot 1 |
| **4** | Le déclenchement automatique et le rappel par mail | lot 3, Q2 et Q3 tranchées |

Les lots 1 à 3 sont utiles seuls : ils donnent à voir qui serait concerné, interrupteur éteint.

## Critères d'acceptation

1. Un compte en veille ne peut plus rien lire ni écrire, y compris en appelant l'API directement.
2. Il redevient normal, avec ses données, dès qu'un admin le réintègre.
3. Un membre dont la fiche est incomplète arrive sur son profil, et retrouve tout le site dès qu'il
   l'a complétée — sans intervention d'un admin.
4. Le téléphone n'est jamais exigé.
5. Le rappel part une fois, au bon moment, et jamais deux fois pour le même compte.
6. Aucun compte n'est mis en veille s'il a une inscription en cours, une dette, ou s'il est le
   dernier admin actif.
7. Changer la durée dans les réglages change ce que la liste affiche, sans développement.
8. Interrupteur éteint, rien ne se met jamais en veille tout seul.
9. Chaque mise en veille, rappel et réintégration laisse une trace datée et lisible.
10. Mode sombre et téléphone réel.

## Ce que cette spec ne fait pas

- **Elle ne supprime rien** : un compte en veille garde toutes ses données.
- **Elle ne bloque personne pour une fiche incomplète** : elle l'envoie la compléter.
- **Elle ne réveille personne toute seule** : une visite ne suffit pas à sortir de veille, c'est un
  admin qui réintègre (réponse 3 de Sébastien).
- **Elle ne touche pas à la validation des nouveaux membres** (`en_attente`), ni aux refus.

## Questions ouvertes

| | Question | Pour qui | Recommandation |
|---|---|---|---|
| **Q1** | **6 mois ou 1 an ?** Sébastien renvoie la décision aux admins | Les admins | 12 mois pour commencer : un collectionneur peut ne rien acheter d'une saison. La valeur se change ensuite sans développement |
| **Q2** | Qui compte les jours : un Worker qui tourne seul, une tâche dans la base, ou un bouton ? | Cyril | Le Worker, plus le bouton |
| **Q3** | Le rappel par mail : on met en place un envoi automatique, ou l'admin envoie à la main ? | Cyril | L'envoi automatique ; c'est le seul canal qui atteint quelqu'un qui ne vient plus |
| **Q4** | Les 37 comptes sans date de visite : on les traite comme « vu le 20/03/2026 » ? | Tous | Oui, avec le rappel, et un premier passage regardé de près |
| **Q5** | Les admins et collecteurs sont-ils vraiment concernés ? Sébastien dit oui | Les admins | Oui, avec le garde-fou du dernier admin. Pour un collecteur, prévenir aussi les autres admins : une collecte en cours ne doit pas rester orpheline |

## Réalisation

*(à compléter après le développement : fichiers touchés, commits)*
