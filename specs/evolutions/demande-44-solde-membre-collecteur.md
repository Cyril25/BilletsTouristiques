# Demande #44 (prod) — Dette et avoir entre membre et collecteur après un changement de prix

- **Épic :** chantier structurant (complexité **L**)
- **Demande :** #44 de la table `demandes` **de production** — Jean-Philippe, 2026-09-02,
  priorité **haute**.
- **Concerne :** membres, collecteurs, admins
- **Statut :** **Analyse validée par Cyril le 2026-09-06.** Développement à faire, puis
  **validation obligatoire sur l'environnement de test avant la prod** (décision de Cyril).
- **Prise en premier** parce que c'est la seule demande de priorité haute restante. L'ordre acté
  le 2026-07-21 (#16 → #1 → #22) ne la concerne pas : elle est postérieure, et #1/#22 sont en
  priorité basse et normale.

## Contexte (demande)

> lorsqu'il y a une modification de prix à la hausse ou à la baisse, mettre un système pour les
> membres pour avoir ou devoir de l'argent à un collecteur, idem pour le collecteur : il sait
> qu'il doit rembourser ou attendre une future collecte pour régulariser le solde

## En un exemple

Billet à **3,00 €**, trois membres inscrits pour **2 billets chacun**. Le collecteur passe le prix
à **3,20 €**.

| Membre | État avant | Ce qui se passe | Ce qu'il voit après |
|---|---|---|---|
| Alice | payé, **validé** par le collecteur | ligne de dette **+0,40 €** | « Payé » sur son inscription, **plus** une ligne « Augmentation du prix — UEBK 2026-14 NAUSICAA : 0,40 € » à régler |
| Bruno | a **déclaré** avoir payé, pas encore validé | ligne de dette **+0,40 €** | pareil qu'Alice : sa déclaration reste valable pour 6,00 €, la ligne porte le complément |
| Chloé | **pas payé** | **rien** | son montant dû passe simplement de 6,00 € à 6,40 € |

Si au lieu de monter le prix descend à **2,80 €**, c'est la même chose au signe près : Alice et
Bruno reçoivent chacun un **avoir de 0,40 €** que le collecteur leur doit, et le montant de Chloé
tombe à 5,60 €.

Autrement dit : **on ne touche jamais à ce qui a déjà été payé, on crée une ligne à côté.** C'est
la même mécanique que les frais de port, avec un libellé qui dit d'où vient la somme.

## Le constat qui a orienté le modèle

**La base ne conserve aucune trace d'un montant payé.** `inscriptions` porte `statut_paiement`
(`non_paye` / `declare` / `confirme`) et `date_validation`, mais aucun montant : ce qui est dû est
toujours recalculé depuis `collectes.prix`. Vérifié sur les 19 tables du schéma — ni table de
paiements, ni historique de prix. Le seul montant réel enregistré dans l'application est
`enveloppes.prix_envoi_reel`.

Le modèle de la ligne de dette **n'a pas besoin de cette mémoire** : au moment du changement on
connaît l'écart et on sait qui avait déjà réglé. C'est ce qui fait tomber le principal obstacle du
chantier — et ce qui rend toute reprise de données inutile.

## Décisions validées

> Numérotées **R1–R8** et non D1–D8 : « invariant D4 » désigne déjà une règle de #16 (le
> périmètre de versions), et le test du déclencheur s'est heurté au garde-fou qui la porte.
> Deux « D4 » dans le même dossier auraient fini par se croiser.

