# Demande #48 — Inscriptions par collecte (admin) + fin du rattachement au billet

- **Table `demandes`** : #48 (priorité haute, complexité M).
- **Statut** : À tester

## Contexte

> « Il faudrait que l'admin puisse voir de manière simple le nombre d'inscriptions pour
> chaque collecte (si un billet a deux collectes par exemple), et puisse les modifier.
> Actuellement on a sur l'écran admin.html la possibilité de voir les inscriptions d'une
> seule des deux collectes ce qui pose problème. […] "Vérification des paiements" et
> "Enveloppes" chargent les inscriptions par billet_id sans filtrer sur tes collectes […]
> c'est très grave, on ne doit plus rien rattacher au billet qui ne doit pas l'être, les
> inscriptions sont liées à une collecte et non à un billet c'est juste ? »

## Réponse à la question de fond

**Oui.** Depuis #16, une inscription appartient à sa **collecte** :
`inscriptions.collecte_id` porte le rattachement (0 ligne à NULL sur la copie de test, le
front refuse d'en créer une sans collecte, la clé d'unicité métier est
`(collecte_id, membre_email)` — c'est elle qu'utilisent les `on_conflict` des upserts).
`inscriptions.billet_id` **subsiste en redondance dénormalisée** (hérité d'avant #16,
pratique pour les jointures d'affichage) — et c'est précisément ce qui a permis à
plusieurs écrans de continuer à raisonner « par billet » par erreur.

Décision : on **garde** la colonne (elle évite une jointure sur des écrans très
fréquentés) mais **aucune vue métier ne doit plus s'en servir pour décider ce qu'elle
affiche ou modifie**. Le filtre par billet reste légitime uniquement pour l'admin, qui
voit tout, et à condition de **grouper par collecte** à l'affichage.

## Volet A — admin : voir et modifier les inscriptions par collecte

État constaté :

- la modale « Inscriptions » (`admin.html` / page d'édition billet) charge
  `inscriptions?billet_id=eq.X` et les affiche **à plat**, sans dire de quelle collecte
  vient chaque ligne, avec un total unique ;
- l'ajout d'une inscription vise **toujours** `collectePrincipaleBilletAdmin()` : sur un
  billet à deux collectes, impossible d'inscrire quelqu'un sur la seconde ;
- les colonnes Normaux/Variantes sont pilotées par les versions du **billet** (même
  défaut que #46, pas encore corrigé côté admin) ;
- les compteurs par collecte existent déjà en mémoire
  (`adminCollecteInscriptionCounts`, RPC `compteurs_inscriptions_par_collecte`) mais ne
  servent qu'au badge de capacité (#24).

Décisions :

- **A1** — la liste des collectes (page d'édition billet) affiche un badge
  « N inscription(s) » par collecte, **cliquable** : il ouvre la modale sur cette collecte.
- **A2** — sur la carte `admin.html` en multi-collecte, chaque ligne de collecte affiche
  son nombre d'inscriptions (le badge global du billet reste, il donne le total).
- **A3** — la modale groupe les inscriptions **par collecte** : une section par collecte
  (nom, statut, périmètre, prix), ses totaux, son tableau, et son propre bouton
  « Ajouter une inscription ». Les colonnes de chaque section suivent le **scope de la
  collecte** (`versionsOuvertesCollecte`, global.js — cohérence avec #46).
- **A4** — le formulaire d'ajout/édition cible la collecte de la section (création) ou
  celle de l'inscription (édition), et permet de **déplacer** une inscription vers une
  autre collecte du billet. Garde-fous : on ne propose que les collectes dont le scope
  couvre les quantités saisies et où le membre n'est pas déjà inscrit (l'unicité
  `(collecte_id, membre_email)` et le trigger D4 refuseraient de toute façon en base,
  avec un message peu lisible).

## Volet B — plus rien « par billet » là où ça doit être « par collecte »

Audit des requêtes `inscriptions?…billet_id…` :

| Fichier | Usage | Verdict |
|---|---|---|
| `mes-collectes.js` liste + détail | filtrées ensuite sur `collectesMapGlobal` / `currentCollectesMap` | déjà OK |
| `mes-collectes.js` enveloppes (x2), vérification paiements, paiements confirmés, relance | **non filtrées** | **fuite — à corriger** |
| `admin.js` (modale, recalculs, blacklist, garde-fous) | admin = voit tout | OK, mais la modale doit **grouper** (volet A) |
| `admin-stats.js` | statistiques globales | OK |
| `mes-inscriptions.js` | requête par membre | OK |

**Impact réel mesuré sur la copie de test** : 3 billets portent des collectes de
collecteurs différents (5477 Laura/Antoine, 5491 Alain/Jean-Philippe, 5504
Cyril/Jean-Philippe). Sur le seul billet 5477, Laura voit ses 11 inscriptions **et les 26
d'Antoine** dans sa vérification des paiements, ses enveloppes et ses relances — donc elle
peut réclamer un paiement qui ne lui est pas dû, ou mettre en enveloppe des billets qui ne
sont pas les siens.

**Décision (B2)** : filtrage **côté client**, systématique, via un helper unique
(`inscriptionsDeMesCollectes`) appliqué juste après chaque `fetch`. On ne passe pas le
filtre côté serveur (`collecte_id=in.(…)`) : le plus gros collecteur a **1 620 collectes**
sur la copie, soit une URL de ~60 ko — au-delà de toute limite. Le filtre serveur reste
`billet_id` (index, court) et le client ne garde que ses collectes, exactement comme le
font déjà la liste et le détail.

## Critères d'acceptation

- Sur un billet à 2 collectes, l'admin voit **d'un coup d'œil** le nombre d'inscriptions
  de chacune (liste des collectes + carte multi-collecte).
- La modale affiche une section par collecte ; ajouter une inscription depuis une section
  la crée bien **sur cette collecte**.
- Les colonnes d'une section suivent le scope de sa collecte (une collecte « variante »
  n'affiche pas de colonne « Normaux »).
- Une inscription peut être déplacée d'une collecte à l'autre quand c'est cohérent, et le
  cas incohérent est refusé **avant** l'appel réseau, avec un message clair.
- Un collecteur ne voit plus, dans « Vérification des paiements », « Enveloppes » et les
  relances, que les inscriptions **de ses propres collectes** — vérifié sur le billet 5477
  (Laura ne doit plus voir les 26 inscriptions d'Antoine).

## Réalisation

**Volet A — `admin.js` / `style.css`**

- `adminCollectesDuBillet` / `adminCollecteDuBillet` / `adminInscriptionsDeCollecte` :
  petits helpers de regroupement (principale d'abord).
- `renderInscriptionsModalContent` **réécrite** : une section par collecte (nom + scope,
  statut coloré, collecteur, prix, bouton « Ajouter »), totaux par collecte, colonnes
  issues de `versionsOuvertesCollecte`, plus un bloc défensif « Collecte inconnue » si une
  inscription pointe une collecte absente du billet. Ligne de rappel du total quand il y a
  plusieurs collectes. Les compteurs par collecte sont rafraîchis depuis ce qui vient
  d'être lu (pas de RPC global après chaque ajout).
- `openInscriptionsModal(billetId, focusCollecteId)` : la modale peut s'ouvrir positionnée
  sur une collecte ; le focus est conservé au rechargement, oublié si on change de billet.
- `openAdminAddInscription(collecteId)` / `renderAdminInscriptionForm(…, collecte)` /
  `submitAdminAddInscription(collecteId)` : le formulaire vise **la collecte de la
  section**. Le filtrage des membres déjà inscrits devient **par collecte** (le même membre
  peut légitimement s'inscrire aux deux collectes d'un billet).
- Édition : select **Collecte** (déplacement d'une inscription), limité aux collectes où le
  membre n'est pas déjà inscrit ; `adminQuantitesCompatibles` refuse **avant l'appel
  réseau** une quantité hors périmètre (message clair au lieu de l'erreur du trigger D4).
- Compteurs visibles : badge « N » par collecte dans la liste des collectes (page
  d'édition) et bouton cliquable sur chaque ligne de collecte de la carte admin.
  Sur `admin-billet.html`, `loadAdminCollectes` n'est pas joué : `chargerCompteursInscriptionsBillet`
  calcule les compteurs du seul billet ouvert (une requête courte).
- `style.css` : styles des blocs par collecte + des deux compteurs.

**Volet B — `mes-collectes.js`**

- `inscriptionsDeMesCollectes(inscriptions)` : filtre unique sur `collectesMapGlobal`,
  appliqué aux **5** chargements qui ne filtraient que par `billet_id` — enveloppes (liste
  et détail d'un membre), vérification des paiements, historique des paiements confirmés,
  relance des impayés d'un billet.

**Vérification** (règles extraites des fichiers livrés et rejouées sur les données du
billet 5477) : la modale produit bien 2 sections (26 « normal » / 11 « variante ») avec les
bonnes colonnes ; le garde-fou refuse 1 normal sur une collecte « variante » et
inversement ; Laura voit 11 inscriptions au lieu de 37, Antoine 26 au lieu de 37.

- `sw.js` v279 / `global.js` menu v187.
- **Commit** : `91055d1`
