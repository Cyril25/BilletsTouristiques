# Demande #46 — Bug : les écrans ignorent le périmètre (« scope ») de la collecte

- **Table `demandes`** : #46 (priorité haute, complexité S → M, périmètre élargi).
- **Statut** : À tester
- **Deux volets** : (1) le message prix / version / FDP de `billets.html` ;
  (2) les quantités et montants de `mes-inscriptions.html` et `mes-collectes.html`
  (signalé par Cyril juste après la livraison du volet 1 — même cause racine).

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

---

# Volet 2 — « Mes inscriptions » et « Mes collectes » comptent les normaux

## Contexte

Retour de Cyril juste après la livraison du volet 1 :

> « Sur mes-inscriptions et mes-collectes, pour une collecte avec un scope "variante",
> le formulaire de collecte fonctionne, le formulaire d'inscription aussi, mais dans
> ces deux écrans on dirait que c'est le nombre de "normaux" et le prix des "normaux"
> qui est pris en compte. »

## Analyse

Même cause racine que le volet 1, mais une conséquence plus grave : les deux écrans
**remettaient `nb_variantes` à 0** quand le BILLET ne déclarait pas de variante
(`HasVariante` absent ou `'N'`), garde-fou hérité de l'époque où le commercial vivait
sur le billet. Sur une collecte de scope `variante` portée par un tel billet :

- la quantité variante de l'inscription était effacée côté client ;
- le montant tombait à `prix (NULL → 0) × nb_normaux (0) = 0,00 €` ;
- les colonnes / compteurs n'affichaient que « Normaux ».

Reproduit sur les données de test : billet **5477** (`HasVariante = 'N'`) et **5504**
(`HasVariante` NULL), tous deux porteurs d'une collecte de scope `variante` ; 13
inscriptions réelles concernées (dont celle de Cyril, #5542 : 1 variante à 3,50 €
affichée 0,00 €). Le billet 5505 (`HasVariante = 'D'`) n'était pas touché — d'où un
symptôme « aléatoire » selon le billet.

**Décision** : la règle du volet 1 devient une **fonction unique de `global.js`**
(`versionsOuvertesCollecte` + son union `versionsOuvertesCollectes`), utilisée par le
catalogue, `mes-inscriptions.js` et `mes-collectes.js`. Le scope décide ; le billet ne
donne que le libellé de la variante et sert de repli si la collecte est inconnue.

La normalisation des quantités est **conservée** (elle protège des valeurs résiduelles)
mais devient symétrique et pilotée par le scope : hors périmètre `normale` → `nb_normaux
= 0` ; hors périmètre `variante` → `nb_variantes = 0`. C'est ce que la base impose déjà
(trigger D4).

## Critères d'acceptation

- « Mes inscriptions » : une inscription sur une collecte `variante` affiche la bonne
  quantité (« 1 var. ») et le bon montant (prix variante × quantité), y compris dans le
  récap par collecteur, le total dû et la note PayPal.
- « Mes collectes » : le détail d'une collecte `variante` affiche la colonne
  **Variantes** (et pas « Normaux »), les bons compteurs, le bon montant par ligne, le
  bon total, et l'en-tête montre le prix variante.
- Modifier une pré-inscription sur une collecte `variante` propose le champ variantes
  (avant : aucun champ, donc modification impossible).
- Export CSV, relances, vérification des paiements, historique des paiements et
  enveloppes : mêmes quantités que l'écran.
- Aucun changement sur les collectes de scope `normal` / `les_deux` (cas courant).

## Réalisation (volet 2)

- `global.js` : `versionsOuvertesCollecte(billet, collecte)` et
  `versionsOuvertesCollectes(billet, collectes)` (union) — source unique, section « 1d ».
- `app-new.js` : la fonction locale du volet 1 délègue à celle de `global.js`.
- `mes-inscriptions.js` : normalisation des quantités déplacée **après** le chargement
  des collectes et pilotée par le scope ; modale « modifier une pré-inscription » (champs
  proposés **et** validation) alignée sur le même périmètre.
- `mes-collectes.js` : 15 emplacements basculés du billet vers la collecte —
  normalisations (détail, enveloppes, vérification des paiements), colonnes et compteurs
  du détail (union de mes collectes du billet), prix d'en-tête, `countBillets`, lignes
  d'enveloppe et historique, détail des quantités et montants des paiements, relances
  (individuelle et globale), export CSV, modale « inscrire un membre », colspan du
  formulaire d'expédition.
- `sw.js` v276 / `global.js` menu v184.
- **Commit** : `b08331c`

## Suite éventuelle (hors périmètre)

Le mini-formulaire rapide d'admin (`showCollecteQuickForm`) et `recalculerAutoInscriptions`
utilisent une règle d'**intersection** (scope ∩ versions déclarées du billet) : sur un
billet `HasVariante = 'N'` portant une collecte de scope `variante` (cas 5477), ils
n'ouvrent aucun champ de prix. La modale de collecte, elle, ne regarde que le scope.
À harmoniser si le cas se reproduit hors données de test.

Deux points repérés en traitant le volet 2, **volontairement pas corrigés ici** :

- `renderCollecteSupplementaireCard` / `openCollecteDetailSupp` (mes-collectes.js) portent
  encore l'ancienne règle billet, mais sont **inatteignables** : `mesCollectesSupp` est
  remis à `[]` depuis la fusion des flux (#16) et `loadMesCollectesSupplementaires` n'est
  plus appelée. À supprimer avec le reste de la dette cosmétique.
- « Vérification des paiements » et « Enveloppes » chargent les inscriptions par
  `billet_id` sans filtrer sur MES collectes : si un autre collecteur ouvre une collecte
  sur le même billet, ses inscriptions apparaissent dans ma vue (défaut **préexistant**,
  antérieur à #46 ; pour ces inscriptions-là le périmètre retombe sur les versions du
  billet, comme avant). À trancher séparément.
