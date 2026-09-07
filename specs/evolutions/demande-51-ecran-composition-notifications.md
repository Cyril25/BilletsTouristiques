# Demande #51 — Écran de composition des notifications

> ⚠ **Renumérotée le 07/09/2026 : #50 → #51.** Cette spec avait été écrite le 06/09 en
> *devinant* son numéro (« max id = 44 »), avec la consigne « à renuméroter si l'id attribué
> diffère ». C'est ce qui s'est produit : aucune ligne n'avait été créée, et l'**id 50 a été
> pris entre-temps par une autre demande de Cyril** (icônes image / fiche sur la carte billet,
> liée à #5), toujours au statut `nouvelle`. La ligne de cette demande-ci a été créée le
> 07/09 et porte l'**id 51**. Ne pas confondre les deux.

**État : étage 1 développé le 07/09/2026, à tester** · Étage 2 **en attente d'arbitrage**
(point 1 ci-dessous). Origine : constat de Cyril le 06/09/2026, juste après la bascule #16.

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
- [ ] Étage 2 : sélection de N membres → N lignes créées, chacune visible de son seul
      destinataire, **invisible des autres admins** (c'est la règle posée par #33).
      → **non développé**, bloqué par le point 1 ci-dessous.
- [x] Une annonce privée n'apparaît pas dans la liste de gestion des autres admins, ou y
      apparaît explicitement marquée. → **Tranché par défaut** : la liste ne charge que
      `cible_email IS NULL`, donc aucune notification privée n'y figure — y compris celles
      que l'admin connecté a *reçues* (suivi de ses propres demandes, #33), qui n'ont rien
      à faire dans un écran de gestion. Un bandeau l'explique en tête d'écran.

## Points à trancher avant le dev

1. **Une annonce privée doit-elle être relisible par son auteur ?** La policy de #33 la
   masque à *tous* les admins, y compris celui qui l'a écrite. Cohérent pour les notifs
   automatiques de demandes ; gênant pour un envoi manuel qu'on voudrait corriger. Modifier
   la policy toucherait le comportement livré par #33 — à faire en connaissance de cause.
2. **Faut-il un accusé de lecture ?** `notifications_vues` existe déjà et donnerait le
   nombre de destinataires ayant vu l'annonce, sans travail de schéma.
3. **Les collecteurs doivent-ils pouvoir écrire à leurs inscrits ?** Ce serait l'usage
   naturel (prévenir d'un retard, d'un changement de prix), mais l'écriture est aujourd'hui
   réservée aux admins et ouvrirait une autre discussion.

## Réalisation

**Étage 1 développé le 07/09/2026.** Étage 2 non développé (voir point 1 ci-dessus).
Commit : *(en attente de validation avant push — le site se déploie sur `main`)*.

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

**Reste à faire côté produit** : trancher le point 1 pour ouvrir l'étage 2, puis publier
l'annonce de la nouveauté — avec le nouvel écran, précisément.
