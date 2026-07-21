# Demande #26 — Écran de statistiques (admin)

- **Épic :** Corrections et évolutions
- **Demande :** #26 (table `demandes`)
- **Priorité / Complexité :** basse / M
- **Concerne :** admins
- **Écran :** nouvel écran `admin-stats.html`
- **Statut :** À tester
- **Commit :** `8660c38`

## Contexte (demande)

> Créer un écran de stats avec des infos intéressantes : nombre de connectés
> (aujourd'hui / semaine / mois), membres actifs, billets collectés depuis l'ouverture du
> site (impossible à compter avant, avec les Google Sheets), collecteurs actifs dans
> l'année, autre… « Je te laisse regarder par rapport aux datas et trouver de bonnes idées. »

## Analyse / décisions

Exploration des données réelles (juillet 2026) pour ne retenir que des indicateurs fiables :
- `membres` : 102 comptes, `last_active_at` renseigné pour 61 (suivi récent) → connectés
  1j / 7j / 30j exploitables. Statut, rôle, pays disponibles.
- `inscriptions` : **datées depuis le 15/03/2026** (ouverture) → « billets collectés depuis
  l'ouverture » = somme `nb_normaux + nb_variantes` des inscriptions actives (~11 660). C'est
  précisément le chiffre « impossible avant ».
- `billets` : 5 418 (historique depuis 2015, dates de collecte) → catalogue par statut,
  et collecteurs actifs de l'année via `DateColl`.
- `collecteurs`, `enveloppes` : totaux / états.

Indicateurs retenus (validés avec Cyril, finition « travaillée », sans librairie externe /
CSP stricte, graphes en CSS) :
- **Cartes KPI** : membres actifs, connectés (1j/7j/30j), billets collectés depuis
  l'ouverture, inscriptions actives (split normaux/variantes), collecteurs actifs de
  l'année, billets au catalogue.
- **Graphes** : inscriptions par mois (barres verticales), membres par pays (drapeaux),
  état des envois, **top collecteurs** (billets collectés), catalogue par statut.

Notes :
- Le mapping pays → drapeau a été **factorisé dans global.js** (partagé avec la demande #2).
- Normalisation d'un souci d'encodage résiduel sur la catégorie « Terminé ».
- Support ajouté pour les **notifications ciblées** (colonne `notifications.cible`,
  `migration-demande-26-notif-cible.sql`) afin que l'annonce de cette page ne soit envoyée
  qu'aux admins.

## Critères d'acceptation

1. Une page `admin-stats.html` réservée aux admins affiche les cartes KPI ci-dessus,
   calculées depuis les données réelles.
2. Les graphes (mois, pays, envois, top collecteurs, catalogue) s'affichent sans librairie
   externe.
3. Un lien « Statistiques » est présent dans le menu Administration.
4. La page indique la date d'arrêté des données et rappelle que les inscriptions sont
   suivies depuis l'ouverture (mars 2026).

## Réalisation

- **Fichiers :** `admin-stats.html` + `admin-stats.js` (nouveaux), `menu.html` (lien +
  cloche déjà gérée), `global.js` (helpers `_normPays`/`PAYS_FLAGS`/`flagPays` factorisés,
  bump `menu.html?v=162`), `users.js` (utilise les helpers globaux), `sw.js`
  (cache `billets-v243` + assets), `scripts/migration-demande-26-notif-cible.sql`.
- **Vérif :** calculs testés contre les données réelles (billets collectés, top collecteurs).
- **Commit :** `8660c38` — feat(admin): ecran de statistiques.
