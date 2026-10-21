# Demande #83 — Mettre les normaux et les variantes d'une inscription dans des enveloppes différentes

- **Épic :** Corrections et évolutions (complexité **L**)
- **Demande :** #83 de la table `demandes` de production — Jean-Philippe, 2026-10-19, priorité
  *normale*. Public cité : collecteurs.
- **Statut :** analyse à valider (rédigée le 2026-10-21 par le rituel des demandes).
- **Version en clair :** [demande-83-normaux-variantes-enveloppes-separees-en-clair.md](demande-83-normaux-variantes-enveloppes-separees-en-clair.md)

## Contexte (demande)

> peux tu dissocier les billets normaux des variantes lorsqu un collecteur met les billets dans
> l enveloppe car pour le moment tu as mis l option pour les 2

## Constat — le modèle actuel

**Une inscription voyage en bloc.** Une ligne `inscriptions` = un membre sur une collecte
(contrainte `inscriptions_collecte_membre_id_uk UNIQUE (collecte_id, membre_id)`), avec
`nb_normaux`, `nb_variantes`, un `statut_paiement`, et **un seul** couple d'acheminement :
`enveloppe_id` (FK `enveloppes`) + `statut_livraison` ∈ `non_reparti` / `pret_a_envoyer` /
`expedie` / `recu`, doublé du booléen historique `envoye`. Normaux et variantes d'un même
inscrit sont donc toujours dans la même enveloppe.

**Les gestes qui rangent une inscription** (`mes-collectes.js`) :

- détail d'une collecte, colonne « Enveloppe » (collecte sans frais de port payés par le membre) :
  `toggleEnveloppeDepuisCollecte()` — une case par inscrit ;
- détail d'une collecte, colonne « Envoyé » (collecte `payer_fdp = 'oui'`) :
  `demanderExpeditionDirecte()` / `confirmerExpeditionDirecte()` — expédition immédiate de
  l'inscription dans une enveloppe dédiée ;
- détail d'une enveloppe : `ajouterAEnveloppe()` / `retirerDeEnveloppe()` (+ / −) ;
- « tout cocher » d'une collecte : `toutCocherEnveloppes()` ;
- expédition : `confirmerExpedition()` passe les `pret_a_envoyer` de l'enveloppe en `expedie` ;
- annulation d'un envoi : `executerAnnulationEnvoi()` les remet `pret_a_envoyer` dans une
  enveloppe en cours.

