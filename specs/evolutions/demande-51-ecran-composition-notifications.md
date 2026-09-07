# Demande #51 — Écran de composition des notifications

> ⚠ **Renumérotée le 07/09/2026 : #50 → #51.** Cette spec avait été écrite le 06/09 en
> *devinant* son numéro (« max id = 44 »), avec la consigne « à renuméroter si l'id attribué
> diffère ». C'est ce qui s'est produit : aucune ligne n'avait été créée, et l'**id 50 a été
> pris entre-temps par une autre demande de Cyril** (icônes image / fiche sur la carte billet,
> liée à #5), toujours au statut `nouvelle`. La ligne de cette demande-ci a été créée le
> 07/09 et porte l'**id 51**. Ne pas confondre les deux.

**État : étages 1 ET 2 développés le 07/09/2026, à tester.** Étage 1 **en production**
(commit `5a6d966`). Étage 2 développé dans la foulée après l'arbitrage de Cyril sur le point 1
(« oui à l'envoi ciblé, et je veux pouvoir relire »). Origine : constat de Cyril le 06/09/2026,
juste après la bascule #16.

## Le constat

Cyril cherchait l'écran permettant d'adresser une notification à un ou plusieurs membres
précis — ce qu'il pensait être l'objet de la demande #33. Il n'existe pas. La recherche a
montré un trou plus large :

- **`cible_email` n'est écrit qu'à un seul endroit** de tout le code : `admin-demandes.js`,
  fonction `notifierDemandeurSiSuivi`. C'est **automatique** — quand une demande passe
  « À cadrer » ou « À tester », son auteur est prévenu. Personne ne choisit le destinataire,
  il est déduit du champ `demandeur`.
- **Il n'existe aucun écran pour composer une notification**, même de diffusion.
  `notifications.html` est la page de lecture (Nouveautés). Les 15 annonces existantes ont
  **toutes** été écrites à la main, en SQL, dans l'éditeur Supabase.
- Le modèle ne gère pas « plusieurs membres » : `cible_email` est **une seule colonne
  texte**. Plusieurs destinataires = plusieurs lignes de notification.

**Ce n'est pas un bug de #33.** Cette demande a livré la plomberie — la colonne, et la
policy qui rend la notif privée y compris aux admins — plus un usage automatique qui
fonctionne. L'écart est entre l'intention et le périmètre livré, et il est resté invisible
justement parce que la partie automatique marche.

## Ce qui existe déjà et qu'il ne faut pas refaire

| | |
|---|---|
| Table | `notifications (id, type, titre, texte, lien, created_at, cible, cible_email)` |
| Diffusion | `cible` ∈ `tous` / `collecteurs` / (admins via `is_admin_ou_superadmin()`) |
| Privé | `cible_email` non nul → visible du seul destinataire, **masqué aux admins** |
| Policy lecture | `notifications_select`, le `CASE` posé par #33 — **rien à y toucher** |
| Écriture | `notifications_insert/_update/_delete` = `is_admin_ou_superadmin()` |
| Convention | `type = 'nouveaute'`, `lien` = une page du site (13 annonces sur 15 en portent une) |

## Proposition — deux étages, le premier a un intérêt propre

### Étage 1 — composer une notification de diffusion

Un écran admin : **titre**, **texte**, **lien** (liste des pages du site), **cible**
(tous / collecteurs / admins), aperçu, publication. Plus la liste des annonces existantes,
avec modification et suppression.

Cet étage se justifie **seul, sans le ciblage** : aujourd'hui, publier une nouveauté exige
un accès à la base de production. C'est la seule fonctionnalité du produit dans ce cas.

### Étage 2 — cibler un ou plusieurs membres

Un sélecteur de membres (multi-sélection sur l'annuaire). À la publication, **une ligne par
destinataire**, chacune avec son `cible_email`. Aucun changement de schéma nécessaire.

## Critères d'acceptation

- [x] Un admin publie une annonce de diffusion sans passer par SQL ; elle apparaît dans la
      cloche et sur Nouveautés selon sa cible.
- [x] Un admin modifie et supprime une annonce existante.
- [x] Le champ `lien` propose les pages du site plutôt qu'une saisie libre — une URL fautive
      donne une annonce qui mène nulle part.
- [x] Étage 2 : sélection de N membres → N lignes créées, chacune visible de son seul
      destinataire, **invisible des autres admins** (c'est la règle posée par #33).
- [x] Étage 2 : l'auteur relit et corrige ses propres envois, sans que ses messages
      remontent dans sa propre cloche ni dans celle des autres admins.
- [x] Une annonce privée n'apparaît pas dans la liste de gestion des autres admins, ou y
      apparaît explicitement marquée. → **Tranché par défaut** : la liste ne charge que
      `cible_email IS NULL`, donc aucune notification privée n'y figure — y compris celles
      que l'admin connecté a *reçues* (suivi de ses propres demandes, #33), qui n'ont rien
      à faire dans un écran de gestion. Un bandeau l'explique en tête d'écran.

## Points à trancher avant le dev

1. ~~**Une annonce privée doit-elle être relisible par son auteur ?**~~ → **Tranché par Cyril
   le 07/09/2026 : oui.** Et résolu **sans toucher à la policy de #33**, ce qui n'était pas
   l'option envisagée ici. Voir « La solution qui évite de casser #33 » ci-dessous.
2. **Faut-il un accusé de lecture ?** `notifications_vues` existe déjà et donnerait le
   nombre de destinataires ayant vu l'annonce, sans travail de schéma.
3. **Les collecteurs doivent-ils pouvoir écrire à leurs inscrits ?** Ce serait l'usage
   naturel (prévenir d'un retard, d'un changement de prix), mais l'écriture est aujourd'hui
   réservée aux admins et ouvrirait une autre discussion.

## La solution qui évite de casser #33

La question 1 proposait de « modifier la policy `notifications_select` en connaissance de
cause ». **Mauvaise idée, découverte en l'écrivant** : élargir cette policy pour que l'auteur
voie ses envois les aurait fait remonter dans **sa propre cloche et sa page Nouveautés**. Un
admin aurait reçu ses propres messages — et la règle de #33 aurait bougé pour tout le monde,
notifications automatiques comprises.

Le contournement tient en une fonction. `notifications_select` **n'est pas touchée** ; une
fonction `SECURITY DEFINER` rend à un auteur ses propres envois, et **seul l'écran
d'administration l'appelle** :

```sql
CREATE OR REPLACE FUNCTION mes_notifications_envoyees()
RETURNS SETOF notifications AS $$
  SELECT n.* FROM notifications n
  WHERE n.cible_email  IS NOT NULL
    AND n.auteur_email IS NOT NULL
    AND lower(n.auteur_email) = lower(auth.jwt() ->> 'email')
  ORDER BY n.created_at DESC, n.cible_email ASC;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

Deux propriétés qui découlent gratuitement de ce choix :

- **La vue des membres est rigoureusement inchangée.** Aucune ligne de `global.js` ni de
  `notifications.js` n'a été touchée : ce qui est en production continue de se comporter à
  l'identique.
- **Les notifications automatiques de #33 ne bougent pas** : elles n'ont pas d'`auteur_email`
  (NULL), donc la fonction ne les rend à personne. Le suivi de demande reste privé au
  demandeur, exactement comme avant.

Il ne manquait que la **lecture** : corriger et supprimer étaient déjà possibles, les policies
`notifications_update` / `_delete` étant en `is_admin_ou_superadmin()` sans restriction
(vérifié dans `migration-notif-cibles-3-niveaux.sql`).

## Réalisation

**Étages 1 et 2 développés le 07/09/2026.**
Étage 1 : commit `5a6d966`, **en production**. Étage 2 : commit à suivre.

| Fichier | Nature |
|---|---|
| `admin-notifications.html` | **nouveau** — écran de composition (liste, filtres, recherche, modale, aperçu) |
| `admin-notifications.js` | **nouveau** — chargement, rendu, publication, modification, suppression |
| `menu.html` | lien « Composer une notification » dans le menu Administration |
| `sw.js` | `CACHE_NAME` v290 → **v291** + les deux nouveaux fichiers dans `STATIC_ASSETS` |
| `global.js` | cache-buster `menu.html?v=198` → **199** (le menu a changé) |

**Aucune migration SQL.** Vérifié avant de coder : `notifications_insert`, `_update` et
`_delete` existent déjà (`migration-notif-cibles-3-niveaux.sql`) et sont toutes trois en
`is_admin_ou_superadmin()`. L'écran n'a donc besoin d'aucun droit nouveau — c'était bien
un trou d'**interface**, pas de modèle.

### Décisions prises au dev

- **Périmètre = diffusion seule.** La liste charge `cible_email=is.null`. Conséquence
  utile et non évidente : les notifications privées que l'admin connecté a lui-même
  *reçues* (suivi de ses demandes, #33) sont exclues — sans ce filtre, un écran de gestion
  aurait affiché des messages personnels au milieu des annonces.
- **L'aperçu montre les deux rendus réels** : l'accroche de la cloche (110 caractères,
  règle de #46) et la carte de la page Nouveautés, badge de cible compris (#29, pas de
  badge pour « tous »). Avant cet écran, le seul moyen de voir le rendu était de publier.
  La règle des 110 caractères est **dupliquée** depuis `global.js` plutôt que partagée :
  commentaire posé dans le code pour que les deux soient revues ensemble.
- **Modifier ne touche ni `type` ni `created_at`** : corriger une faute ne doit pas
  remonter l'annonce en tête de liste ni la re-signaler comme neuve aux membres.
- **Un `lien` hors de la liste des pages est conservé**, ajouté en tête du sélecteur et
  marqué « (valeur actuelle) ». Sans ça, éditer le titre d'une annonce pointant vers une
  ancre (`notifications.html#notif-…`) aurait effacé son lien en silence.
- **Suppression** : `notifications_vues` est en `ON DELETE CASCADE` (vérifié dans
  `migration-demande-28-notifications.sql`), donc supprimer une annonce déjà lue ne bute
  pas sur une contrainte de clé étrangère.

### Le piège du dev

**`notifications.id` est un `UUID`, pas un entier.** Les handlers inline avaient d'abord
été écrits `onclick="ouvrirModaleNotif(' + n.id + ')"` — sur un UUID, le navigateur lit une
soustraction d'identifiants et « Modifier » comme « Supprimer » n'auraient **rien fait, sans
la moindre erreur visible**. Toutes les autres tables du projet ont des id entiers ; c'est
`migration-demande-28-notifications.sql` qui fait exception. Corrigé (id passé entre
guillemets échappés, `encodeURIComponent` sur les URL) et couvert par un test.

### Vérification

Faute de navigateur, l'écran a été exercé par un **harnais Node** (stub DOM minimal) qui
rejoue le rendu, les filtres, la recherche, le pré-remplissage de la modale, l'aperçu et
les payloads réellement envoyés à PostgREST : **36 contrôles, tous au vert**, dont
l'échappement d'un titre hostile (`<stats>`), la troncature à 110, le lien vide envoyé en
`null` plutôt qu'en chaîne vide, et les URL de PATCH/DELETE sur un UUID. Le harnais vit
dans le scratchpad de session (non versionné) : il valide le code, il n'est pas un test de
non-régression du dépôt.

## Étage 2 — ce qui a été construit

- **Bascule dans la modale** : « À un groupe » / « À des personnes précises ».
- **Sélecteur de membres** : recherche, tout cocher / tout décocher sur le résultat filtré
  seulement (et non sur l'annuaire entier — cocher 108 personnes par mégarde serait
  irréversible), compteur de sélection.
- **Un envoi = N lignes**, `cible_email` étant une colonne unique. Envoyées en **un seul
  POST**, elles partagent alors le même `created_at` — ce qui suffit à les regrouper à la
  relecture. Même mécanique que le regroupement des paiements de #42, et pour la même raison :
  une instruction SQL = un seul `now()`.
- **Relecture** via le filtre « Mes envois ciblés », qui **nomme les destinataires** plutôt que
  d'afficher « 4 personnes » : le seul intérêt de relire un envoi, c'est de vérifier à qui il
  est parti.
- **Correction** du titre, du texte et du lien sur les N lignes d'un coup. Les **destinataires
  sont figés** : en ajouter reviendrait à envoyer un nouveau message, en retirer à effacer une
  notification déjà reçue. L'écran le dit explicitement plutôt que de le laisser deviner.
- **Suppression** de l'envoi entier, avec un message qui annonce le nombre de destinataires
  concernés.
- **Dégradation propre** : tant que la migration n'est pas jouée, l'appel à la fonction échoue,
  le mode ciblé est **grisé** et un bandeau nomme le script à exécuter. L'étage 1 reste
  pleinement utilisable. L'écran ne propose jamais une action qui échouerait à la publication.

### Deux pièges évités

- **L'auteur doit être l'email RÉEL, jamais l'identité impersonnée.** C'est `auth.jwt()` que
  la fonction compare ; écrire l'email impersonné aurait rendu l'envoi invisible à son propre
  auteur. Même précaution que pour les signalements (#5).
- **La correction ne renvoie ni `cible_email`, ni `auteur_email`, ni `created_at`.** Toucher
  `created_at` disloquerait le regroupement *et* re-signalerait le message comme neuf aux
  destinataires.

### Fichiers de l'étage 2

| Fichier | Nature |
|---|---|
| `scripts/migration-demande-51-notif-auteur.sql` | **nouveau** — colonne `auteur_email`, fonction `mes_notifications_envoyees()`, index. ⚠ **gitignoré** comme les autres migrations : le SQL est reproduit ci-dessus pour ne pas être perdu |
| `admin-notifications.html` | bascule de mode, sélecteur de membres, styles |
| `admin-notifications.js` | chargement des envois, regroupement, sélecteur, publication multiple, correction et suppression de groupe |
| `sw.js` | `CACHE_NAME` v291 → **v292** |
| `global.js` | cache-buster `menu.html?v=199` → **200** |

**Vérification** : le harnais couvre maintenant **58 contrôles** pour l'étage 2 (regroupement,
sélecteur, validation, payloads envoyés, correction, suppression, dégradation sans migration)
**plus les 36 de l'étage 1**, qui passent toujours — la non-régression de la diffusion est
explicitement testée.

**Reste à faire** : jouer `scripts/migration-demande-51-notif-auteur.sql` dans l'éditeur SQL
Supabase — l'envoi ciblé s'active tout seul ensuite, sans redéploiement.
