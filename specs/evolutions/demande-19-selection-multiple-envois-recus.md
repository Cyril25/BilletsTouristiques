# Demande #19 — Sélection multiple « marquer comme reçus » (historique des envois)

- **Épic :** Corrections et évolutions
- **Demande :** #19 (table `demandes`)
- **Priorité / Complexité :** haute / S
- **Concerne :** membres, collecteurs, admins
- **Écran :** Mes collectes → onglet « Historique des envois »
- **Statut :** À tester
- **Commit :** `9d4786e`

## Contexte (demande)

> Dans la gestion des envois, possibilité de sélectionner plusieurs envois pour marquer
> comme validé par les membres.
>
> Commentaire : « historique des envois ? oui c'est ça pour éviter d'aller dans chaque
> enveloppe pour marquer que c'est reçu ».

Aujourd'hui, marquer un envoi comme « reçu » se fait enveloppe par enveloppe (ouvrir
l'enveloppe → bouton). Sur du volume, c'est fastidieux.

## Analyse / décisions

- Le bon écran est l'onglet **Historique des envois** (`renderHistoriqueGlobal` /
  `buildHistoriqueCards` dans `mes-collectes.js`).
- La case à cocher n'apparaît **que sur les envois pas encore reçus** (`statut !== 'recue'`) :
  ce sont les seuls sur lesquels l'action groupée a un effet.
- L'action groupée réutilise le même changement d'état que l'action unitaire existante
  (`statut = 'recue'` + `date_reception = maintenant`), mais en **une seule requête**
  PATCH `enveloppes?id=in.(...)`.
- La sélection est conservée quand on filtre via la barre de recherche (les cases cochées
  restent cochées même si la carte sort du filtre).
- Périmètre volontairement limité : pas de « tout sélectionner », pas de modale de
  confirmation (cohérent avec les autres actions du fichier).

## Critères d'acceptation

1. Une case à cocher est présente sur chaque carte d'envoi non `recue` de l'historique.
2. Dès qu'au moins une case est cochée, une barre d'action apparaît avec le compteur
   (« N envois sélectionnés ») et un bouton « Marquer comme reçues ».
3. Le clic passe tous les envois sélectionnés à `recue` (date du jour) en une requête,
   affiche un toast, et rafraîchit la liste.
4. La sélection survit à la recherche/filtre.

## Réalisation

- **Fichiers :** `mes-collectes.js` (checkboxes + barre + `toggleHistoriqueSelect`,
  `updateHistoriqueBulkBar`, `marquerEnveloppesRecuesBulk`), `style.css`
  (`.historique-select-checkbox`, `.historique-bulk-bar`), `sw.js` (cache `billets-v233`).
- **Commit :** `9d4786e` — feat(collecteur): selection multiple pour marquer plusieurs envois comme recus.

## Évolution (2026-07-21) — choix du statut distribué / reçu

Retour d'un admin après test (demande rouverte en « nouvelle » avec commentaire
« faire un choix des membres et dire si on met en distribué ou en reçu ») :

- La sélection par cases à cocher couvrait déjà le « choix des membres ».
- Ajout d'un **menu déroulant** « Marquer comme : Reçu / Distribué » dans la barre d'action
  groupée. `appliquerStatutEnveloppesBulk()` remplace `marquerEnveloppesRecuesBulk()` :
  applique `recue` (+ `date_reception`) ou `distribuee` (+ `date_distribution`) aux envois
  sélectionnés. Les cases restent visibles sur les envois non encore reçus.
- **Fichiers :** `mes-collectes.js`, `style.css` (`.historique-bulk-select`), `sw.js`
  (cache `billets-v240`).
- **Commit :** `d6dbf0b` — feat(collecteur): choix du statut distribue/recu sur l'action groupee.
