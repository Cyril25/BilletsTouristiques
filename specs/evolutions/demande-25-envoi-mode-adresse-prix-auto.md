# Demande #25 — Mode d'envoi selon l'adresse + prix auto à l'expédition

- **Épic :** Corrections et évolutions
- **Demande :** #25 (table `demandes`)
- **Priorité / Complexité :** normale / M
- **Concerne :** membres, collecteurs, admins
- **Écran :** Mes collectes → onglet « Préparation des envois » → « Expédier cette enveloppe »
- **Statut :** À tester
- **Commit :** `eea5267`

## Contexte (demande)

> Dans l'écran Mes Collectes, onglet Préparation des envois, quand on clique sur
> « Expédier cette enveloppe », on choisit un mode d'envoi. Le mode proposé doit
> correspondre à l'adresse du membre (France → modes France, étranger → modes étranger).
> Une fois le mode choisi, on déduit le prix payé selon le nombre de billets et le mode.
> Ce prix reste modifiable. Il faut aussi mettre en base, par tranche (min 1 / max 10
> billets…), le montant par mode.

## Analyse / décisions

- **Aucune migration nécessaire** : la table `frais_port` existe déjà et est peuplée
  (colonnes `annee, destination, qte_min, qte_max, poids_grammes, type_envoi, prix`),
  et la fonction `findFdpPriceCollecte(nbBillets, destination, typeEnvoi)` calcule déjà
  le prix. La demande décrivait un modèle de données qui existait déjà.
- **Destination** dérivée du pays du membre, cohérent avec l'existant :
  `(adresse_snapshot.pays === 'France') ? 'france' : 'international'`.
- **Modes proposés** = les `type_envoi` réellement présents dans `frais_port` pour cette
  destination (France : normal/suivi/r1/r2/r3 ; International : normal/r1/r2 — pas de
  suivi ni r3). Fallback sur tous les modes si aucune donnée `frais_port`.
- **Prix** pré-rempli via `findFdpPriceCollecte(nbBillets, destination, mode)` et recalculé
  au changement de mode (`majPrixExpedition`). Le nb de billets = somme
  `nb_normaux + nb_variantes` des inscriptions `pret_a_envoyer` de l'enveloppe.
- **Champ prix éditable** : si aucun tarif ne correspond (ex. International r2 = 0 en base,
  ou enveloppe hors tranche > 200 billets), le champ reste **vide** plutôt que d'afficher
  un faux 0 — le collecteur saisit à la main.
- `fraisPortCollecte` n'étant chargé qu'à l'ouverture d'une collecte, il est chargé à la
  volée dans le formulaire d'expédition s'il est absent (cas de l'onglet Envois direct).
- **Périmètre :** limité au bouton « Expédier cette enveloppe ». Le formulaire d'expédition
  rapide d'un billet unique (« expédition directe ») a le même champ prix mais n'a pas été
  modifié (à décider si on veut y appliquer le même calcul — noté comme suite possible).

## Critères d'acceptation

1. À l'ouverture du formulaire d'expédition d'une enveloppe, les modes proposés
   correspondent à la destination (France vs International) d'après le pays du membre.
2. Le prix payé est pré-rempli selon destination × mode × nombre de billets.
3. Le prix se recalcule quand on change de mode.
4. Le prix reste modifiable à la main.
5. Si aucun tarif ne correspond, le champ prix est vide (pas de faux 0).
6. Un bandeau rappelle la destination et le nombre de billets.

## Réalisation

- **Fichiers :** `mes-collectes.js` (`ouvrirFormulaireExpedition` retravaillée,
  helper `majPrixExpedition`, constantes `EXP_MODES_ORDRE`/`EXP_MODES_LABELS`),
  `style.css` (`.expedition-info`, `.expedition-prix-auto`), `sw.js` (cache `billets-v234`).
- **Vérification :** logique de prix testée contre les données réelles `frais_port`
  (ex. France/Normal/3 = 1,70 € ; France/Suivi/3 = 2,20 € ; International/R1/3 = 7,40 €).
- **Commit :** `eea5267` — feat(collecteur): mode d'envoi selon adresse + prix auto a l'expedition.