**Les lectures** : 51 occurrences de `enveloppe_id` / `statut_livraison` — 42 dans
`mes-collectes.js` (compteurs de la liste des collectes, détail d'une collecte, onglets #71,
préparation des envois et ménage des enveloppes vides de l'incident du 16/10, détail d'une
enveloppe, historique, enveloppe passée, formulaire d'expédition et calcul du port au nombre de
billets, récapitulatif #84), 5 dans `mes-inscriptions.js` (« Mes envois » regroupe les
inscriptions par `enveloppe_id`), 4 dans `admin.js` (le recalcul des inscriptions automatiques
ne touche que les lignes `non_reparti` sans enveloppe). Les compteurs `countBillets()`,
`valeurBillets()` (#40) et le prix du port (`findFdpPriceCollecte`) additionnent des
**inscriptions entières**.

**En base**, autour de l'inscription : les compléments et avoirs de #44 (`dettes.inscription_id`),
le trigger D12 (« valeur métier » : paiement, `envoye`, `fdp_regles`…), l'invariant D4 (scope de
la collecte ↔ quantités), le garde-fou des enveloppes (#64), les règles d'accès des enveloppes.

## Options

**A. Couper l'inscription en deux lignes** (une pour les normaux, une pour les variantes) au moment
où on les sépare. Tout l'aval marcherait tel quel, mais : la contrainte d'unicité
`(collecte_id, membre_id)` l'interdit ; les compléments de prix (#44) visent une inscription ; le
membre verrait deux inscriptions pour un même billet, et le recalcul des inscriptions
automatiques fusionne sur `(collecte_id, membre_id)`. **Écartée.**

**B. Un second rattachement, pour les variantes, sur la même inscription — recommandée.** Deux
colonnes nullables : `enveloppe_id_variantes` (FK `enveloppes`) et `statut_livraison_variantes`
(même CHECK que `statut_livraison`). **Nulles = les variantes suivent les normaux** : c'est le
comportement d'aujourd'hui, aucune donnée à réécrire, et une inscription jamais séparée ne change
pas de chemin. Renseignées = l'inscription est **séparée** : le couple historique ne porte plus
que les normaux, le nouveau porte les variantes.

**C. Une table de rattachement par version** (`inscription_id`, version, enveloppe, statut). Plus
régulière, mais elle déplace les 51 lectures, les règles d'accès et la migration de toutes les
lignes existantes pour un cas qui reste minoritaire. **Écartée** au profit de B.

**D. Sans développement : deux collectes.** Depuis #46, une collecte a un périmètre (`scope`
`normal` / `variante` / `les_deux`). Sur un billet dont les variantes arriveront à part, ouvrir
une collecte « normaux » et une collecte « variantes » donne déjà deux inscriptions, donc deux
rangements indépendants. Limites : le membre s'inscrit deux fois, et ça ne sert à rien pour les
collectes déjà ouvertes en `les_deux`. **À proposer aux relecteurs** comme alternative ou comme
complément (question Q5).

## Proposition détaillée (option B)

### 1. Une seule lecture : les « parts » d'une inscription

Une fonction dans `global.js` (partagée par `mes-collectes.js` et `mes-inscriptions.js`) :
`partsInscription(insc, billet)` rend
- **une part** `{ nbNormaux, nbVariantes, enveloppeId, statut }` si l'inscription n'est pas
  séparée (copie du couple historique) ;
- **deux parts** `{ nbNormaux, 0, enveloppe_id, statut_livraison }` et
  `{ 0, nbVariantes, enveloppe_id_variantes, statut_livraison_variantes }` sinon.

Les quantités restent ramenées au périmètre de la collecte (#46). **Toutes les lectures** listées
plus haut passent par les parts : « dans cette enveloppe » devient « les parts dont l'enveloppe
est celle-ci », et `countBillets()`, `valeurBillets()`, le port au nombre de billets et le
récapitulatif #84 comptent des parts. C'est le gros du travail : sans cette fonction unique, une
lecture oubliée compterait les variantes dans les deux enveloppes.

### 2. Les écritures

- **Détail d'une collecte, colonne « Enveloppe »** : pour un inscrit qui a des normaux **et** des
  variantes, deux cases « N » et « V » au lieu d'une. Cocher les deux = comportement actuel (pas de
  séparation). N'en cocher qu'une **sépare** l'inscription : la part cochée va dans l'enveloppe en
  cours, l'autre reste à répartir. Recocher la seconde quand la première est encore dans la même
  enveloppe **réunit** l'inscription (les colonnes variantes reviennent à NULL).
- **Détail d'une enveloppe** : une ligne par part (« 2 normaux », « 1 variante »), avec ses
  boutons + / −.
- **Expédition, annulation d'un envoi** : par parts (`statut_livraison_variantes` suit le même
  cycle). `envoye` ne passe à `true` que lorsque **toutes** les parts sont expédiées (c'est lui
  que lisent D12 et plusieurs compteurs).
- **Expédition directe** (colonne « Envoyé », collectes à port payé par le membre) : hors du
  premier lot, sauf avis contraire (Q4).
- **Retirer d'une enveloppe** une part séparée : elle redevient « à répartir » ; si les deux parts
  se retrouvent à répartir, l'inscription est réunie.

### 3. Ce qui ne change pas

