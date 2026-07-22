# Demande #30 — Pagination de la page Nouveautés

- **Épic :** Corrections et évolutions
- **Demande :** #30 (table `demandes`)
- **Priorité / Complexité :** normale / S
- **Concerne :** membres, collecteurs, admins
- **Écran :** Nouveautés (`notifications.html`)
- **Statut :** À tester
- **Commit :** _(voir Réalisation)_

## Contexte (demande)

> Pour la page des notifications, mettre en place une pagination.

La page Nouveautés (demande #28) affiche **toutes** les notifications d'un coup, du plus récent
au plus ancien. Il y en a 11 aujourd'hui, mais on en crée une à chaque demande livrée : la liste
n'a pas de fin et deviendra vite longue à parcourir.

## Analyse / décisions

- **Pagination côté client**, pas de `limit/offset` en base : la page charge déjà toutes les
  notifs en une requête (elles sont peu nombreuses et le filtrage par audience se fait aussi
  côté client, cf. #26). Découper en base obligerait à re-paginer après filtrage — complexité
  inutile ici. Même approche que la liste admin (`admin.js`).
- **10 notifications par page.** Assez pour couvrir une visite normale sans scroll interminable.
- **Composant de pagination réutilisé** : les classes `.admin-pagination*` (`style.css`) sont
  génériques et déjà stylées. On les réutilise plutôt que de dupliquer ~50 lignes de CSS.
  Le préfixe `admin-` est un peu trompeur sur une page membre — trade-off assumé : renommer
  les classes toucherait `admin.html`/`admin.js` pour un gain cosmétique. Le commentaire de
  section CSS a été mis à jour pour signaler que le bloc est désormais partagé.
- **Contrôles simples** (Précédent / n° de page / Suivant / compteur), sans les ellipses de
  `admin.js` : à une notif par demande livrée, on parlera de 3-4 pages, pas de 50. Le code
  d'ellipses vit dans `admin.js` qui n'est pas chargé sur cette page ; le dupliquer coûterait
  plus qu'il ne rapporte.
- **Marquage « lu » inchangé — décision importante.** Ouvrir la page marque comme lues **toutes**
  les notifs visibles par le membre, pas seulement celles de la page affichée. C'est le
  comportement d'avant la #30 (tout était affiché donc tout était marqué) : la cloche se vide en
  une visite. L'alternative (ne marquer que la page consultée) obligerait un membre absent
  longtemps à cliquer sur chaque page pour vider sa cloche. À rediscuter si le besoin apparaît.
- **Badge « Nouveau » stable pendant la navigation** : il s'appuie sur un snapshot des notifs
  lues pris **au chargement** (`notifsVues`), pas sur l'état en base. Sans ça, le marquage
  asynchrone déclenché au chargement ferait disparaître les badges en changeant de page.
- **Remontée en haut de page** au changement de page, sinon on arrive au milieu de la liste.

## Critères d'acceptation

1. Avec plus de 10 notifications visibles, la page affiche les 10 plus récentes et des contrôles
   de pagination ; les suivantes sont sur la page 2, etc.
2. Avec 10 notifications ou moins, aucun contrôle de pagination n'est affiché.
3. « Précédent » est désactivé sur la première page, « Suivant » sur la dernière ; le numéro de
   la page courante est mis en évidence.
4. Le compteur indique le nombre total de nouveautés et la page courante.
5. Les badges « Nouveau » et les badges de cible (#29) restent corrects et stables quand on
   navigue d'une page à l'autre.
6. La cloche se vide dès la première ouverture de la page, sans avoir à parcourir les pages.

## Vérification

Rendu et pagination testés hors navigateur via un harnais Node (stub DOM) sur un jeu de
11 notifications : page 1 = notifs 1→10, page 2 = notif 11, badges de cible présents uniquement
sur les notifs ciblées, `Précédent`/`Suivant` désactivés aux extrémités, pagination masquée à
6 notifications. **Non vérifié :** le rendu visuel réel (mobile notamment).

## Réalisation

- **Fichiers :** `notifications.js` (état de page `notifsFiltrees`/`notifsVues`/`notifsPageCourante`,
  `renderNotifsPage`, `renderNotifsPagination`, délégation de clic), `notifications.html`
  (conteneur `#notifs-pagination`), `style.css` (commentaire de section), `sw.js` (cache `billets-v259`),
  `global.js` (cache-buster `menu.html?v=167`).
- **Migration :** aucune.
- **Commit :** `5c1f1e1` — feat(notifications): demande #30 - pagination de la page Nouveautes.
