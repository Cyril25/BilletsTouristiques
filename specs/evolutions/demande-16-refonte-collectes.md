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

1. **A3 (« collectes vide »)** : vrai aujourd'hui mais fragile. La migration doit
   soit gérer des lignes `collectes` existantes (backfill additif), soit être
   précédée d'un **gel des collectes supplémentaires** clairement acté. À trancher (Q2).
2. **Backfill « 1 collecte par billet »** (~5 420 lignes) : discutable pour les
   **143 billets sans collecte** (Pas de collecte / Projet / Masqué) — leur créer
   une collecte fantôme contredit le nouveau modèle « billet sans collecte ».
   Proposition : ne backfiller que les billets en Pré collecte / Collecte / Terminé
   **ou** ayant ≥ 1 inscription (audit AUD-N1 ci-dessous). (Q2)
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

## Points à trancher avec Cyril avant la tech-spec

- **Q1 — Statut du billet** : on valide le modèle de la branche ? `Categorie`
  dérivée automatiquement des collectes (Pré collecte > Collecte > Terminé),
  NULL + statut **manuel** (Projet / Masqué / Pas de collecte) quand aucune
  collecte n'existe. Corollaire : relancer une collecte (ou une vente de reliquat)
  sur un billet Terminé le fait **repasser automatiquement** en Collecte — voulu ?
- **Q2 — Périmètre du backfill** : une collecte historique par billet pour les
  5 277 billets Pré/Collecte/Terminé uniquement (+ ceux ayant des inscriptions),
  et **aucune** pour les 143 sans collecte ? Et d'ici la migration : gèle-t-on la
  création de collectes supplémentaires (aujourd'hui table vide) ou la migration
  doit-elle les absorber ?
- **Q3 — Environnement de validation** : réactiver TestEnv (repo archivé) +
  2ᵉ projet Supabase avec dump prod, ou valider uniquement sur copie Supabase
  locale/staging sans front déployé ? (Le critère « migration exécutée à blanc sur
  jeu réel complet » reste non négociable.)
- **Q4 — Anticipation #1/#22** : ajoute-t-on dès la migration `collectes.type`
  et/ou `inscriptions.prix_perso` (colonnes dormantes), ou rien tant que #1 n'est
  pas cadrée (le modèle le permettant déjà structurellement) ?
- **Q5 — `pas_interesse`** : déplacement vers `collection` inclus dans #16
  (comme sur la branche) ou chantier séparé ?
- **Q6 — Opportunité sécurité** : corriger les 2 policies RLS du backlog pendant
  la fenêtre de maintenance ?

## Audits à rejouer avant d'écrire la tech-spec (verrou ready-for-dev)

- **AUD1–AUD6 d'avril** : rejouer sur la prod de juillet (colonnes de version,
  UK actuelle, counts, types prix/FDP, policies RLS `inscriptions`, sémantique
  `FDP_Com`).
- **AUD-N1 (nouveau)** : inscriptions portées par des billets en
  Pas de collecte / Projet / Masqué (détermine le périmètre du backfill, Q2).
- **AUD-N2 (nouveau)** : distribution actuelle de `PayerFDP` + inventaire des
  comparaisons front (`=== 'oui'` vs casse réelle).
- **AUD-N3 (nouveau)** : inventaire ligne à ligne des lecteurs de
  `Prix|PrixVariante|PayerFDP|FDP_Com|Categorie` sur main (grep du 2026-07-22 en
  donne la carte grossière, à détailler par zone fonctionnelle).

## Prochaines étapes

1. Réponses de Cyril aux questions Q1–Q6.
2. Amendement formel du PRD/architecture (ou addendum) intégrant les décisions.
3. Rejeu des audits (AUD1–6 + N1–N3), résultats figés dans la tech-spec.
4. Nouvelle tech-spec de migration (repartant de celle d'avril, corrigée des
   amendements) + plan de bascule adapté à l'environnement choisi en Q3.
5. Dev (nouvelle branche, la branche d'avril restant en référence), validation
   à blanc, bascule en fenêtre de maintenance, surveillance 24 h.

## Réalisation

*(à compléter après dev)*
