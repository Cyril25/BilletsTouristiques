# Demande #36 — Bug : la collecte de base apparaît en double sur la carte admin

- **Table `demandes`** : #36 (priorité normale, complexité S).
- **Statut** : À tester

## Contexte

« Quand on ajoute une deuxième collecte à un billet, la première collecte apparaît deux
fois. » Précision de Cyril (2026-07-24) : sur **admin.html**, un billet à une seule
collecte n'affiche qu'un badge ; mais dès qu'on ajoute une collecte supplémentaire, la
collecte de base apparaît **à la fois** dans le badge total
(`admin-card-inscriptions-badge`) **et** dans les badges par collecte
(`admin-card-collecte-supp-badge`).

> Première analyse (erronée) : cherchait un doublon en base — il n'y en a pas. Le
> doublon est bien un doublon **d'affichage** sur la carte admin.

## Analyse / décision

Dans `buildBilletCard` (admin.js), la section « badges collectes supplémentaires »
mappait **toutes** les collectes du billet (dès qu'il y en a ≥ 2), y compris la
**principale**. Or la principale est déjà représentée par le badge total au-dessus →
elle apparaît deux fois.

**Correctif** : ne lister en badges « supplémentaires » que les collectes réellement
supplémentaires, c.-à-d. **exclure la collecte principale**
(`collectePrincipaleBilletAdmin`). Cohérent avec le catalogue (app-new.js), où
`collectesByBillet` exclut déjà la principale.

## Critères d'acceptation

- 1 collecte → 1 badge (inchangé).
- 2+ collectes → badge total du billet + un badge par collecte **supplémentaire**
  (la collecte de base n'apparaît qu'une fois).

## Réalisation

- `admin.js` : dans les badges collectes, filtrer `c !== collectePrincipaleBilletAdmin(docId)`
  avant le `map` ; ne rien afficher s'il n'y a pas de supplémentaire.
- `sw.js` v265, `menu.html` v173.
- **Commit** : _(complété après commit)_
