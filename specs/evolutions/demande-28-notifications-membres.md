# Demande #28 — Notifications pour tous les membres (nouveautés)

- **Épic :** Corrections et évolutions
- **Demande :** #28 (table `demandes`)
- **Priorité / Complexité :** normale / M (en pratique proche d'un L)
- **Concerne :** membres, collecteurs, admins
- **Écran :** Menu (cloche) + nouvelle page `notifications.html`
- **Statut :** À tester
- **Commit :** `f3a2710`

## Contexte (demande)

> On a déjà une notification qui prévient les admins d'une demande d'inscription. On veut
> utiliser ce système pour **tous les membres**, pour les informer d'une nouvelle
> fonctionnalité : une notif à chaque nouveauté, qui disparaît quand le membre clique
> dessus (pour lui seulement) et l'amène sur une page listant toutes les notifications.
> (À l'avenir : aussi nouveau billet, passage en collecte, clôture…)

## Analyse / décisions

- **Migration** (`scripts/migration-demande-28-notifications.sql`, exécutée avant déploiement) :
  - `notifications` : diffusion à tous — `id, type (défaut 'nouveaute'), titre, texte, lien, created_at`.
  - `notifications_vues` : dismiss **par membre** — `(notification_id, membre_email, vue_at)`.
  - RLS sans `TO authenticated` (cf. convention Firebase JWT → anon) : lecture `notifications`
    pour tout membre whitelisté, écriture réservée aux admins (`is_admin()`) ; chaque membre
    ne lit/écrit que ses propres `notifications_vues` (`auth.jwt() ->> 'email'`).
- **Page dédiée** `notifications.html` (choix : nouvelle page plutôt que l'accueil, plus
  extensible pour les futurs types). Accessible via la cloche **et** un lien « Nouveautés »
  dans le menu « Mon espace ».
- **Cloche pour tous** : le wrapper n'est plus `admin-only`. `refreshNotifications(role)`
  agrège désormais : nouveautés non lues (tous) + demandes d'inscription (admins). Un clic
  sur une nouveauté insère la ligne `notifications_vues` (Prefer `ignore-duplicates`) puis
  navigue.
- **Visite de la page** = marque comme lues toutes les nouveautés non encore vues (vide la
  cloche), tout en affichant l'historique complet avec un badge « Nouveau » sur celles qui
  l'étaient.
- **Création des notifs** : par le back (admin via RLS) ou par moi via le Worker
  (service_role). Convention associée : à la fin de chaque demande traitée, créer une notif
  (titre + texte) — cf. mémoire `feedback_traiter_demandes`.

## Critères d'acceptation

1. Tout membre connecté voit la cloche ; elle compte les nouveautés qu'il n'a pas encore lues.
2. Cliquer une nouveauté la fait disparaître **pour ce membre uniquement** et l'amène sur la
   page Nouveautés.
3. La page `notifications.html` liste toutes les notifications (titre + texte + date), avec un
   badge « Nouveau » sur les non lues, et les marque lues à la visite.
4. Les demandes d'inscription continuent de notifier les admins (inchangé).
5. RLS : un membre ne peut pas voir/modifier les « vues » d'un autre ni créer de notif.

## Réalisation

- **Migration :** `scripts/migration-demande-28-notifications.sql`.
- **Fichiers :** `menu.html` (cloche non admin-only + lien « Nouveautés »), `global.js`
  (`refreshNotifications(role)`, `marquerNotifLue`, `renderNotifications` multi-sources,
  bump `menu.html?v=161`), `notifications.html` + `notifications.js` (nouvelle page),
  `sw.js` (cache `billets-v241` + assets ajoutés).
- **Première notification** créée (annonce de la fonctionnalité Nouveautés).
- **Commit :** `f3a2710` — feat(notifications): notifs nouveautes pour tous les membres.