- **Le paiement** reste celui de l'inscription entière (un seul `statut_paiement`, une seule ligne
  à valider) : séparer porte sur l'envoi, pas sur ce que le membre doit (Q2).
- **Les frais de port** : chaque envoi a son prix, saisi à l'expédition comme aujourd'hui. Deux
  envois = deux frais de port pour le membre (Q3).
- **Le membre** ne voit qu'une inscription dans « Mes inscriptions ». Dans « Mes envois », le billet
  apparaît dans chacun des envois qui en portent une part, avec la quantité de la part.

### 4. Base de données (migration à jouer par Cyril)

- `ALTER TABLE inscriptions ADD COLUMN enveloppe_id_variantes INTEGER REFERENCES enveloppes(id),
  ADD COLUMN statut_livraison_variantes TEXT CHECK (… mêmes valeurs …)` + index sur
  `enveloppe_id_variantes`. Aucune ligne réécrite.
- Contrainte de cohérence : les deux colonnes sont nulles ensemble ou renseignées ensemble, et
  seulement si `nb_variantes > 0` et `nb_normaux > 0`.
- **À vérifier au développement** : que le garde-fou des enveloppes (#64), D12 et le trigger
  d'annulation des dettes ne lisent pas `enveloppe_id` d'une façon qui ignorerait la seconde
  colonne ; que la règle d'accès « mise à jour par le collecteur » des inscriptions couvre les
  nouvelles colonnes (elle est par ligne : a priori oui) ; que le ménage des enveloppes vides
  (`annulerEnveloppesVides()`, incident du 16/10) cherche aussi `enveloppe_id_variantes` — sinon
  une enveloppe qui ne contient que des variantes séparées serait annulée.
- Le recalcul des inscriptions automatiques (`admin.js`) exclut déjà les lignes rangées
  (`enveloppe_id is null`) : y ajouter `enveloppe_id_variantes is null`.
- Scripts habituels : constat, migration, contrôle, retour arrière (suppression des deux colonnes
  après avoir vérifié qu'aucune inscription n'est séparée).

### 5. Découpage

1. Migration + `partsInscription()` + bascule de toutes les lectures **sans** rien séparer encore :
   le site doit se comporter exactement comme avant (contre-épreuve sur les bancs existants, dont
   celui de l'incident du 16/10).
2. Les cases N / V du détail d'une collecte, le détail d'une enveloppe, l'expédition et
   l'annulation.
3. « Mes envois », historique, enveloppe passée, récapitulatif #84.

Vérification sur le banc PostgREST + jsdom (`scripts/banc-62/`), migration comprise.

## Questions ouvertes (reprises dans la version en clair)

- **Q1 — Le besoin.** Est-ce que les variantes arrivent plus tard que les normaux (et on veut
  envoyer les normaux sans attendre), ou y a-t-il un autre cas ?
- **Q2 — Le paiement** reste-t-il commun (un seul paiement pour normaux et variantes) ?
- **Q3 — Deux envois = deux frais de port** pour le membre : est-ce acceptable ?
- **Q4 — Les collectes où le membre paie le port** (case « Envoyé », expédition directe) doivent-elles
  aussi pouvoir séparer, dès le premier lot ?
- **Q5 — Deux collectes** (normaux / variantes) suffiraient-elles pour les prochains billets, ce
  qui réduirait le besoin aux collectes déjà ouvertes ?

**À mesurer avant le développement** : combien d'inscriptions en cours ont à la fois des normaux
et des variantes sur une collecte `les_deux` (c'est le volume concerné).

## Hors périmètre

- Séparer un **même** lot de normaux en deux envois (2 normaux maintenant, 1 plus tard) : la
  demande porte sur normaux / variantes.
- Séparer le paiement.
- L'envoi libre de #81 (billets hors collecte), analysé à part — mais les deux toucheront les mêmes
  fonctions : à développer l'un après l'autre, pas en parallèle.
