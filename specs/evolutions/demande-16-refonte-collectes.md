# Demande #16 — Refonte du système de collectes (découplage billet ↔ collecte)

- **Épic :** chantier structurant (complexité L — spec détaillée obligatoire avant dev)
- **Demande :** #16 (table `demandes`) — priorité haute
- **Concerne :** membres, collecteurs, admins
- **Statut :** En cours — **phase analyse (re-challenge du PRD d'avril 2026)**
- **Demandes liées :** #1 (vente du rab) et #22 (gestion des doubles) — **en attente**,
  à cadrer ensemble après #16 (modèle commun « offre/vente », #1 = première tranche de #22).
  Ordre acté avec Cyril le 2026-07-21 : **#16 → #1 → #22**.

## Contexte

Aujourd'hui la « collecte principale » d'un billet vit directement dans la table
`billets` (Prix, PrixVariante, PayerFDP, FDP_Com, Categorie, dates), héritage du
Google Sheet « 1 ligne = 1 billet = 1 collecte ». Conséquences :

- impossible de collecter une seule version d'un billet qui en a deux (magouille
  « prix Normal à 0 € ») ;
- modifier les versions déclarées d'un billet déclenche un recalcul risqué des
  inscriptions ;
- pas de collectes successives propres (relance, reliquat, version découverte) ;
- le **statut** est porté par le billet alors qu'il décrit en réalité l'état de
  *sa collecte* (pré-collecte → collecte → terminé) ou son *absence de collecte*
  (pas de collecte, projet, masqué).

## État des lieux (juillet 2026)

### Acquis d'avril 2026 (chantier epic 13, jamais livré)

| Artefact | Contenu | Verdict |
|---|---|---|
| [prd-refonte-collectes.md](../../_bmad-output/planning-artifacts/prd-refonte-collectes.md) | 31 FR, 13 NFR, principe directeur, périmètre MVP | **À garder, amendé** (voir re-challenge) |
| [architecture-refonte-collectes.md](../../_bmad-output/planning-artifacts/architecture-refonte-collectes.md) | Décisions D1–D12 + D-Sec1 | **À garder, amendé** |
| [tech-spec-13-refonte-collectes-migration.md](../../_bmad-output/implementation-artifacts/tech-spec-13-refonte-collectes-migration.md) | Plan d'exécution, audits AUD1–6 figés au 2026-04-09, amendements A1–A3 | **Audits à rejouer** (données et code ont bougé) |
| Branche `epic-13-refonte-collectes` | 35 commits (dernier 21/04), dont migrations SQL et `scripts/PROD-ROLLOUT-epic13.md` | **Ne sera jamais mergée** (87 commits de retard sur main) — référence de lecture uniquement |

Choix notables faits sur la branche (à re-valider, pas à re-découvrir) :

- `billets.Categorie` **dérivée des collectes par trigger** (priorité
  Pré collecte > Collecte > Terminé), remise à NULL si plus aucune collecte →
  badge cliquable pour saisir un **statut manuel** (Projet, Masqué, Pas de collecte).
- `date_effective` du billet dérivée de `MAX(date_pre, date_coll, date_fin)` des collectes.
- `pas_interesse` **déplacé** de `inscriptions` vers `collection` (c'est une relation
  membre ↔ billet, pas une inscription à une collecte).
- RPC `compteurs_inscriptions_par_collecte()` pour contourner la limite 1000 de PostgREST.

### État prod (relevé du 2026-07-22 via supabase-admin-proxy)

| Mesure | Avril 2026 | Juillet 2026 |
|---|---|---|
| billets | 5 255 | **5 420** |
| inscriptions | 1 582 | **4 611** (×3 !) |
| lignes `collectes` | 0 (après purge P0) | **0** |
| inscriptions avec `collecte_id` | 0 | **0** |
| inscriptions `pas_interesse=true` | — | 581 |

Distribution `billets.Categorie` : Terminé 5 192 · Pas de collecte 93 ·
Pré collecte 76 · Jamais édité, projet 29 · Masqué 21 · Collecte 9.
Soit **85 collectes actives** et **143 billets sans collecte**.

