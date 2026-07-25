# Demande #33 — Notification ciblée sur un membre (par email)

- **Épic :** Corrections et évolutions
- **Demande :** #33 (table `demandes`)
- **Priorité / Complexité :** haute / S
- **Concerne :** membres, collecteurs, admins
- **Écran :** Gestion Demandes (`admin-demandes.html`) + cloche / Nouveautés (`notifications.html`)
- **Statut :** À tester
- **Commit :** _(voir Réalisation)_

## Contexte (demande)

> Mettre en place la possibilité d'envoyer une notification pour un membre (associé à son
> adresse email), on pourra s'en servir par exemple si ce membre (ici un admin) a fait une
> demande d'amélioration du site, mais que cette demande passe à « à cadrer », ou alors aussi
> lorsqu'elle passera « à tester » (tu peux l'implémenter en même temps à mon avis). Cette
> notif apparaîtra au niveau de la cloche ainsi que sur la page des nouveautés, elle devra bien
> s'afficher uniquement pour l'utilisateur cible.

Le système de notifications (#28) est **broadcast** : une notif s'adresse à `tous` /
`collecteurs` / `admins` (colonne `cible`, #26 + notif-cibles-3-niveaux). Il manque la
possibilité d'adresser une notif à **une personne précise**, et de s'en servir pour le suivi
des demandes d'amélioration.

## Analyse / décisions

- **Nouvelle colonne `notifications.cible_email` (nullable)** plutôt qu'une nouvelle valeur de
  `cible` : `cible` reste le niveau d'audience (broadcast), `cible_email` porte le
  destinataire nominatif. `NULL` = comportement broadcast inchangé.
- **Confidentialité par la RLS, pas par le front.** La demande insiste : « uniquement pour
  l'utilisateur cible ». La policy `notifications_select` est réécrite : si `cible_email` est
  renseigné, la notif n'est visible **que** du membre dont l'email correspond — **y compris
  masquée aux admins/superadmins**. Sinon, la logique de diffusion existante (`tous` /
  `is_admin_ou_superadmin()` / `collecteurs`) s'applique à l'identique. Filtrer côté front
  aurait laissé fuiter la notif dans les réponses de tout admin.
- **Comparaison d'email insensible à la casse** (`lower() = lower()`) : les emails Google
  arrivent en minuscules dans le JWT, mais un `demandeur` importé depuis le Google Sheet peut
  avoir une casse différente.
- **Aucun changement côté lecture (cloche + page Nouveautés).** Une notif ciblée est créée avec
  `cible = 'tous'` (défaut) : le filtre client `notifVisiblePour('tous', …)` la laisse passer,
  et c'est la RLS qui garantit que **seul** le destinataire a reçu la ligne. La cloche
  (`global.js`) et `notifications.js` fonctionnent donc **sans modification**. (Bénéfice
  secondaire recherché ici : ne pas toucher `global.js`, en cours de refonte sur la branche
  #16, pour éviter tout conflit de merge.)
- **Branchement métier = suivi des demandes.** Dans `admin-demandes.js`, quand une demande
  passe à `a_cadrer` ou `a_tester` (via le select rapide **ou** l'édition en modale), on crée
  une notif privée à destination de `demande.demandeur` :
  - `a_cadrer` → « Votre demande a besoin d'une précision… » ;
  - `a_tester` → « Votre demande est prête à tester… ».
- **Best-effort, non bloquant.** L'insertion de la notif est en fire-and-forget (`.catch`) :
  un demandeur non nominatif (`Import Google Sheet`, vide) est ignoré via une validation
  d'email, et un échec (p.ex. migration `cible_email` pas encore jouée) ne bloque jamais le
  changement d'état de la demande.
- **Pas de bump de cache-buster (`sw.js` / `menu.html`).** Les assets du site sont servis
  *Network First* (`fetch … cache:'no-cache'`) : un admin en ligne récupère toujours le dernier
  `admin-demandes.js`. On évite ainsi la ligne de version de `sw.js`, elle aussi modifiée par
  la branche #16 (conflit de merge inutile).
- **Limite connue (mineure, admin only).** En impersonation, la cloche est alimentée par la RLS
  sur le **vrai** jeton : un admin qui s'impersonne en un autre membre verrait ses **propres**
  notifs privées (pas celles de l'impersonné). Aucune fuite, simple manque de fidélité de la
  vue impersonation ; non traité (le front ne connaît pas `cible_email`).

## Critères d'acceptation

1. Passer une demande à « À tester » crée, pour le membre `demandeur` (si email valide), une
   notification qui apparaît dans sa cloche et sur sa page Nouveautés.
2. Passer une demande à « À cadrer » fait de même avec un message « précision attendue ».
3. La notification ciblée **n'apparaît pour aucun autre membre**, ni pour les admins autres que
   la cible.
4. Le changement d'état fonctionne que la notif parte ou non (demandeur non nominatif, ou
   migration pas encore jouée) — jamais de blocage ni d'erreur bloquante.
5. Repasser une demande au même état, ou vers un autre état que `a_cadrer`/`a_tester`, ne crée
   pas de notification.
6. Les notifications broadcast existantes (`tous` / `collecteurs` / `admins`) restent visibles
   comme avant.

## Vérification

- Syntaxe `admin-demandes.js` validée (`node --check`).
- Logique RLS relue à la main : `cible_email` renseigné ⇒ seul `lower(email)=lower(jwt.email)`
  passe (admins compris exclus) ; `cible_email` NULL ⇒ clause de diffusion identique à
  `migration-notif-cibles-3-niveaux.sql`.
- **Non vérifié :** parcours réel dans Supabase (migration à jouer) + rendu cloche/Nouveautés
  côté membre. À tester par Cyril.

## Réalisation

- **Fichiers :** `admin-demandes.js` (`notifierDemandeurSiSuivi`, helpers `estEmailValide` /
  `resumeDemande`, branchés dans `changerEtat` et `sauverDemande`).
- **Migration :** `scripts/migration-demande-33-notif-ciblee-membre.sql` (colonne `cible_email`
  + réécriture de `notifications_select`) — **à jouer dans le SQL Editor Supabase (PROD)**.
- **Cache-buster :** aucun (assets Network First ; volontairement pas de bump, cf. Analyse).
- **Index `specs/evolutions/README.md` :** ligne **non ajoutée** volontairement (l'index est
  modifié par la branche #16 en gros test → on évite le conflit) ; à ajouter après le merge #16.
- **Commit :** _(à compléter)_
