# Demande #40 (prod) — Valeur des billets de l'enveloppe, pour choisir l'assurance

- **Épic :** Corrections et évolutions
- **Demande :** #40 de la table `demandes` **de production** — demandée par Jean-Philippe
  le 2026-07-31, priorité haute, complexité S.
- ⚠ **Ne pas confondre** avec `demande-40-badge-statut-par-collecte.md`, qui porte le #40 de
  la table `demandes` de la **copie de test** utilisée pendant le cycle #16 (juillet 2026).
  Les deux séries de numéros cohabitent dans ce dossier — voir la note en fin de fichier.
- **Concerne :** collecteurs
- **Écran :** Mes collectes → Préparation des envois
- **Statut :** À tester
- **Commit :** `e27c519`

## Contexte (demande)

> estimer le prix des billets contenus dans l'enveloppe pour déterminer l'assurance à mettre
> en cas d'envoi en recommandé

Au moment d'expédier, le collecteur choisit un mode d'envoi (Normal, Suivi, Recommandé R1/R2/R3).
Les niveaux de recommandé se distinguent par leur plafond d'indemnisation : pour choisir, il faut
savoir ce que vaut le contenu de l'enveloppe. Aujourd'hui l'écran n'affiche que le **nombre** de
billets ; le collecteur doit calculer la valeur de tête ou renoncer.

## Analyse / décisions

- **Quelle valeur ?** La seule que la base connaisse : le **prix de collecte**, c'est-à-dire
  `nb_normaux × collectes.prix + nb_variantes × collectes.prix_variante`, sommé sur les
  inscriptions présentes dans l'enveloppe. C'est ce que le membre a payé, pas une cote de
  collectionneur. L'affichage le dit (« valeur des billets ») et reste une **estimation** :
  au collecteur d'arbitrer.
- **Hors frais de port.** Ce qu'on assure, c'est le contenu, pas l'affranchissement. Le prix
  de l'envoi est déjà affiché à côté (champ « Prix payé »), le mélange serait trompeur.
- **On ne suggère pas le niveau R1/R2/R3.** Les plafonds d'indemnisation La Poste changent et ne
  sont pas dans la base : une suggestion codée en dur vieillirait mal et engagerait le site sur un
  conseil d'assurance. On donne le chiffre, la décision reste humaine.
- **Réutilisation des règles existantes, pas de nouveau calcul.** La valeur passe par
  `tarifInsc()` (prix de la collecte de l'inscription, #16) et `versionsInscription()`
  (périmètre normale/variante ouvert par la collecte, #46) — les mêmes fonctions que
  `countBillets()`, dont le nouvel helper `valeurBillets()` est le pendant monétaire. Une
  inscription dont la collecte n'a pas de prix compte pour 0 : le total reste juste sur les
  autres lignes.
- **Trois emplacements**, tous sur le trajet de la décision :
  1. le titre « Dans l'enveloppe (N) » du détail d'enveloppe ;
  2. la ligne d'info du **formulaire d'expédition**, à côté de la destination et du nombre de
     billets — c'est là que le mode d'envoi se choisit ;
  3. le mini-formulaire d'**expédition directe** depuis la vue d'une collecte, qui propose le
     même choix de mode pour une seule inscription.
- **Pas dans la liste des enveloppes.** La carte affiche déjà nombre dans l'enveloppe, nombre à
  répartir et impayés ; un quatrième chiffre la rendrait illisible, et la décision d'assurance
  ne se prend pas à ce niveau.
- **Aucune migration, aucun appel réseau supplémentaire.** Les inscriptions et les collectes sont
  déjà chargées ; seul le `select` du formulaire d'expédition gagne `billet_id` et `collecte_id`,
  qu'il ne demandait pas.

## Critères d'acceptation

1. Le détail d'une enveloppe affiche, à côté de « Dans l'enveloppe (N) », la valeur des billets
   qu'elle contient, en euros.
2. Le formulaire d'expédition affiche cette même valeur à côté de la destination et du nombre de
   billets.
3. Le mini-formulaire d'expédition directe (vue collecte) affiche la valeur de l'inscription
   expédiée.
4. La valeur suit le périmètre de la collecte : une collecte « variante seule » valorise les
   variantes au prix variante et ignore les normaux (règle #46), comme le fait déjà le compteur
   de billets.
5. Une collecte sans prix renseigné ne casse rien : la ligne compte pour 0 €.
6. Le total est hors frais de port.

## Réalisation

- **Fichiers :** `mes-collectes.js` — helper `valeurBillets()` (pendant monétaire de
  `countBillets()`), affichage dans `renderEnveloppeDetail()`, `ouvrirFormulaireExpedition()`
  (+ `billet_id`/`collecte_id` dans le `select`) et le formulaire d'expédition directe de
  `demanderExpeditionDirecte()`.
- **Migration :** aucune.
- **Cache-buster :** `sw.js` + `menu.html` bumpés.
- **Commit :** `e27c519`

## Note — deux séries de numéros dans ce dossier

Pendant le cycle de test de #16 (juillet 2026), les retours de Cyril ont été saisis dans la table
`demandes` de la **copie de test** (`ijxajtxnhbczgiarkefo`), dont la numérotation a divergé de la
prod. Les specs `demande-36`, `demande-38` à `demande-49` de ce dossier viennent de cette copie ;
les autres, dont celle-ci, de la table de production. La copie de test est destinée à être
supprimée : après ça, ces specs seront la seule trace de ces demandes.
