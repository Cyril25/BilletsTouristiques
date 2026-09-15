# Demande #71 — Les chiffres des onglets de « Mes collectes » dès l'arrivée

- **Complexité :** M — Prêt à dev au tri du 2026-09-15.
- **Demande :** #71, déposée par Sébastien le 2026-09-14, priorité normale.
- **Concerne :** collecteurs (et admins collecteurs), `mes-collectes.html` / `mes-collectes.js`.
- Version en clair : `demande-71-chiffres-onglets-mes-collectes-en-clair.md`.

## Contexte (demande)

> Dans la rubriques mes collectes et sur téléphone (je sais pas si identique sur pc), quand ont arrive
> sur la page il y a un chiffre total de mes collectes, mais en cas de nouveaux événements sur les
> vérifications de payements, préparation des envois et historique des envois, ont ne le sais pas
> directement au 1er coup d'œil, il faut cliquer sur une option pour que le chiffre des nouveaux
> événements s'affiche (peut-être un bug).
> Je donne 1 exemple en cas de préparation des envois en attente aucun chiffre du nombre en attente, si
> je clique dessus le chiffre apparaît et reste en mémoire.
> Identique dans la vérification de payement, des qu'un membre paye le chiffre de l'info au dessus
> apparaît pas il faut cliquer dessus pour qu'il apparaisse.

## Constat

Les compteurs d'onglets datent de la demande #12. Chacun est écrit **par le chargement de son onglet** :

| Onglet | Écrit par | Ce qu'il compte |
|---|---|---|
| Mes collectes | `renderCollectesList()` | nombre de billets — calculé à l'arrivée |
| Vérification paiement | `loadVerificationPaiement()` | inscriptions `declare` + frais de port `declare` (prix > 0) |
| Préparation des envois | `renderEnveloppesListe()` | enveloppes `en_cours`, **après** les effets de bord de `loadEnveloppes()` |
| Historique des envois | — | **aucun compteur d'onglet** ; le « (N) » vu par le demandeur est le titre intérieur |
| Liste noire | — | aucun |

`showTab()` n'appelle le chargement qu'à l'ouverture de l'onglet : à l'arrivée, seul « Mes collectes »
porte un chiffre. Même comportement sur ordinateur.

Trois défauts voisins, trouvés en lisant le même chemin :

1. **Le chiffre ne disparaît jamais.** `renderPaiementsVide()` et `renderEnveloppesVide()` ne touchent
   pas l'onglet : après avoir validé le dernier paiement déclaré, l'onglet garde l'ancien chiffre
   jusqu'au rechargement de la page — c'est le « reste en mémoire » de la demande.