| | Décision | Motif |
|---|---|---|
| **R1** | Solde **informatif**, pas de compensation automatique | Le système n'a jamais enregistré un montant ; qu'il apprenne à compter juste avant de payer à notre place. |
| **R2** | **Billets seulement**, pas les frais de port | Le port a sa propre logique de paiement ; mélanger rendrait le solde illisible. |
| **R3** | **Aucune reprise de l'existant** | Le modèle rend la reprise inutile : l'état actuel est la référence. Vérifié — sur 5 359 collectes « Collecte initiale », 2 seules divergent du prix d'origine (billets 824/825, arrondis connus de la migration, collectes terminées). Aucun prix édité depuis la bascule. |
| **R4** | **La ligne suit le paiement** | Annuler un paiement annule les lignes non réglées qui en découlent ; une ligne déjà réglée n'est jamais touchée automatiquement. |
| **R5** | **Pas de seuil** sur les petits montants, mais un bouton « solder » en un clic | Une dette est une dette ; c'est la liquidation qui doit être facile, pas la règle qui doit mentir. |
| **R6** | **Notification automatique** au membre à la création d'une ligne | C'est de l'argent : personne ne surveille l'écran. Mécanique #33, déjà en service. |
| **R7** | Visible : membre → Mes inscriptions, collecteur → Mes collectes, admin → stats. **Les dettes entrent dans la somme due du menu (#4), pas les avoirs** | Une dette *est* due. Un avoir n'est pas une somme due : le retrancher reviendrait à compenser, ce que R1 exclut. |
| **R8** | **Validation sur l'environnement de test avant la prod** | Décision de Cyril : trop gros pour aller directement en production. |

## Règles de gestion

### Quand une ligne est créée

À chaque changement de `collectes.prix` ou `collectes.prix_variante`, pour chaque inscription
active (`pas_interesse = false`) de cette collecte :

| `statut_paiement` | Prix ↑ | Prix ↓ |
|---|---|---|
| `non_paye` | **rien** — le montant dû se recalcule au nouveau prix (comportement actuel, déjà juste) | **rien** |
| `declare` | ligne de **dette** (montant > 0) | ligne d'**avoir** (montant < 0) |
| `confirme` | ligne de **dette** | ligne d'**avoir** |

```
montant = (prix_après − prix_avant) × nb_normaux
        + (prix_variante_après − prix_variante_avant) × nb_variantes
```

Trois précisions qui comptent :

- **Le périmètre de versions (#46) s'applique** : une quantité hors du périmètre ouvert par la
  collecte compte pour zéro. Sans ça on facturerait des billets fantômes — exactement le défaut
  que #45 vient de corriger dans les frais de port ; autant ne pas le réintroduire dans un calcul
  de dette.
- **Le prix variante suit son repli habituel** : quand `prix_variante` est vide, c'est `prix` qui
  s'applique. L'écart se calcule donc sur les prix *effectifs*, avant et après.
- **La première mise à prix ne crée rien.** Passer de « pas de prix » à un prix n'est pas un
  changement : c'est la saisie initiale, et les 62 collectes en pré-collecte sont dans ce cas.
  *(Contrôle : 81 inscriptions payées existent sur des collectes sans prix — toutes sur des
  collectes « Terminé », dont le prix ne bougera pas.)*

### Comment une ligne se règle

- **Dette (montant > 0)** : exactement comme une ligne de frais de port. Le membre déclare avoir
  payé, le collecteur valide. Mêmes statuts, mêmes gestes, rien de neuf à apprendre.
- **Avoir (montant < 0)** : le membre ne peut pas « payer » un montant négatif. Côté membre, un
  avoir affiché (« le collecteur X vous doit 0,40 € ») ; côté collecteur, une ligne à solder avec
  un bouton **« Remboursé »** ou **« Déduit d'une prochaine collecte »**. **La ligne reste ouverte
  tant que le collecteur ne la ferme pas** — c'est le « attendre une future collecte pour
  régulariser » de la demande.

## Modèle de données

### Table `dettes`

| Colonne | Type | Rôle |
|---|---|---|
| `id` | `int` identity | clé |
| `membre_email` | `text` NOT NULL | qui |
| `collecteur_alias` | `text` NOT NULL | envers qui (même clé que `enveloppes.collecteur_alias`) |
| `collecte_id` | `uuid` NOT NULL | d'où ça vient |
| `billet_id` | `int` | pour le libellé, et si l'inscription disparaît |
| `inscription_id` | `int` NULL | lien pour R4 (`ON DELETE SET NULL`) |
| `montant` | `numeric(10,2)` NOT NULL | **> 0 = le membre doit ; < 0 = le collecteur doit** |
| `libelle` | `text` NOT NULL | « Augmentation du prix — UEBK 2026-14 NAUSICAA » |
| `motif` | `text` NOT NULL | `changement_prix` (laisse la porte ouverte à d'autres origines) |
| `nb_normaux`, `nb_variantes` | `int` | quantités retenues, **après** application du périmètre |
| `prix_avant`, `prix_apres` | `numeric(10,2)` | traçabilité : pourquoi ce montant |
| `prix_variante_avant`, `prix_variante_apres` | `numeric(10,2)` | idem |
| `statut_paiement` | `text` NOT NULL default `non_paye` | `non_paye` / `declare` / `confirme` — même vocabulaire que partout |
| `date_creation` | `timestamptz` default `now()` | |
| `date_validation` | `timestamptz` | posée à la clôture, comme pour les inscriptions |

Les colonnes `prix_*` et `nb_*` rendent chaque ligne **auditable** : on peut réafficher « 2 billets
× +0,20 € » et répondre à un membre qui conteste, sans avoir à rejouer l'histoire des prix.

### Déclencheur, et pourquoi en base

Un **trigger PostgreSQL** sur `collectes`, `AFTER UPDATE OF prix, prix_variante`, crée les lignes.
Pas du code dans `admin.js`, pour trois raisons vérifiées :

1. Seul `admin.js` écrit le prix aujourd'hui — mais la policy `collectes_update_own_collecteur`
   **autorise un collecteur à modifier sa propre collecte, prix compris**, par appel direct à
   l'API. Aucun écran ne le propose ; la porte est ouverte quand même.
2. Les prix sont parfois corrigés **en SQL** à la main.
3. C'est déjà le choix de #16 : `Categorie` et `date_effective` sont dérivées par trigger. Une
   règle de cohérence qui vit en base ne peut pas être contournée par un chemin qu'on n'a pas prévu.

Le trigger porte aussi la règle **R4** : un second déclencheur sur `inscriptions` supprime les lignes
`statut_paiement = 'non_paye'` rattachées à une inscription qui repasse à `non_paye`.

### RLS

- lecture : le membre voit ses lignes (`membre_email = auth.jwt() ->> 'email'`), le collecteur
  celles de son alias, l'admin tout ;
- écriture : le membre ne peut que passer une de ses dettes à `declare` ; le collecteur valide ou
  solde les siennes ; l'admin tout.
- ⚠ **Jamais `TO authenticated`** (JWT Firebase → rôle `anon`), et utiliser
  `is_admin_ou_superadmin()` et non `is_admin()`.

## Écrans

- **Mes inscriptions (membre)** — les lignes s'affichent comme les lignes de frais de port
  (`makePortItem` / `renderPortCard` servent de modèle), groupées par collecteur. Une dette porte
  le bouton « J'ai payé » ; un avoir s'affiche sans action, avec « en attente de remboursement ».
- **Mes collectes (collecteur)** — les dettes déclarées rejoignent « Vérification paiement » pour
  validation ; les avoirs apparaissent dans une section « À rembourser » avec les deux boutons de
  clôture.
- **Somme due du menu (#4)** — les dettes non réglées s'ajoutent, les avoirs non.
- **Admin** — compteur des lignes ouvertes et total, dans l'écran de statistiques.

## Critères d'acceptation

1. Augmenter le prix d'une collecte crée une ligne de dette pour chaque inscription `confirme` ou
   `declare`, du bon montant, et **rien** pour les `non_paye`, dont le montant dû est recalculé.
2. Baisser le prix crée les avoirs correspondants, du même montant au signe près.
3. Les quantités hors périmètre de la collecte (#46) ne génèrent aucun montant.
4. Renseigner le prix d'une collecte qui n'en avait pas ne crée aucune ligne.
5. Deux changements de prix successifs créent deux lignes distinctes ; aucune n'est écrasée.
6. Annuler un paiement supprime ses lignes non réglées et laisse intactes celles déjà réglées.
7. Une dette se règle par le parcours habituel (le membre déclare, le collecteur valide) et sort
   alors de la somme due du menu.
8. Un avoir se clôt par le collecteur (« Remboursé » ou « Déduit d'une prochaine collecte »).
9. Le membre concerné reçoit une notification à la création de sa ligne.
10. Un changement de prix fait **en SQL direct** crée les lignes comme depuis l'écran admin.
11. Aucune ligne n'apparaît pour un membre qui n'est pas concerné, ni pour un autre collecteur.

## Plan de validation sur l'environnement de test (R8)

> **Le scénario se monte sur un billet créé pour l'occasion** (`scripts/scenario-test-demande-44.sql`,
> amorce `ZZTEST`), pas sur un billet copié de la production. Première tentative faite sur un
> vrai billet — le 4266, payé à 100 % en prod : il a fallu écraser 17 statuts de paiement et
> des quantités réelles pour obtenir les trois cas. La copie cessait alors de refléter la prod,
> ce qui est précisément ce à quoi elle sert. Le billet 4266 a été restauré depuis les valeurs
> de production (17 `confirme`, 39 billets, collecte « Terminé »).

Cible : copie Supabase `ijxajtxnhbczgiarkefo` via le Worker `supabase-admin-proxy-test`, front
`BilletsTouristiques-TestEnv` (remote `test`). **Les deux répondent (vérifié le 2026-09-06).**

⚠ **Le ménage post-bascule doit donc attendre** : la fiche notes prévoyait de supprimer ce projet
jetable et son Worker « pas tout de suite ». C'est maintenant explicitement bloqué par #44.

Scénarios, dans cet ordre :

1. **Montage** : une collecte de test, trois membres — un `confirme`, un `declare`, un `non_paye`.
2. **Hausse** → deux lignes, montants exacts, rien pour le troisième, montant dû recalculé pour lui.
3. **Baisse** → deux avoirs.
4. **Collecte « variante seule »** avec des `nb_normaux` non nuls → aucun montant fantôme.
5. **Première mise à prix** (vide → 3,00 €) → aucune ligne.
6. **Annulation** de la déclaration de paiement → sa ligne non réglée disparaît.
7. **Règlement** d'une dette de bout en bout → sortie de la somme due du menu.
8. **Clôture** d'un avoir par le collecteur.
9. **Deux hausses successives** → deux lignes.
10. **Changement de prix en SQL direct** → lignes créées (c'est le test du trigger, pas de l'écran).
11. **Cloisonnement** : se connecter en membre non concerné et vérifier qu'il ne voit rien.

Passage en production seulement après ces onze scénarios, avec la migration rejouée sur la prod.

## Ce qui est déjà vérifié sur la copie de test

Migration jouée le 2026-09-06 sur `ijxajtxnhbczgiarkefo` (psql 16, session pooler) : table
créée **vide**, 2 déclencheurs, 4 policies — le contrôle post-migration du script le confirme.

`scripts/test-demande-44-trigger.sql` rejoue ensuite six scénarios dans **une transaction
annulée**, donc sans rien laisser derrière (vérifié : `dettes` est vide après coup). Tous
passent :

| Scénario | Attendu | Obtenu |
|---|---|---|
| Hausse de 0,20 € sur 2 billets | 2 lignes à +0,40 €, rien pour le non payé | ✅ 2 / 0 |
| Baisse de 0,50 € ensuite | 2 avoirs à −1,00 €, sans écraser les précédentes | ✅ 4 lignes cumulées |
| Déclaration de paiement annulée | sa ligne non réglée disparaît | ✅ 0 restante |
| Ligne déjà réglée, paiement annulé | la ligne survit | ✅ conservée |
| Première mise à prix (vide → 3,00 €) | aucune ligne | ✅ 0 |
| Collecte « variante seule », 2 normaux fantômes | aucun montant | ✅ 0 |

**Ce que le test a appris au passage :** le cas « variante seule avec des normaux » ne peut
plus être *créé* — `trg_collecte_scope_vs_inscriptions` (#16) le refuse. Mais il **existe** dans
les données héritées (142 inscriptions hors invariant en prod, dont 18 sur billets actifs), donc
le test désactive le garde-fou le temps de reproduire cet état légataire. C'est bien sur lui que
le calcul doit se tenir.

Restent à valider **après le développement du front** : les scénarios 1, 7, 8 et 11 (parcours de
règlement, clôture d'un avoir, cloisonnement entre membres), plus le scénario 10 déjà couvert ici
puisque tout le test passe par SQL direct.

## Réalisation

- **Migration :** `scripts/migration-demande-44-dettes.sql` — **jouée sur la copie de test**,
  pas en prod.
- **Test :** `scripts/test-demande-44-trigger.sql` (transaction annulée, 6 scénarios).
- **Fichiers :** `mes-inscriptions.js` (lignes côté membre, déclaration, annulation, total),
  `mes-collectes.js` (validation d'un complément, refus, solde d'un avoir),
  `global.js` (somme due du menu), `style.css`.
- **Déploiement de test :** branche **`testenv-44`**, poussée sur le dépôt
  `BilletsTouristiques-TestEnv`. ⚠ Elle rouvre l'aiguillage `BT_IS_TESTENV` que E1 avait
  retiré, plus l'URL de la copie dans le `connect-src` des 26 CSP — **à ne jamais
  fusionner dans `main`**. Sans cet aiguillage, le front de test taperait la production.
- **Le front est déjà sur `main` et donc en production, mais inerte** : les trois requêtes
  vers `dettes` sont protégées par un `.catch` qui rend une liste vide, et la table
  n'existe pas en prod (vérifié : 404 PGRST205). Rien n'est visible pour les membres tant
  que la migration n'y est pas jouée — c'est ce qui permet de tester sans figer le code.
- **Commit :** _(à compléter)_
