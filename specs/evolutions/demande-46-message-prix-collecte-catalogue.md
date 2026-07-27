# Demande #46 — Bug : le message prix / version / FDP disparaît sur billets.html

- **Table `demandes`** : #46 (priorité haute, complexité S).
- **Statut** : À tester

## Contexte

Retour de test #16 (Cyril, 2026-07-25) :

> « Sur la page billets.html, sur les nouveaux billets (avec multi collecte) on ne voit
> que "Par [nom collecteur]" mais pas la suite du message qui donne le prix, la version,
> et le fait qu'on paie ou non les fdp. »

Reproduit sur la copie de test : billets **5477** (collecte « Charlemagne ») et **5505**
(collecte « On s'en fou »), tous deux multi-collecte, dont la collecte affichée est de
**scope `variante`** (prix normal vide, `prix_variante` renseigné).

## Analyse / décision

La phrase de la carte était construite à partir des **versions déclarées du BILLET**
(`VersionNormaleExiste` / `HasVariante`), alors que depuis #16 le prix vit sur la
**COLLECTE** et que c'est son `scope` qui dit ce qui est ouvert :

- collecte de scope `variante` → `prix` est NULL, donc `prixNormal = 0` ;
- le billet, lui, déclare `VersionNormaleExiste = true` et souvent `HasVariante = 'N'` ;
- aucune des trois branches du message ne passait → seul « Par &lt;collecteur&gt; » restait.

Le symptôme inverse existait aussi : une collecte de scope `normal` sur un billet qui
déclare une variante annonçait « X euros version normale & X euros version V », c.-à-d.
un prix variante que cette collecte ne vend pas.

**Décision** : la source de vérité du périmètre est le **`scope` de la collecte
affichée** — cohérent avec la modale d'admin, qui exige le prix correspondant au scope
(`admin.js`, validation `field-collecte-scope`), et avec `admin-pre-inscriptions.js`.
Le billet ne fournit plus que le **libellé** de la variante (`HasVariante`), et sert de
repli quand la collecte n'a pas de scope (données anciennes) ou qu'il n'y a pas de
collecte du tout. Règle centralisée dans **une seule fonction** réutilisée par le message
de prix ET les deux formulaires d'inscription du catalogue.

Deux points traités au passage, même racine :

1. **FDP** : le « + X€ fdp » n'apparaissait que si le pays du membre était connu ; le fait
   de payer les FDP est désormais toujours visible (« + frais de port » à défaut de tarif).
2. **Collecte affichée non déterministe** : `compareCollecteRecentDabord` renvoyait `0`
   quand deux collectes ont la même `date_pre` (fréquent : deux collectes ouvertes le même
   jour, cas du billet 5504) → l'ordre dépendait de celui rendu par l'API, donc le prix /
   statut / dates affichés pouvaient changer d'un chargement à l'autre. Départage ajouté
   sur `created_at`, dans le catalogue **et** sur la fiche `billet.html` (même critère).

**Compatibilité vérifiée sur les données** : les 104 collectes historiques de scope
`les_deux` sans `prix_variante` propre gardent leur libellé d'origine (« X euros version
normale & X euros version V ») — le prix variante retombe sur le prix normal pour
l'affichage, comme il le fait déjà pour le calcul des montants.

## Critères d'acceptation

- Sur un billet dont la collecte affichée est de scope `variante` avec un prix variante :
  la carte affiche « Par &lt;collecteur&gt; au prix de X euros uniquement version &lt;V&gt; ».
- Sur une collecte de scope `normal` : aucun prix variante n'est annoncé, même si le
  billet déclare une variante.
- Sur une collecte `les_deux` : les deux prix sont annoncés (comportement inchangé).
- Quand la collecte fait payer les frais de port, la carte le dit toujours (montant si
  calculable, « + frais de port » sinon).
- Le formulaire « S'inscrire » de la carte ne propose que les versions ouvertes par la
  collecte (une collecte `variante` ne propose plus « Nb normaux »).
- Deux collectes ouvertes le même jour : la collecte mise en avant est stable d'un
  chargement à l'autre, et identique entre le catalogue et la fiche billet.

## Réalisation

- `app-new.js` :
  - `versionsOuvertesCatalogue(item, collecte)` (nouveau) : périmètre ouvert
    (`normale` / `variante` / `libelleVariante`) déduit du scope de la collecte, repli
    sur les versions déclarées du billet.
  - `prixCollecteCatalogue` : expose `prixVarSaisi` (prix variante réellement saisi) en
    plus de `prixVar` (repli sur le prix normal) — sémantique de `prixVar` inchangée.
  - message de la carte (`showMore`) : branches réécrites sur `versions` + libellé de
    variante échappé ; FDP toujours mentionnés quand `payer_fdp = 'oui'`.
  - `ouvrirInscription` et `ouvrirInscriptionCollecte` : même règle de périmètre via
    `versionsOuvertesCatalogue` (l'inscription principale ignorait le scope).
  - `compareCollecteRecentDabord` : départage `created_at` à `date_pre` égale.
- `billet.js` : même départage `created_at` dans le tri de la fiche.
- `sw.js` v275 / `global.js` menu v183.
- **Commit** : `22257a0`

## Suite éventuelle (hors périmètre)

Le mini-formulaire rapide d'admin (`showCollecteQuickForm`) et `recalculerAutoInscriptions`
utilisent une règle d'**intersection** (scope ∩ versions déclarées du billet) : sur un
billet `HasVariante = 'N'` portant une collecte de scope `variante` (cas 5477), ils
n'ouvrent aucun champ de prix. La modale de collecte, elle, ne regarde que le scope.
À harmoniser si le cas se reproduit hors données de test.