2. **Les écarts de prix déclarés (#44) ne sont pas comptés** dans « Vérification paiement », alors
   qu'ils s'y valident comme un paiement. Table `dettes` vide au 15/09 : sans effet aujourd'hui.
3. **Préparation des envois** : `loadEnveloppes()` a des effets de bord — il crée l'enveloppe
   manquante d'un membre qui a des billets à répartir, et annule les enveloppes vides — et, s'il ne
   trouve **aucune** enveloppe `en_cours`, il s'arrête sur « Aucune enveloppe en cours » sans rien
   créer. Le chiffre affiché après ouverture est celui d'après ces effets.

**Volumes mesurés le 15/09** (lecture seule) : le plus gros collecteur a 1 654 billets,
1 710 inscriptions (`pas_interesse = false`) et 50 enveloppes en cours. Aucun plafond de lignes côté
PostgREST (une requête `limit=5000` rend 5 000 lignes). `loadMesCollectes()` charge déjà **toutes** les
inscriptions de mes collectes (`limit=10000`).

## Décisions

### D1 — Deux chiffres dès l'arrivée : paiements et envois

« Vérification paiement » et « Préparation des envois » affichent leur chiffre dès que la liste des
collectes est chargée, et à chaque rechargement de cette liste (`retourListe()`, clôture d'une
collecte).

### D2 — Historique des envois : pas de chiffre *(décision de Cyril, 15/09)*

C'est une archive, rien n'y appelle une action. Les chiffres restent réservés aux onglets qui en
demandent une. Écartés : le nombre d'envois « pas de retour », et le total (qui grossit sans cesse).
La liste noire n'en a pas non plus.

### D3 — Le même chiffre que l'onglet ouvert, par les mêmes règles

Une fonction de comptage par onglet, **pure**, appelée à l'arrivée **et** par l'onglet ouvert :

- `nbPaiementsAVerifier(inscriptions, enveloppes, dettes)` — hors bénéficiaire (email du collecteur) :
  inscriptions `declare` ; enveloppes `statut_paiement_port = declare` avec `prix_envoi_reel > 0` ;
  dettes `declare` avec `montant > 0` (un avoir ne se vérifie pas, il se solde). Les inscriptions
  reçues sont déjà réduites à mes collectes et à `pas_interesse = false`.
- `nbEnveloppesAPreparer(enveloppesEnCours, inscriptions)` — reproduit le résultat des effets de bord
  de `loadEnveloppes()` **sans les exécuter** : 0 s'il n'y a aucune enveloppe en cours ; sinon les
  enveloppes gardées (au moins une inscription `pret_a_envoyer` dedans, ou un membre qui a des
  inscriptions à répartir) **plus** celles qui seraient créées (membre à répartir sans enveloppe en
  cours). Les inscriptions du collecteur bénéficiaire ne sont pas écartées : `loadEnveloppes()` ne les
  écarte pas.

L'onglet « Préparation des envois » ouvert garde son `enveloppes.length`, calculé après les effets de
bord réels : le banc vérifie que les deux coïncident.

### D4 — Compter sans rien recharger

- les inscriptions : celles que `loadMesCollectes()` a déjà chargées, avec **`enveloppe_id`** ajouté à
  son `select` ;
- **deux petites requêtes** en parallèle, lancées après le rendu de la liste :
  `enveloppes?collecteur_alias=eq.X&or=(statut.eq.en_cours,statut_paiement_port.eq.declare)` sur
  5 colonnes, et `dettes?collecteur_alias=eq.X&statut_paiement=eq.declare` sur 3 colonnes (avec le
  même `.catch` que l'onglet).

Aucune écriture : la création et l'annulation d'enveloppes restent déclenchées par l'ouverture de
l'onglet, comme aujourd'hui.

### D5 — Un chiffre à zéro disparaît

Une seule fonction écrit le libellé d'un onglet (`majBadgeOnglet()`), badge omis à zéro. Elle est
appelée aussi par `renderPaiementsVide()` et `renderEnveloppesVide()` (défaut 1).

### D6 — L'onglet ouvert a le dernier mot

Si l'utilisateur ouvre un onglet pendant que le comptage d'arrivée est en route, le chiffre de
l'onglet, calculé sur des données plus fraîches, ne doit pas être écrasé. Chaque écriture d'un badge
incrémente un compteur par onglet ; le comptage d'arrivée relève ces compteurs **au début de
`loadMesCollectes()`** et n'écrit pas un badge qu'un onglet a écrit entre-temps.

## Critères d'acceptation

1. En arrivant sur « Mes collectes » avec un paiement déclaré en attente, « Vérification paiement »
   porte son chiffre, dans sa couleur d'alerte habituelle, sans avoir été ouvert.
2. Avec des enveloppes à préparer, « Préparation des envois » porte son chiffre sans avoir été ouvert.
3. Ouvrir l'onglet ne change pas le chiffre.
4. Valider le dernier paiement déclaré fait disparaître le chiffre ; envoyer la dernière enveloppe
   aussi.
5. « Historique des envois » et « Liste noire » n'ont pas de chiffre.
6. Un écart de prix déclaré (#44) compte dans « Vérification paiement ».
7. Arriver sur la page ne crée ni n'annule aucune enveloppe.
8. Pas de ralentissement visible du premier affichage : la liste des collectes s'affiche avant les
   deux requêtes de comptage.

## Ce que cette spec ne fait pas

- **Pas de notion de « nouveau »** : le chiffre dit ce qui attend une action, pas ce qui est arrivé
  depuis la dernière visite. Un paiement déclaré compte tant qu'il n'est pas validé.
- **Pas de rafraîchissement en direct** : un paiement déclaré pendant que la page est ouverte apparaît
  au prochain chargement de la liste (retour à la liste, ou page rechargée).
- **Pas de chiffre dans le menu général** du site (cf. backlog B4).
- Le comportement de `loadEnveloppes()` sans enveloppe en cours (défaut 3) n'est pas corrigé : il est
  reproduit, pour que le chiffre d'arrivée soit celui de l'onglet.
