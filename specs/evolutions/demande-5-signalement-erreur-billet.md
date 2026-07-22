# Demande #5 — Signaler une erreur sur un billet (+ boîte aux lettres admin)

- **Épic :** Corrections et évolutions
- **Demande :** #5 (table `demandes`)
- **Priorité / Complexité :** basse / L annoncé → **M après cadrage** (périmètre resserré, cf. Analyse)
- **Concerne :** membres, collecteurs, admins
- **Écran :** Fiche billet (`billet.html`) + nouvel écran admin + cloche du menu
- **Statut :** À tester (migration exécutée et vérifiée le 2026-07-22)
- **Commit :** —

## Contexte (demande)

> Bouton « signaler une erreur sur un billet » avec envoi d'un commentaire + boîte aux
> lettres interne pour que les admins gèrent ces messages.
>
> Commentaire : notification (badge menu ? email ?) → icône indépendant dans le menu comme
> les demandes d'inscriptions.

## État des lieux (existant réutilisable)

- `billet.html` / `billet.js` lit la table Supabase `billets` par `id` (bigint) — un
  signalement peut donc référencer proprement `billets(id)` en clé étrangère.
- La cloche du menu est **déjà un agrégateur multi-sources** (`global.js`,
  `refreshNotifications`) : `broadcast` (nouveautés) + `signup_request` (demandes
  d'inscription, admins). Ajouter des sources coûte peu.
- Le patron « écran admin à onglets par statut » existe deux fois
  (`admin-inscriptions.html`, `admin-demandes.html`) : la boîte aux lettres le reprend.
- **Aucune infra d'envoi d'email** dans le projet (seulement des `mailto:` côté client).

## Analyse / décisions (validées avec Cyril le 2026-07-21)

| Sujet | Décision | Pourquoi |
|---|---|---|
| Périmètre de la « boîte aux lettres » | **Signalements de billets uniquement** (`billet_id` obligatoire) | Ce qui faisait le « L », c'était la messagerie interne générique. Écartée : hors besoin réel. |
| Réponse au membre | **Statuts + commentaire de clôture + notif dans la cloche du membre.** Pas de fil de discussion. | Le membre sait que son signalement a servi, sans construire une messagerie à deux sens. |
| Notification admin | **Nouvelle source dans la cloche existante** (`billet_report`), pas d'icône séparée | Cohérent avec les demandes d'inscription ; la barre de menu est déjà chargée (somme due, cloche, email, installer, sortir). |
| Emplacement du bouton | **Fiche billet uniquement** | Écran cité dans la demande, et endroit où le membre voit le détail — donc où il repère l'erreur. |
| Formulaire | **Motif (liste) + commentaire libre** | Permet le tri/filtre côté admin et guide le membre. |
| Notif de clôture | **Source dédiée dans la cloche** (colonne `auteur_vu_at`), pas d'extension de `notifications` | Aucune migration ni RLS à retoucher sur `notifications` (déjà subtile avec les 3 cibles). |
| Anti-doublon | **1 signalement ouvert par membre et par billet** | Évite les doublons involontaires sans bloquer un nouveau signalement après traitement. |
| Email aux admins | **Non** | Pas d'infra mail ; ce serait un chantier à part. |

### Modèle de données

Migration `scripts/migration-demande-5-signalements.sql`, à exécuter **avant** déploiement.

```
signalements
  id              BIGSERIAL PK
  billet_id       BIGINT NOT NULL REFERENCES billets(id) ON DELETE CASCADE
  billet_ref      TEXT              -- copie de Reference au moment du signalement (traçabilité)
  auteur_email    TEXT NOT NULL     -- auth.jwt() ->> 'email'
  motif           TEXT NOT NULL     -- image | infos | millesime | categorie | doublon | autre
  commentaire     TEXT NOT NULL
  etat            TEXT NOT NULL DEFAULT 'nouveau'   -- nouveau | en_cours | traite | rejete
  reponse_admin   TEXT              -- commentaire de clôture, visible du membre
  traite_par      TEXT              -- email de l'admin
  traite_at       TIMESTAMPTZ
  auteur_vu_at    TIMESTAMPTZ       -- quand l'auteur a vu la clôture (vide la cloche)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```

- Index : `(etat)`, `(auteur_email)`, `(billet_id)`.
- Index unique partiel anti-doublon :
  `UNIQUE (billet_id, auteur_email) WHERE etat IN ('nouveau','en_cours')`.

### RLS (pas de `TO authenticated` — convention Firebase JWT → rôle `anon`)

| Opération | Politique |
|---|---|
| SELECT | `auteur_email = auth.jwt() ->> 'email' OR is_admin_ou_superadmin()` |
| INSERT | `is_whitelisted() AND auteur_email = auth.jwt() ->> 'email'` |
| UPDATE | **admins uniquement** : `is_admin_ou_superadmin()`. L'auteur passe par la fonction `marquer_signalement_vu()` (`SECURITY DEFINER`) pour poser `auteur_vu_at`, cf. point tranché (a) |
| DELETE | `is_admin_ou_superadmin()` |

`is_admin_ou_superadmin()` et non `is_admin()` (qui exclut le superadmin) — cf. leçon #26/#28.

### UX

**Fiche billet (membre)** — sous le bloc infos, à côté de « Retour à l'annuaire » :
- bouton discret `Signaler une erreur` (icône `fa-flag`) ;
- ouvre une modale : liste de motifs (Image incorrecte / Nom ou lieu erroné /
  Millésime ou version / Catégorie ou thème / Billet en double / Autre) + zone de commentaire
  (obligatoire, longueur max à fixer) + Envoyer / Annuler ;
- si l'utilisateur a déjà un signalement `nouveau`/`en_cours` sur ce billet : le bouton
  devient un état inerte « Signalement en cours » (avec la date), pas de formulaire ;
- après envoi : confirmation inline, bouton passe à « Signalement en cours ».

**Écran admin `admin-signalements.html`** (menu Administration, après « Gestion Demandes ») :
- onglets par état avec compteurs : Nouveaux / En cours / Traités / Rejetés, sur le modèle
  d'`admin-inscriptions.html` ;
- une carte par signalement : référence + nom du billet (lien vers `billet.html?id=`),
  vignette éventuelle, auteur, date, motif, commentaire ;
- actions : `Prendre en charge` (→ en_cours), `Marquer traité`, `Rejeter` — les deux
  dernières ouvrent un champ « réponse au membre » (facultatif) ;
- lien direct vers la fiche d'édition du billet dans `admin.html` pour corriger.

**Cloche du menu :**
- source `billet_report` (admins) : un item par signalement `nouveau`, sous-titre
  « REF — motif », lien vers `admin-signalements.html` ;
- source `signalement_traite` (auteur) : un item par signalement à lui, `traite`/`rejete`
  avec `auteur_vu_at` vide ; le clic pose `auteur_vu_at = now()` et amène sur la fiche du
  billet concerné (patron `marquerNotifLue`).

## Critères d'acceptation

1. Tout membre whitelisté connecté voit le bouton « Signaler une erreur » sur la fiche billet
   et peut envoyer motif + commentaire ; le commentaire vide est refusé.
2. Un membre qui a déjà un signalement ouvert sur ce billet voit « Signalement en cours » et
   ne peut pas en créer un second (garde-fou front **et** contrainte SQL).
3. Les admins et superadmins voient chaque signalement `nouveau` dans leur cloche, avec lien
   vers l'écran de traitement.
4. L'écran admin liste les signalements par onglet d'état, permet de les passer en cours,
   traités ou rejetés avec une réponse facultative, et lie vers le billet concerné.
5. Quand un signalement passe en `traite`/`rejete`, son auteur voit une notif dans sa cloche ;
   le clic la fait disparaître pour lui seul et affiche la réponse de l'admin.
6. RLS : un membre ne voit que ses propres signalements, ne peut pas changer l'état ni la
   réponse d'un signalement, ni signaler au nom d'un autre email.
7. Le mode impersonation (superadmin) reste cohérent : les signalements créés le sont au nom
   de l'identité effective — cf. point ouvert (b).

## Découpage proposé (ordre de dev)

1. Migration SQL + RLS, vérifiée via le Worker (lecture/écriture avec un email non-admin).
2. Fiche billet : bouton + modale + envoi + état « en cours ».
3. Écran admin `admin-signalements.html` / `.js` + entrée de menu.
4. Cloche : sources `billet_report` (admins) et `signalement_traite` (auteur).
5. `sw.js` (bump cache + nouveaux assets) et cache-buster `menu.html` dans `global.js`.
6. Notification « nouveauté » (table `notifications`, cible `tous`) + passage de la demande
   en `a_tester`.

## Points tranchés (2026-07-21, avant dev)

- **(a) UPDATE par l'auteur → fonction `SECURITY DEFINER`.** Pas de politique UPDATE pour
  l'auteur : `marquer_signalement_vu(p_id)` pose `auteur_vu_at = now()` **uniquement** si la
  ligne lui appartient et est déjà `traite`/`rejete`. L'auteur ne peut donc toucher à aucune
  autre colonne, et l'UPDATE reste réservé aux admins.
- **(b) Impersonation → acceptée telle quelle.** Un superadmin qui impersonne et signale crée
  la ligne avec son propre email (la RLS lit le vrai JWT). Cohérent avec le reste du site,
  pas de masquage du bouton.
- **(c) Purge → aucune.** Les signalements traités sont conservés indéfiniment comme
  historique du billet.

## Réalisation

- **Migration :** `scripts/migration-demande-5-signalements.sql` — table `signalements`,
  index unique partiel anti-doublon, trigger `updated_at`, RLS, fonction
  `marquer_signalement_vu()`. **À exécuter dans l'éditeur SQL Supabase avant déploiement**
  (le Worker admin ne relaie que `/rest/v1`, pas de DDL).
- **Fiche billet :** `billet.html` (bloc `.billet-fiche-actions` + bouton + zone d'état),
  `billet.js` (état du signalement, modale motif + commentaire, envoi, gestion du doublon).
- **Écran admin :** `admin-signalements.html` + `admin-signalements.js` (onglets
  nouveau / en cours / traité / non retenu, prise en charge, clôture avec réponse,
  réouverture), entrée « Signalements » dans le menu Administration (`menu.html`).
- **Cloche :** `global.js` — sources `billet_report` (admins) et `signalement_traite`
  (auteur), `window.SIGNALEMENT_MOTIFS` / `signalementMotifLabel()`,
  `marquerSignalementVu()` (appel RPC), icônes et clic dans `renderNotifications`.
- **Divers :** `style.css` (styles `btn-signaler`, `signalement-*`, `admin-sig-*`),
  `sw.js` (cache `billets-v253` + 2 assets), cache-buster `menu.html?v=163` dans `global.js`.
- **Email RÉEL partout** (pas `getActiveEmail()`) : la RLS compare `auteur_email` au vrai JWT,
  donc envoyer l'identité impersonnée ferait échouer l'INSERT — cf. point tranché (b).
- **Commit :** _(à compléter)_