**Constat clé** : la table `collectes` (créée par l'épic 12, câblée dans le front
pour les « collectes supplémentaires », enrichie de `nb_max` par la demande #24)
n'a **jamais servi en prod**. L'hypothèse A3 d'avril (« `collectes` vide au
démarrage de la migration ») **tient encore aujourd'hui, mais par chance** : la
première collecte supplémentaire créée par un collecteur la rendra fausse.

### Ce qui a bougé sur main depuis avril (surface d'audit à refaire)

~35 fichiers, +4 941/−281 lignes depuis la base de la branche. Nouveaux
consommateurs des champs commerciaux/statut du billet, inconnus du PRD d'avril :

- `global.js` — `loadSommeDue()` (demande #4) : lit `Prix`, `PrixVariante`,
  `PayerFDP`, `Categorie`, `Collecteur` sur **toutes les pages** (badge menu).
- `admin-stats.js` (demande #26) : stats par `Categorie`, `DateColl`, `Collecteur`.
- `mes-collectes.js` (+1 061 lignes : #14 archivage réparties, #19, #25 mode
  envoi/prix auto, refus de déclaration…) — déjà le plus gros lecteur en avril.
- `app-new.js` : plafond `nb_max` (#24), affichage collectes supplémentaires.
- `mes-inscriptions.js` : annulation paiement (#20), historique validations (#11).

Occurrences actuelles `Prix|PrixVariante|PayerFDP|FDP_Com` : admin.js 29,
mes-collectes.js 28, mes-inscriptions.js 18, app-new.js 10, global.js 4, app.js 5.
`Categorie` : 84 occurrences dans 9 fichiers (dont admin-stats.js et
admin-pre-inscriptions.js, absents de l'inventaire d'avril).

## Re-challenge du PRD/architecture d'avril

### Ce qu'on garde (validé en juillet)

- **Le principe directeur intangible** : modifier la déclaration des versions d'un
  billet n'altère jamais une inscription à valeur métier — ça n'ouvre/ferme que le
  portail des saisies futures.
- **D1/A1** : réutiliser `collectes.scope` (`normal`/`variante`/`les_deux`) tel quel ;
  nouvelles colonnes `prix`, `prix_variante`, `payer_fdp`, `fdp_com` sur `collectes`.
- **D3/A2** : `inscriptions.collecte_id` NOT NULL, FK `ON DELETE RESTRICT`,
  UK `(collecte_id, membre_email)` remplaçant `(billet_id, membre_email)` —
  corrige nativement le bug FR31 (`recalculerAutoInscriptionsBatch`).
- **D5** : hook auto-inscription déplacé de la création de billet vers la création
  de collecte, `scope` appliqué en masque sur `nb_normaux`/`nb_variantes`.
- **D7–D9** : migration SQL unique, transactionnelle, idempotente ; `pg_dump`
  avant bascule ; fenêtre de maintenance courte ; contrôle d'égalité pré/post.
- **D2/D10** : aucun rename de colonnes existantes dans ce chantier.
- Triggers PG pour les invariants cross-tables (D4, D12).

### Ce qui est caduc ou à amender

1. **A3 (« collectes vide »)** : abandonné. Vrai aujourd'hui mais fragile — la
   migration sera **additive** : elle absorbe les lignes `collectes` existantes
   au jour J, pas de gel des collectes supplémentaires (décision Q2).
2. **Backfill « 1 collecte par billet »** (~5 420 lignes) : restreint aux billets
   en Pré collecte / Collecte / Terminé (décision Q2, validée par l'audit AUD-N1 :
   les 143 billets sans collecte ne portent aucune inscription à valeur métier).
3. **Plan staging S1–S5** : reposait sur l'env TestEnv + 2ᵉ projet Supabase ; le
   repo TestEnv est **archivé** depuis juin. À redéfinir (Q3).
4. **Audits AUD1–6** : à rejouer intégralement (volumes ×3 sur inscriptions,
   `nb_max` ajouté, valeurs `PayerFDP` à re-distribuer — `loadSommeDue` compare
   `=== 'oui'` alors que l'audit d'avril montrait `Oui`/`NON`/`non`…).
5. **Inventaire front du PRD** : incomplet en juillet — ajouter `global.js`
   (somme due), `admin-stats.js`, les zones nouvelles de `mes-collectes.js`
   (#14/#19/#25), `app-new.js` (#24). Refaire l'inventaire ligne à ligne au moment
   de la tech-spec.
6. **Cycle de vie / statut billet** : le PRD l'esquivait, la branche l'a tranché
   (dérivation par trigger + statut manuel si 0 collecte). À intégrer au PRD
   amendé comme exigence de premier rang, pas comme détail d'implémentation. (Q1)

### Ce qui manquait (nouveaux points à couvrir)

- **Anticipation #1/#22 dans le schéma** : prévoir sans les développer
  (a) un `type` de collecte (`collecte` / `vente_reliquat`…) et (b) la possibilité
  d'un prix par inscription (surcharge). Objectif : ne pas se re-fermer la porte. (Q4)
- **`pas_interesse` (581 lignes en prod)** : le déplacement vers `collection` fait
  sur la branche règle la dette sémantique que le PRD reportait en post-MVP.
  L'inclure dans le périmètre #16 ? (Q5)
- **`collectes.nb_max`** (#24) : nouveau champ à intégrer au modèle cible (une
  collecte backfillée historique n'a pas de plafond → NULL, OK).
- **Somme due (#4)** : le calcul devra joindre `inscriptions → collectes` au lieu
  de `billets` ; c'est le chemin le plus chaud (exécuté sur chaque page).
- **Sécurité RLS** : le backlog porte 2 vulnérabilités (`inscriptions_auto` SELECT
  HIGH, `membres_read_authenticated` MEDIUM) — hors scope #16 mais la fenêtre de
  maintenance est une occasion de les traiter. (Q6)

## Décisions (réponses de Cyril, 2026-07-22)

- **Q1 — Statut du billet : ✅ VALIDÉ.** `Categorie` dérivée automatiquement des
  collectes (Pré collecte > Collecte > Terminé), NULL + statut **manuel**
  (Projet / Masqué / Pas de collecte) quand aucune collecte n'existe.
  **Exigence ajoutée par Cyril** : l'auto-inscription ne doit **jamais réinscrire**
  un membre déjà inscrit sur une autre collecte du même billet couvrant la même
  version. La nouvelle UK `(collecte_id, membre_email)` *autorise* techniquement
  ce doublon (c'est voulu pour les inscriptions manuelles : reliquat, rachat…) —
  la déduplication doit donc vivre **dans le hook d'auto-inscription** : à la
  création d'une collecte, exclure les membres ayant déjà une inscription non
  désinscrite sur une collecte du même billet dont le `scope` recouvre celui de
  la nouvelle (normal ∩ normal, variante ∩ variante, les_deux ∩ tout).
  À formaliser en tech-spec (règle de recouvrement + définition exacte de
  « déjà inscrit »).
- **Q2 — Périmètre du backfill : tranché.** Pas de gel des collectes
  supplémentaires : la migration **absorbe l'existant** au jour J (backfill
  additif — on vérifie ce que contient `collectes` au moment de migrer et on
  rattache, l'hypothèse « table vide » d'avril est abandonnée).
  Le backfill crée une collecte historique **uniquement pour les billets en
  Pré collecte / Collecte / Terminé** (5 277 aujourd'hui). Les 143 billets
  « sans collecte » (= `Categorie` ∈ Pas de collecte 93 / Jamais édité-projet 29 /
  Masqué 21 — des billets pour lesquels aucune collecte n'a jamais été lancée ou
  aboutie) **ne reçoivent pas de collecte** : ils passent en statut manuel.
  L'audit AUD-N1 (joué le 2026-07-22, voir ci-dessous) confirme que c'est sans
  perte : leurs seules inscriptions sont 9 pré-inscriptions automatiques non
  payées (billets 5393 ITIF / 5395 VEHH) → **purgeables** (aucune valeur métier,
  conforme au principe directeur), et 3 `pas_interesse` qui migrent vers
  `collection` de toute façon.
- **Q2bis — Cycle de vie de la pré-collecte abandonnée (précision Cyril,
  2026-07-22).** Flux nominal : à la création d'un billet on lance en général une
  **pré-collecte** (sans savoir encore si le billet sera obtenable). Si on se rend
  compte qu'il ne sera pas collectable : **on supprime la pré-collecte** (on ne
  passe ni la collecte ni le billet en « Pas de collecte » à la main). Le billet
  n'ayant plus aucune collecte, il retombe sur le statut manuel avec **« Pas de
  collecte » par défaut**, modifiable ensuite en « Jamais édité, projet » (ou
  « Masqué »). Si un jour on relance une collecte, la dérivation reprend la main
  et le statut manuel s'efface.
  Le partage des rôles devient net : « Pré collecte / Collecte / Terminé » sont
  des états **de collecte** (dérivés sur le billet) ; « Pas de collecte / Projet /
  Masqué » des états **du billet seul** (aucune collecte).
  **Implications à traiter en tech-spec :**
  - La FK `ON DELETE RESTRICT` interdit de supprimer une collecte portant des
    inscriptions → la suppression d'une pré-collecte doit supprimer d'abord ses
    pré-inscriptions automatiques, et n'être **autorisée que si toutes les
    inscriptions rattachées sont sans valeur métier** (`changed_by='pré-inscription'`,
    non payé) — garanti en pratique puisque le paiement est bloqué en pré-collecte ;
    sinon la suppression est refusée (pas de cascade silencieuse).
  - Le mécanisme de dérivation doit poser « Pas de collecte » comme défaut à la
    disparition de la dernière collecte (la branche d'avril mettait NULL + badge
    de saisie manuelle — à aligner sur ce défaut).
  - Les billets 5393/5395 d'AUD-N1 sont exactement ce cas historique (pré-collecte
    abandonnée dont les pré-inscriptions sont restées) : le nouveau flux les
    aurait purgées proprement.
- **Q3 — Environnement de validation : tranché.** **Pas de réactivation de
  TestEnv ni de staging déployé** (risque assumé : la lourdeur du staging est ce
  qui a fait mourir la v1 d'avril). Stratégie : tout préparer sur une **branche
  longue durée**, analyse poussée en amont (cette spec + tech-spec), merge sur
  main uniquement quand on est sûrs (fonctionnalités ET interface), correctifs
  au fil de l'eau si des bugs remontent. **Reste non négociable** : le script SQL
  étant destructif, il sera testé à blanc sur une **copie jetable de la base**
  (projet Supabase gratuit temporaire restauré du `pg_dump`, contrôles d'égalité
  pré/post) — c'est du SQL pur, aucun front à déployer ; un front local peut
  pointer la copie pour les smoke tests si utile.
- **Q4 — Anticipation #1/#22 : reformulée, recommandation par défaut.**
  La question était : faut-il ajouter *dès cette migration* des colonnes qui ne
  serviront qu'aux demandes #1/#22 (un `type` de collecte « vente de reliquat »,
  un prix personnalisé par inscription), pour éviter une seconde migration plus
  tard ? **Recommandation retenue : non** — un `ALTER TABLE ADD COLUMN` ultérieur
  est trivial (pas de migration de données, pas de fenêtre de maintenance), et
  le modèle cible ne bloque structurellement ni l'un ni l'autre. On n'ajoute
  rien maintenant ; on statuera au cadrage de #1.
- **Q5 — `pas_interesse` : ✅ INCLUS dans #16.** Déplacement de
  `inscriptions.pas_interesse` (581 lignes) vers `collection`, comme sur la
  branche d'avril. **Exigence fonctionnelle ajoutée** : cliquer « Pas intéressé »
  doit aussi **masquer le billet sur la page billets** (catalogue), et le
  masquage devra être repris dans la future page collections.
- **Q6 — RLS sécurité : ❌ HORS périmètre #16.** La migration est déjà énorme ;
  les 2 vulnérabilités (`inscriptions_auto` SELECT HIGH,
  `membres_read_authenticated` MEDIUM) restent au backlog sécurité, à traiter
  dans un chantier séparé après la bascule.

## Audits (plan consolidé — verrou ready-for-dev)

**Audit des audits (2026-07-22, question de Cyril)** : la liste d'avril (AUD1–6)
a été croisée décision par décision avec l'addendum (AM1–AM7, N1–N4). Verdict :
insuffisante — elle ignorait le croisement des colonnes de version, la
représentation de la désinscription, l'état de la table `collection`, la
couverture des dates pour le backfill, le graphe des FK et les triggers déjà en
prod. Plan consolidé ci-dessous. Les audits **données** sont joués via le Worker ;
les audits **schéma** (information_schema, policies, triggers) passent par
`scripts/audit-refonte-2026-07.sql` (local, à coller dans le SQL Editor par Cyril,
lecture seule).

### Joués le 2026-07-22 via le Worker (résultats figés)

- ✅ **AUD-N1 — inscriptions des billets sans collecte** (sert AM2) :
  Pas de collecte : 9 inscriptions sur 2 billets (5393 ITIF, 5395 VEHH), toutes
  `changed_by='pré-inscription'` + `non_paye` → purgeables ; Projet : 0 ;
  Masqué : 3, toutes `pas_interesse`. Backfill restreint validé sans perte.
- ✅ **AUD-N2 — `PayerFDP` réel** (sert N2) : NULL 4 892 · `''` 262 · `'non'` 262 ·
  `'Oui'` 4. La comparaison `loadSommeDue` `=== 'oui'` ne matche **jamais**
  (bug latent : les 4 billets `'Oui'` n'ajoutent pas les FDP à la somme due) —
  normalisation à prévoir au backfill + correction du front à la bascule.
  `Prix` NULL : 1 299 · `PrixVariante` renseigné : 145.
- ✅ **AUD-N5 — croisement `VersionNormaleExiste` × `HasVariante`** (sert AM5) :
  VNE=T × HV `''` 5 142 · VNE=T × `D` 198 · VNE=T × `A` 47 · VNE=T × `N` 29 ·
  VNE=F × `D` 2 · VNE=F × `A` 2. **Mapping scope du backfill** : variante existe
  ssi HV ∈ {A,D} → `normal` 5 171 (VNE=T, HV ∈ {'',N}) · `les_deux` 245
  (VNE=T, HV ∈ {A,D}) · `variante` 4 (VNE=F, HV ∈ {A,D} — le cas « variante
  seule » qu'avril déclarait indétectable est désormais détectable).
- ✅ **AUD-N6 — désinscription & `changed_by`** (sert N1, AM4) :
  la désinscription est un **DELETE physique** (0 ligne à 0/0 hors
  `pas_interesse`) → « déjà inscrit » = la ligne existe, simple pour la règle
  anti-réinscription. `changed_by` : emails = saisies manuelles ·
  `'pré-inscription'` 330 = hooks auto actuels (admin.js:2146,
  admin-pre-inscriptions.js:652) · `'système'` 676 = **historique mars–avril 2026**
  (plus écrit par le code, dont 138 `confirme` → valeur métier, ne jamais purger
  sur ce seul critère) · 1 `'duplication billet 5212'`.
  `statut_paiement` : confirme 2 926 · non_paye 1 670 · declare 20.
  `statut_livraison` : non_reparti 3 285 · pret_a_envoyer 895 · expedie 436.
  `enveloppe_id` renseigné : 1 328.
- ✅ **AUD-N7 — table `collection`** (sert N3) : 101 lignes, colonnes
  `(membre_email, billet_id, owned_normal, owned_variante, serial_normal,
  serial_variante, nb_doubles)` — **pas de colonne `pas_interesse`** (à créer,
  comme sur la branche) ; migration des 582 en upsert (recouvrement possible
  avec les 101 lignes existantes). `nb_doubles` existe déjà (tous à 0) — hook
  naturel pour la demande #22.
- ✅ **AUD-N8 — colonnes variante « cachées »** : `CollecteurVariante`,
  `DateCollVariante`, `DateFinVariante` sont **100 % vides** sur 5 420 billets →
  colonnes mortes, à ajouter à la liste DROP de D2. Aucune « seconde collecte
  cachée » dans `billets`.
- ✅ **AUD3 rejoué — counts** : 5 420 billets · 4 616 inscriptions ·
  `collectes` 0 · `collecte_id` rattachés 0 · `pas_interesse` 582.
  Dates par catégorie (pour le backfill) : Terminé 5 193 dont DateColl NULL 128
  et DateFin NULL 58 ; DatePre jamais NULL sauf Masqué (18/21) → les collectes
  backfillées auront des dates partiellement NULL, prévoir le fallback de
  dérivation de `date_effective`. **À rejouer au jour J** (données vivantes).

### À jouer par Cyril dans le SQL Editor — `scripts/audit-refonte-2026-07.sql`

- ✅ **S1 — colonnes/types** (joué par Cyril le 2026-07-22) :
  - `billets` : `Prix`/`PrixVariante` = `numeric` sans précision (AUD4 confirmé,
    `NUMERIC(10,2)` côté `collectes` reste compatible) ; `PayerFDP`/`FDP_Com`
    text default `''` ; **`VersionNormaleExiste` boolean NULLABLE default true**
    → le mapping scope doit traiter NULL comme true ; dates en `date` ;
    trous dans les positions ordinales (14,16,17,25,29,30,33) = colonnes déjà
    droppées par le passé.
  - `collectes` : schéma epic 12 confirmé (id uuid, billet_id int NOT NULL,
    nom/scope NOT NULL, collecteur, date_pre/coll/fin, categorie, created_at,
    nb_max) — il manque bien `prix`, `prix_variante`, `payer_fdp`, `fdp_com`.
  - `inscriptions` : **`changed_by` NOT NULL DEFAULT `'système'`** — les 676
    lignes « système » sont donc des insertions historiques sans champ renseigné
    (le default), pas un acteur distinct ; `collecte_id uuid` nullable déjà là ;
    `nb_normaux` default 1, `nb_variantes` default 0 ; `adresse_snapshot` jsonb ;
    `mode_paiement` default `'PayPal'`.
  - `collection` : tout NOT NULL avec defaults → `pas_interesse boolean NOT NULL
    DEFAULT false` suivra le pattern.
  - `enveloppes` : aucune référence à `billets`/`collectes` (lien par
    `collecteur_alias`+`membre_email` ; c'est `inscriptions.enveloppe_id` qui
    porte la relation) → table **structurellement hors migration**.
- ✅ **S2 — contraintes** (joué par Cyril le 2026-07-22) :
  - UK `inscriptions (billet_id, membre_email)` confirmée (celle qu'on droppe).
  - **FK `inscriptions.collecte_id` déjà existante, `ON DELETE SET NULL`** →
    à passer `RESTRICT` comme prévu (A2).
  - **⚠ FK `collectes.billet_id` = `ON DELETE CASCADE`** : supprimer un billet
    emporte ses collectes. Aujourd'hui sans danger (la FK
    `inscriptions.billet_id`, NO ACTION, bloque de toute façon la suppression
    d'un billet ayant des inscriptions), mais à réexaminer en tech-spec pour
    cohérence avec le principe « aucune cascade destructrice » (candidat :
    passage en RESTRICT).
  - **⚠ `billets_hasvariante_check`** : `HasVariante ∈ {NULL, N, A, D}` — le
    CHECK interdit `''` alors que la colonne a `DEFAULT ''` (piège : le défaut
    violerait le CHECK ; les 5 142 « vides » vus dans les données sont donc des
    **NULL**). Mapping scope : variante existe ssi `HasVariante ∈ {A, D}`,
    NULL/N = pas de variante.
  - CHECKs utiles documentés : `mode_paiement {PayPal, Chèque}`,
    `statut_paiement {non_paye, declare, confirme}`,
    `statut_livraison {non_reparti, pret_a_envoyer, expedie, recu}` (`recu`
    jamais utilisé en données), `collectes.scope {normal, variante, les_deux}`.
- ✅ **S3 — graphe des FK** (joué par Cyril le 2026-07-22) : les seules tables
  référençant `billets` sont `collectes` (CASCADE), `collection`, `inscriptions`
  et **`signalements`** (CASCADE — demande #5, suit le billet, hors migration) ;
  la seule table référençant `collectes` est `inscriptions`. **Aucune dépendance
  oubliée** — `enveloppes`, `demandes`, `inscriptions_auto*` ne référencent ni
  billets ni collectes.
- ✅ **S4 — triggers** (joué par Cyril le 2026-07-22) :
  - **La dérivation de `date_effective` est DÉJÀ en prod des deux côtés** :
    `trg_billets_sync_date_effective` (BEFORE INSERT/UPDATE sur `billets` →
    `sync_billet_date_effective_from_billet()`) et
    `trg_collectes_sync_date_effective` (AFTER INSERT/UPDATE/DELETE sur
    `collectes` → `sync_billet_date_effective()`). Le pattern « le billet dérive
    des collectes » existe donc déjà pour les dates — la dérivation de
    `Categorie` (AM3) s'inscrira dans ce mécanisme, pas à côté. Corps des
    fonctions à récupérer (S8).
  - **⚠ `trg_inscription_audit`** (BEFORE INSERT/UPDATE sur `inscriptions` →
    `set_inscription_audit()`) : le backfill UPDATE des 4 616 `collecte_id`
    déclenchera ce trigger — risque d'écraser `last_changed`/`changed_by` sur
    toutes les lignes. La migration devra **désactiver temporairement** ce
    trigger (ou préserver les valeurs) — corps à récupérer (S8).
  - `trg_enforce_inscription_statut_paiement` (anti-fraude du 2026-07-14) :
    vérifier qu'il ne bloque pas les UPDATE de backfill (S8).
  - Divers `updated_at` (contacts_collecteur, demandes, signalements) +
    `trg_enforce_enveloppe_membre_update` : sans impact.
- ✅ **S5 — policies RLS** (joué par Cyril le 2026-07-22) :
  - **⚠ BLOQUANT MIGRATION : `billets_update_collecteur`** — son WITH CHECK gèle
    `Prix`, `PrixVariante`, `Collecteur`, `Reference` par sous-requêtes sur ces
    colonnes. Le `DROP COLUMN Prix/PrixVariante` **échouera** (dépendance) tant
    que cette policy n'est pas réécrite. À intégrer à la séquence de migration.
  - **⚠ Les 3 policies collecteur sur `inscriptions`**
    (`insert/update/delete_collecteur`) scoping par `billets."Collecteur"` :
    en multi-collectes (collecteurs différents par collecte du même billet),
    le bon scoping devient `collectes.collecteur` via `collecte_id`. À réécrire —
    et **question liée à trancher en tech-spec : sort de `billets.Collecteur`**
    (dérivé de la collecte « courante » comme Categorie ? gardé dénormalisé ?
    droppé ?). Idem `collectes_select/update_own_collecteur` (déjà corrects,
    par `collectes.collecteur`).
  - Vulnérabilité HIGH du backlog **confirmée toujours présente** :
    `inscriptions_auto_select` laisse tout membre lire toutes les préférences
    (hors périmètre #16, backlog sécurité).
  - Pattern conforme : `roles={public}` + helpers `is_admin()/is_whitelisted()`,
    aucun `TO authenticated`. `collection` a des policies own/admin complètes →
    prêtes pour `pas_interesse` (la migration elle-même passe hors RLS).
  - `inscriptions_insert_own` utilise `is_bloque_inscription()` (helper à lister
    en S6).
- ✅ **S6 — fonctions/RPC** (joué par Cyril le 2026-07-22) : helpers
  `is_admin()`, `is_admin_ou_superadmin()`, `is_whitelisted()`, `is_collecteur()`,
  `is_bloque_inscription(email)` ; RPC `compteurs_inscriptions()` (v1 —
  la v2 + `compteurs_inscriptions_par_collecte()` de la branche n'ont jamais été
  déployées, la tech-spec v2 devra les créer) ; `marquer_signalement_vu`,
  `check_enveloppe_membre_update` + les 6 fonctions trigger vues en S4.
- ✅ **S8 — corps des fonctions trigger** (joué par Cyril le 2026-07-22) :
  - `set_inscription_audit` : sur UPDATE, force `changed_by :=
    COALESCE(jwt_email, 'système')` et `last_changed := NOW()` → **confirmé : le
    backfill doit `DISABLE TRIGGER trg_inscription_audit`** pendant l'UPDATE des
    4 616 lignes, puis le réactiver (sinon tout l'audit est écrasé).
  - `enforce_inscription_statut_paiement` : **bypass explicite si pas de JWT**
    (SQL Editor / service role) et retour immédiat si le statut ne change pas →
    **ne bloque pas la migration**. ⚠ Mais il scope le collecteur via
    `billets."Collecteur"` → à réécrire vers `collectes.collecteur` (s'ajoute
    aux 3 policies RLS dans la liste des dépendants de `billets.Collecteur`).
  - `sync_billet_date_effective` (AFTER sur collectes) et
    `sync_billet_date_effective_from_billet` (BEFORE sur billets) : calculent
    `GREATEST(dates du billet, MAX(dates des collectes))` → **lisent encore
    `billets.DatePre/DateColl/DateFin`** ; à réécrire (dérivation 100 % collectes)
    au moment du DROP de ces colonnes — plpgsql étant lié tardivement, le DROP ne
    casse pas à froid mais au premier déclenchement.
  - `enforce_enveloppe_membre_update` : aucune dépendance billets/collectes,
    hors impact.

**→ VERROU D'AUDIT LEVÉ le 2026-07-22** (hors AUD-N3 intégré à la tech-spec v2
et re-count au jour J). La tech-spec migration v2 peut être écrite.
- ✅ **S7 — index** (joué par Cyril le 2026-07-22) :
  - `inscriptions` : PK id · **UK `(billet_id, membre_email)`
    (`inscriptions_billet_id_membre_email_key`)** — confirme AUD2, c'est elle
    qu'on droppe · index `billet_id`, `membre_email`, `enveloppe_id`,
    `statut_livraison`. **Aucun index sur `collecte_id`** → la migration doit
    créer l'index (nouveau chemin de jointure principal, somme due sur chaque
    page) — la nouvelle UK `(collecte_id, membre_email)` le fournira.
  - `collection` : **PK `(membre_email, billet_id)`** → l'upsert des 582
    `pas_interesse` a sa cible de conflit naturelle (`ON CONFLICT` sur la PK).
  - `collectes` : PK id seulement. **Aucun index sur `collectes.billet_id`** →
    à créer (jointures billet ↔ collectes et triggers de dérivation du statut).

### Restant côté code (avant tech-spec)

- **AUD-N3** : inventaire ligne à ligne des lecteurs de
  `Prix|PrixVariante|PayerFDP|FDP_Com|Categorie` sur main (la carte grossière du
  2026-07-22 : admin.js 29, mes-collectes.js 28, mes-inscriptions.js 18,
  app-new.js 10+17, global.js, admin-stats.js, app.js, billet.js,
  admin-pre-inscriptions.js) — à détailler par zone fonctionnelle dans la
  tech-spec v2.

## Prochaines étapes

1. ~~Réponses de Cyril aux questions Q1–Q6~~ ✅ obtenues le 2026-07-22 (section
   Décisions ci-dessus). Seul point encore ouvert : valider la recommandation Q4
   (rien ajouter maintenant pour #1/#22) — décision par défaut si pas d'objection.
2. ~~Amendement formel du PRD/architecture~~ ✅ fait le 2026-07-22 :
   [addendum-refonte-collectes-2026-07.md](../../_bmad-output/planning-artifacts/addendum-refonte-collectes-2026-07.md)
   (confirmations, amendements AM1–AM7, nouvelles exigences N1–N4, hors périmètre) ;
   renvois posés en tête du PRD, de l'architecture et de la tech-spec 13.
3. ~~Rejeu des audits~~ ✅ quasi terminé le 2026-07-22 : audits données
   (AUD-N1/N2/N5/N6/N7/N8 + AUD3) et schéma S1–S7 joués, résultats figés
   ci-dessus. **Reste :** (a) **S8** — corps des 5 fonctions trigger (bloc
   ajouté au script, à jouer par Cyril) ; (b) AUD-N3 (inventaire code détaillé)
   intégré à la tech-spec v2 ; (c) re-count au jour J.
4. ~~Nouvelle tech-spec de migration~~ ✅ rédigée le 2026-07-22 :
   `_bmad-output/implementation-artifacts/tech-spec-16-refonte-collectes-v2.md`
   (locale, gitignorée — remplace la tech-spec 13). Blocs A0–A13 (SQL), B1–B6
   (admin), C1–C7 (membre + nouveaux lecteurs), D (cache), E0–E2 (runbook sans
   staging), AC21–AC26 ajoutés. **4 décisions DV2-1..4 à valider par Cyril**
   avant dev : FK collectes CASCADE→RESTRICT, marqueur « Collecte initiale »,
   `billets.Collecteur` conservé en phase 1 (bascule scoping = dette tracée),
   retrait du statut de la colonne `Recherche`.
5. Dev (nouvelle branche, la branche d'avril restant en référence), validation
   à blanc, bascule en fenêtre de maintenance, surveillance 24 h, correctifs au
   fil de l'eau.

## Réalisation

*(à compléter après dev)*
