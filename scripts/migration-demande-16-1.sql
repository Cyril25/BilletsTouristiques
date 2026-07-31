-- ============================================================================
-- MIGRATION DEMANDE #16 — Refonte collectes : découplage billet ↔ collecte
-- ============================================================================
-- Source     : _bmad-output/implementation-artifacts/tech-spec-16-refonte-collectes-v2.md
--              (blocs A0–A13 ; DV2-1..4 validées par Cyril le 2026-07-22)
-- Addendum   : _bmad-output/planning-artifacts/addendum-refonte-collectes-2026-07.md
-- Audits     : specs/evolutions/demande-16-refonte-collectes.md (AUD-N1..N8, S1–S8)
-- Créé le    : 2026-07-22 — branche demande-16-refonte-collectes
--
-- OBJECTIF
--   La « collecte principale » d'un billet vit aujourd'hui dans la table billets
--   (Prix, PrixVariante, PayerFDP, FDP_Com, dates, Categorie). Ce script la
--   déplace dans la table collectes, rattache toutes les inscriptions à une
--   collecte, et fait de billets."Categorie" une valeur DÉRIVÉE des collectes.
--
-- PRÉREQUIS (runbook E0/E1)
--   1. pg_dump complet archivé et horodaté — SEUL point de rollback (E2).
--   2. Fenêtre de maintenance : LECTURES ET ÉCRITURES bloquées (banner bloquant).
--   3. Re-count du jour J (AUD3) : nb billets / inscriptions / collectes.
--   4. Vérifier qu'AUCUNE collecte existante ne se nomme 'Collecte initiale'
--      (marqueur DV2-2) — le script le contrôle lui-même et refuse de tourner.
--
-- CE QUE CE SCRIPT NE FAIT PAS
--   - Aucune purge de la table collectes : la migration est ADDITIVE (AM1).
--     Les collectes supplémentaires existantes sont conservées telles quelles.
--   - Aucun DROP des colonnes billets migrées : elles sont RENOMMÉES
--     *_deprecated (A11), réversible. Le DROP définitif fera l'objet d'un
--     script séparé post-stabilisation.
--   - Aucune bascule du scoping collecteur vers collectes.collecteur (DV2-3) :
--     billets."Collecteur" reste la source des policies RLS collecteur.
--     → DETTE TRACÉE : obligatoire avant d'autoriser deux collecteurs
--       différents sur deux collectes d'un même billet.
--
-- PROPRIÉTÉS
--   - Transactionnel : tout ou rien (BEGIN … COMMIT). Toute anomalie détectée
--     par un safety-net lève une EXCEPTION → ROLLBACK automatique intégral.
--   - Idempotent : une seconde exécution est un no-op (détection via
--     inscriptions.collecte_id NOT NULL, posé par A5).
--
-- EXÉCUTION : SQL Editor Supabase (rôle postgres), d'un seul bloc.
-- ============================================================================

BEGIN;

-- ============================================================================
-- A0 — PRÉAMBULE : état de départ, capture des contrôles, neutralisation audit
-- ============================================================================

-- Note temp tables : PAS de « ON COMMIT DROP ». Le SQL Editor Supabase peut
-- émettre des commits implicites en cours de script, ce qui largueait ces tables
-- (→ « relation _mig16_xxx does not exist »). Sans ON COMMIT DROP elles vivent le
-- temps de la session ; le « DROP IF EXISTS » en tête rend le script re-jouable.

-- État : la migration a-t-elle déjà été appliquée ? (idempotence)
DROP TABLE IF EXISTS _mig16_etat;
CREATE TEMP TABLE _mig16_etat AS
SELECT COALESCE((
    SELECT a.attnotnull
    FROM pg_attribute a
    WHERE a.attrelid = 'public.inscriptions'::regclass
      AND a.attname  = 'collecte_id'
      AND NOT a.attisdropped
), false) AS deja_migre;

-- Photo « avant » — sert aux safety-nets d'A9 (counts, sommes, audit)
DROP TABLE IF EXISTS _mig16_avant;
CREATE TEMP TABLE _mig16_avant (
    nb_billets            BIGINT,
    nb_billets_scope      BIGINT,
    nb_inscriptions       BIGINT,
    nb_pas_interesse      BIGINT,
    nb_changed_by_systeme BIGINT,
    nb_collectes          BIGINT,
    somme_prix            NUMERIC,
    somme_prix_variante   NUMERIC
);

-- Flux mesurés pendant la migration — servent aux contrôles d'égalité d'A9
DROP TABLE IF EXISTS _mig16_flux;
CREATE TEMP TABLE _mig16_flux (nb_purge_a3d BIGINT NOT NULL DEFAULT 0);
INSERT INTO _mig16_flux DEFAULT VALUES;

-- Snapshot (id, changed_by) AVANT migration — sert au contrôle d'audit A9.6.
-- Vérifie que les inscriptions SURVIVANTES gardent leur changed_by (preuve que le
-- DISABLE TRIGGER a marché) ; les suppressions légitimes (A3c/A3d) n'y figurent pas.
DROP TABLE IF EXISTS _mig16_audit_avant;
CREATE TEMP TABLE _mig16_audit_avant AS
SELECT id, changed_by FROM inscriptions WHERE false;

DO $$
DECLARE v_deja BOOLEAN;
BEGIN
    SELECT deja_migre INTO v_deja FROM _mig16_etat;

    IF v_deja THEN
        RAISE NOTICE '[A0] Migration #16 DÉJÀ APPLIQUÉE (inscriptions.collecte_id NOT NULL).';
        RAISE NOTICE '[A0] Les blocs de données sont ignorés ; seuls les objets (triggers, fonctions, index) sont réappliqués.';
        RETURN;
    END IF;

    -- DV2-2 : le marqueur 'Collecte initiale' doit être libre avant le backfill
    IF EXISTS (SELECT 1 FROM collectes WHERE nom = 'Collecte initiale') THEN
        RAISE EXCEPTION
            'ARRÊT A0 : des collectes se nomment déjà « Collecte initiale » — le marqueur DV2-2 n''est pas discriminant. Renommer ces collectes avant de relancer.';
    END IF;

    -- Snapshot d'audit (avant toute suppression/UPDATE) pour A9.6
    INSERT INTO _mig16_audit_avant SELECT id, changed_by FROM inscriptions;

    INSERT INTO _mig16_avant
    SELECT (SELECT COUNT(*)                       FROM billets),
           (SELECT COUNT(*)                       FROM billets WHERE "Categorie" IN ('Pré collecte', 'Collecte', 'Terminé')),
           (SELECT COUNT(*)                       FROM inscriptions),
           (SELECT COUNT(*)                       FROM inscriptions WHERE pas_interesse = true),
           (SELECT COUNT(*)                       FROM inscriptions WHERE changed_by = 'système'),
           (SELECT COUNT(*)                       FROM collectes),
           -- ROUND(...,2) : billets."Prix" est numeric sans précision, collectes.prix
           -- est NUMERIC(10,2). Le backfill arrondit au centime à l'insertion ; on
           -- compare donc l'arrondi au centime des deux côtés (sinon une valeur
           -- sous le centime en prod fait diverger les sommes — cf. A9.5).
           (SELECT COALESCE(SUM(ROUND("Prix", 2)), 0)          FROM billets WHERE "Categorie" IN ('Pré collecte', 'Collecte', 'Terminé')),
           (SELECT COALESCE(SUM(ROUND("PrixVariante", 2)), 0)  FROM billets WHERE "Categorie" IN ('Pré collecte', 'Collecte', 'Terminé'));

    RAISE NOTICE '[A0] État avant migration : % billets (dont % dans le périmètre backfill), % inscriptions (dont % pas_interesse), % collectes préexistantes.',
        (SELECT nb_billets FROM _mig16_avant), (SELECT nb_billets_scope FROM _mig16_avant),
        (SELECT nb_inscriptions FROM _mig16_avant), (SELECT nb_pas_interesse FROM _mig16_avant),
        (SELECT nb_collectes FROM _mig16_avant);
END $$;

-- S8 : set_inscription_audit() écrase changed_by/last_changed sur CHAQUE UPDATE.
-- Le backfill A4 touche toutes les inscriptions → audit détruit si le trigger reste actif.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger
               WHERE tgrelid = 'public.inscriptions'::regclass
                 AND tgname  = 'trg_inscription_audit') THEN
        ALTER TABLE inscriptions DISABLE TRIGGER trg_inscription_audit;
        RAISE NOTICE '[A0] trg_inscription_audit DÉSACTIVÉ (réactivé en A12).';
    ELSE
        RAISE WARNING '[A0] trg_inscription_audit introuvable — vérifier le schéma (S4).';
    END IF;
END $$;

-- Note S8 : trg_enforce_inscription_statut_paiement a un bypass explicite sans JWT
-- (SQL Editor) → rien à faire. trg_collectes_sync_date_effective peut rester actif :
-- il ne touche que billets.date_effective, recalculée en A10.

-- ============================================================================
-- A2 — Colonnes commerciales sur collectes (types figés par S1/AUD4)
-- ============================================================================

ALTER TABLE collectes ADD COLUMN IF NOT EXISTS prix          NUMERIC(10,2);
ALTER TABLE collectes ADD COLUMN IF NOT EXISTS prix_variante NUMERIC(10,2);
ALTER TABLE collectes ADD COLUMN IF NOT EXISTS payer_fdp     TEXT NOT NULL DEFAULT '';
ALTER TABLE collectes ADD COLUMN IF NOT EXISTS fdp_com       TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN collectes.payer_fdp IS 'Miroir de billets.PayerFDP, normalisé lower(trim()) : ''oui'' = FDP à la charge de la collecte, tout le reste = non.';
COMMENT ON COLUMN collectes.fdp_com   IS 'Note libre (AUD6) — purement informatif, n''entre JAMAIS dans un calcul de montant.';

-- ============================================================================
-- A3 — Backfill restreint (AM2) + mapping scope v2 (AM5 / AUD-N5)
--      Une « Collecte initiale » par billet en Pré collecte / Collecte / Terminé.
--      Attendu au 2026-07-22 : 5 277 collectes créées.
-- ============================================================================

DO $$
DECLARE v_deja BOOLEAN; v_n BIGINT;
BEGIN
    SELECT deja_migre INTO v_deja FROM _mig16_etat;
    IF v_deja THEN RETURN; END IF;

    INSERT INTO collectes (billet_id, nom, scope, collecteur,
                           date_pre, date_coll, date_fin, categorie,
                           prix, prix_variante, payer_fdp, fdp_com)
    SELECT b.id,
           'Collecte initiale',                                    -- marqueur DV2-2
           CASE
               -- « variante seule » : détectable depuis que VersionNormaleExiste existe (AM5)
               WHEN COALESCE(b."VersionNormaleExiste", true) = false
                    AND b."HasVariante" IN ('A', 'D')          THEN 'variante'
               WHEN b."HasVariante" IN ('A', 'D')              THEN 'les_deux'
               ELSE                                                 'normal'
           END,
           b."Collecteur",                                          -- DV2-3 : collecteur principal recopié
           b."DatePre", b."DateColl", b."DateFin", b."Categorie",
           b."Prix", b."PrixVariante",
           COALESCE(NULLIF(LOWER(TRIM(b."PayerFDP")), ''), ''),     -- normalise 'Oui' → 'oui' (AUD-N2 / AC26)
           COALESCE(b."FDP_Com", '')
    FROM billets b
    WHERE b."Categorie" IN ('Pré collecte', 'Collecte', 'Terminé')  -- AM2
      AND NOT EXISTS (SELECT 1 FROM collectes c
                      WHERE c.billet_id = b.id AND c.nom = 'Collecte initiale');

    GET DIAGNOSTICS v_n = ROW_COUNT;
    RAISE NOTICE '[A3] % collectes « Collecte initiale » créées.', v_n;

    -- nb_max laissé à NULL : pas de plafond, comportement historique (N4).
END $$;

-- ----------------------------------------------------------------------------
-- A3b — Filet : collectes PRÉEXISTANTES sans prix/FDP (cœur du mode additif AM1)
-- ----------------------------------------------------------------------------

DO $$
DECLARE v_deja BOOLEAN; v_n BIGINT;
BEGIN
    SELECT deja_migre INTO v_deja FROM _mig16_etat;
    IF v_deja THEN RETURN; END IF;

    UPDATE collectes c
    SET prix          = COALESCE(c.prix, b."Prix"),
        prix_variante = COALESCE(c.prix_variante, b."PrixVariante"),
        payer_fdp     = CASE WHEN COALESCE(c.payer_fdp, '') = ''
                             THEN COALESCE(NULLIF(LOWER(TRIM(b."PayerFDP")), ''), '')
                             ELSE c.payer_fdp END,
        fdp_com       = CASE WHEN COALESCE(c.fdp_com, '') = ''
                             THEN COALESCE(b."FDP_Com", '')
                             ELSE c.fdp_com END
    FROM billets b
    WHERE c.billet_id = b.id
      AND (c.prix IS NULL OR COALESCE(c.payer_fdp, '') = '');

    GET DIAGNOSTICS v_n = ROW_COUNT;
    RAISE NOTICE '[A3b] % collectes complétées depuis leur billet (prix/FDP vides).', v_n;
END $$;

-- ----------------------------------------------------------------------------
-- A3c — pas_interesse : inscriptions → collection (N3 / Q5 / AUD-N7)
--       « Pas intéressé » est une relation membre ↔ BILLET, pas une inscription.
--       Attendu : 582 lignes migrées puis supprimées d'inscriptions.
-- ----------------------------------------------------------------------------

ALTER TABLE collection ADD COLUMN IF NOT EXISTS pas_interesse BOOLEAN NOT NULL DEFAULT false;

DO $$
DECLARE v_ins BIGINT; v_del BIGINT;
BEGIN
    INSERT INTO collection (membre_email, billet_id, pas_interesse,
                            owned_normal, owned_variante, serial_normal, serial_variante, nb_doubles)
    SELECT DISTINCT i.membre_email, i.billet_id, true,
           false, false, '', '', 0
    FROM inscriptions i
    WHERE i.pas_interesse = true
    ON CONFLICT (membre_email, billet_id) DO UPDATE SET pas_interesse = true;  -- PK confirmée S7

    GET DIAGNOSTICS v_ins = ROW_COUNT;

    DELETE FROM inscriptions WHERE pas_interesse = true;
    GET DIAGNOSTICS v_del = ROW_COUNT;

    RAISE NOTICE '[A3c] pas_interesse : % lignes upsertées dans collection, % inscriptions supprimées.', v_ins, v_del;
END $$;

-- ----------------------------------------------------------------------------
-- A3d — Purge des pré-inscriptions sans valeur métier des billets HORS backfill
--       (AUD-N1 : 9 lignes attendues, billets 5393 ITIF / 5395 VEHH)
-- ----------------------------------------------------------------------------

DO $$
DECLARE v_del BIGINT; v_reste BIGINT; v_detail TEXT;
BEGIN
    DELETE FROM inscriptions i
    USING billets b
    WHERE i.billet_id = b.id
      AND b."Categorie" NOT IN ('Pré collecte', 'Collecte', 'Terminé')
      AND i.changed_by      = 'pré-inscription'
      AND i.statut_paiement = 'non_paye'
      AND i.envoye          = false
      AND i.fdp_regles      = false;

    GET DIAGNOSTICS v_del = ROW_COUNT;
    UPDATE _mig16_flux SET nb_purge_a3d = v_del;
    RAISE NOTICE '[A3d] % pré-inscriptions purgées sur des billets hors périmètre backfill (attendu : 9 — AUD-N1).', v_del;

    -- SAFETY-NET : il ne doit plus rester AUCUNE inscription sur un billet hors backfill
    -- (elle n'aurait aucune collecte à laquelle se rattacher en A4).
    SELECT COUNT(*), string_agg(DISTINCT b.id::TEXT, ', ')
    INTO v_reste, v_detail
    FROM inscriptions i
    JOIN billets b ON b.id = i.billet_id
    WHERE b."Categorie" NOT IN ('Pré collecte', 'Collecte', 'Terminé');

    IF v_reste > 0 THEN
        RAISE EXCEPTION
            'SAFETY-NET A3d : % inscription(s) à valeur métier sur des billets hors backfill (billets : %). Ces billets doivent passer en Pré collecte/Collecte/Terminé, ou leurs inscriptions être traitées à la main, avant de relancer.',
            v_reste, v_detail;
    END IF;
END $$;

-- ============================================================================
-- A4 — Rattachement des inscriptions historiques à LA « Collecte initiale »
--      de leur billet (DV2-2). Les inscriptions déjà rattachées à une collecte
--      supplémentaire ne bougent pas (AM1).
-- ============================================================================

DO $$
DECLARE v_n BIGINT; v_orph BIGINT;
BEGIN
    UPDATE inscriptions i
    SET collecte_id = c.id
    FROM collectes c
    WHERE i.collecte_id IS NULL
      AND c.billet_id = i.billet_id
      AND c.nom = 'Collecte initiale';

    GET DIAGNOSTICS v_n = ROW_COUNT;
    RAISE NOTICE '[A4] % inscriptions rattachées à leur « Collecte initiale ».', v_n;

    SELECT COUNT(*) INTO v_orph FROM inscriptions WHERE collecte_id IS NULL;
    IF v_orph > 0 THEN
        RAISE EXCEPTION 'SAFETY-NET A4 : % inscription(s) sans collecte_id — ROLLBACK.', v_orph;
    END IF;
END $$;

-- ============================================================================
-- A5 — Durcissement inscriptions.collecte_id : NOT NULL + FK ON DELETE RESTRICT
--      (S2 : la FK existante est en ON DELETE SET NULL)
-- ============================================================================

ALTER TABLE inscriptions ALTER COLUMN collecte_id SET NOT NULL;

DO $$
DECLARE r RECORD;
BEGIN
    -- Drop dynamique de toute FK de inscriptions(collecte_id)
    FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        WHERE c.conrelid = 'public.inscriptions'::regclass
          AND c.contype  = 'f'
          AND pg_get_constraintdef(c.oid) ILIKE 'FOREIGN KEY (collecte_id)%'
    LOOP
        EXECUTE format('ALTER TABLE inscriptions DROP CONSTRAINT %I', r.conname);
        RAISE NOTICE '[A5] FK droppée : %', r.conname;
    END LOOP;

    ALTER TABLE inscriptions
        ADD CONSTRAINT inscriptions_collecte_id_fkey
        FOREIGN KEY (collecte_id) REFERENCES collectes(id) ON DELETE RESTRICT;
    RAISE NOTICE '[A5] FK inscriptions_collecte_id_fkey recréée en ON DELETE RESTRICT.';
END $$;

-- ----------------------------------------------------------------------------
-- A5b — DV2-1 : collectes.billet_id CASCADE → RESTRICT
--       « aucune cascade destructrice » : supprimer un billet exige de
--       supprimer d'abord ses collectes explicitement.
-- ----------------------------------------------------------------------------

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        WHERE c.conrelid = 'public.collectes'::regclass
          AND c.contype  = 'f'
          AND pg_get_constraintdef(c.oid) ILIKE 'FOREIGN KEY (billet_id)%'
    LOOP
        EXECUTE format('ALTER TABLE collectes DROP CONSTRAINT %I', r.conname);
        RAISE NOTICE '[A5b] FK droppée : %', r.conname;
    END LOOP;

    ALTER TABLE collectes
        ADD CONSTRAINT collectes_billet_id_fkey
        FOREIGN KEY (billet_id) REFERENCES billets(id) ON DELETE RESTRICT;
    RAISE NOTICE '[A5b] FK collectes_billet_id_fkey recréée en ON DELETE RESTRICT (DV2-1).';
END $$;

-- ============================================================================
-- A6 — Swap de la clé d'unicité : (billet_id, membre_email) → (collecte_id, membre_email)
--      Corrige nativement le bug FR31 et autorise un membre sur plusieurs
--      collectes d'un même billet (reliquat, rachat) — la dédup automatique
--      vit dans le hook d'auto-inscription (N1, bloc B).
-- ============================================================================

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT c.conname
        FROM pg_constraint c
        WHERE c.conrelid = 'public.inscriptions'::regclass
          AND c.contype  = 'u'
          AND pg_get_constraintdef(c.oid) ILIKE '%(billet_id, membre_email)%'
    LOOP
        EXECUTE format('ALTER TABLE inscriptions DROP CONSTRAINT %I', r.conname);
        RAISE NOTICE '[A6] Ancienne UK droppée : %', r.conname;
    END LOOP;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.inscriptions'::regclass
          AND conname  = 'inscriptions_collecte_membre_uk'
    ) THEN
        ALTER TABLE inscriptions
            ADD CONSTRAINT inscriptions_collecte_membre_uk UNIQUE (collecte_id, membre_email);
        RAISE NOTICE '[A6] Nouvelle UK inscriptions_collecte_membre_uk créée (fournit aussi l''index manquant sur collecte_id — S7).';
    END IF;
END $$;

-- A6b — Index sur collectes.billet_id (S7 : absent ; jointures + triggers de dérivation)
CREATE INDEX IF NOT EXISTS collectes_billet_idx ON collectes(billet_id);

-- ============================================================================
-- A7 — Trigger D4 : invariant collecte.scope ↔ nb_normaux / nb_variantes
-- ============================================================================

CREATE OR REPLACE FUNCTION check_inscription_scope_invariant() RETURNS TRIGGER AS $$
DECLARE v_scope TEXT;
BEGIN
    SELECT scope INTO v_scope FROM collectes WHERE id = NEW.collecte_id;

    IF v_scope = 'normal' AND COALESCE(NEW.nb_variantes, 0) <> 0 THEN
        RAISE EXCEPTION 'Invariant D4 : la collecte % est en scope « normal » — nb_variantes doit rester à 0.', NEW.collecte_id;
    END IF;
    IF v_scope = 'variante' AND COALESCE(NEW.nb_normaux, 0) <> 0 THEN
        RAISE EXCEPTION 'Invariant D4 : la collecte % est en scope « variante » — nb_normaux doit rester à 0.', NEW.collecte_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inscription_scope_invariant ON inscriptions;
CREATE TRIGGER trg_inscription_scope_invariant
    BEFORE INSERT OR UPDATE OF nb_normaux, nb_variantes, collecte_id ON inscriptions
    FOR EACH ROW EXECUTE FUNCTION check_inscription_scope_invariant();

-- ----------------------------------------------------------------------------
-- A7b — Trigger D4 symétrique : changer le scope d'une collecte qui porte déjà
--       des inscriptions incompatibles est refusé.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_collecte_scope_vs_inscriptions() RETURNS TRIGGER AS $$
DECLARE v_bad INT := 0;
BEGIN
    IF NEW.scope IS DISTINCT FROM OLD.scope THEN
        IF NEW.scope = 'normal' THEN
            SELECT COUNT(*) INTO v_bad FROM inscriptions
            WHERE collecte_id = NEW.id AND COALESCE(nb_variantes, 0) <> 0;
        ELSIF NEW.scope = 'variante' THEN
            SELECT COUNT(*) INTO v_bad FROM inscriptions
            WHERE collecte_id = NEW.id AND COALESCE(nb_normaux, 0) <> 0;
        END IF;

        IF v_bad > 0 THEN
            RAISE EXCEPTION
                'Invariant D4 : impossible de passer la collecte % en scope « % » — % inscription(s) incompatible(s).',
                NEW.id, NEW.scope, v_bad;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_collecte_scope_vs_inscriptions ON collectes;
CREATE TRIGGER trg_collecte_scope_vs_inscriptions
    BEFORE UPDATE OF scope ON collectes
    FOR EACH ROW EXECUTE FUNCTION check_collecte_scope_vs_inscriptions();

-- ============================================================================
-- A8 — Trigger D12 : garde-fou du PRINCIPE DIRECTEUR
--      Modifier la déclaration des versions d'un billet ne doit JAMAIS altérer
--      une inscription à valeur métier. Condition élargie au couple
--      HasVariante × VersionNormaleExiste (AM5).
-- ============================================================================

CREATE OR REPLACE FUNCTION check_billet_immutability_vs_inscriptions() RETURNS TRIGGER AS $$
DECLARE v_blocking INT;
BEGIN
    IF NEW."HasVariante"           IS DISTINCT FROM OLD."HasVariante"
    OR NEW."VersionNormaleExiste"  IS DISTINCT FROM OLD."VersionNormaleExiste" THEN

        -- « valeur métier » : payé/déclaré, envoyé, FDP réglés, ou saisie non automatique.
        -- pas_interesse a disparu d'inscriptions (A3c). Les changed_by='système'
        -- historiques comptent comme valeur métier — surprotection assumée (AUD-N6).
        SELECT COUNT(*) INTO v_blocking
        FROM inscriptions i
        WHERE i.billet_id = OLD.id
          AND (i.statut_paiement <> 'non_paye'
               OR i.envoye     = true
               OR i.fdp_regles = true
               OR COALESCE(i.changed_by, '') <> 'pré-inscription');

        IF v_blocking > 0 THEN
            RAISE EXCEPTION
                'Principe directeur (D12) : impossible de modifier les versions du billet % — % inscription(s) à valeur métier. Ouvrir/fermer une collecte dédiée à la place.',
                OLD.id, v_blocking;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_billet_immutability ON billets;
CREATE TRIGGER trg_billet_immutability
    BEFORE UPDATE OF "HasVariante", "VersionNormaleExiste" ON billets
    FOR EACH ROW EXECUTE FUNCTION check_billet_immutability_vs_inscriptions();

-- ============================================================================
-- A9 — Reporting + SAFETY-NETS EXÉCUTOIRES
--      Aucune lecture humaine n'est possible avant COMMIT : toute anomalie doit
--      lever une EXCEPTION (ROLLBACK automatique).
-- ============================================================================

DO $$
DECLARE
    a                  _mig16_avant%ROWTYPE;
    v_collectes_init   BIGINT;
    v_inscriptions     BIGINT;
    v_orphelines       BIGINT;
    v_pas_interesse    BIGINT;
    v_systeme          BIGINT;
    v_somme_prix       NUMERIC;
    v_somme_prix_var   NUMERIC;
    v_d4_bad           BIGINT;
    v_d4_detail        TEXT;
    v_purge_a3d        BIGINT;
    v_attendu          BIGINT;
BEGIN
    SELECT * INTO a FROM _mig16_avant;
    IF NOT FOUND THEN
        RAISE NOTICE '[A9] Migration déjà appliquée — contrôles de bascule ignorés.';
        RETURN;
    END IF;

    SELECT COUNT(*) INTO v_collectes_init FROM collectes    WHERE nom = 'Collecte initiale';
    SELECT COUNT(*) INTO v_inscriptions   FROM inscriptions;
    SELECT COUNT(*) INTO v_orphelines     FROM inscriptions WHERE collecte_id IS NULL;
    SELECT COUNT(*) INTO v_pas_interesse  FROM inscriptions WHERE pas_interesse = true;
    SELECT COUNT(*) INTO v_systeme        FROM inscriptions WHERE changed_by = 'système';
    SELECT COALESCE(SUM(prix), 0), COALESCE(SUM(prix_variante), 0)
      INTO v_somme_prix, v_somme_prix_var
      FROM collectes WHERE nom = 'Collecte initiale';

    -- Transparence (non bloquant) : billets dont le prix a une précision sous le
    -- centime, arrondi au centime dans collectes.prix (NUMERIC(10,2)).
    DECLARE v_souscent BIGINT; v_liste TEXT;
    BEGIN
        SELECT COUNT(*), string_agg(id::TEXT || '=' || "Prix"::TEXT, ', ')
        INTO v_souscent, v_liste
        FROM billets
        WHERE "Categorie" IN ('Pré collecte', 'Collecte', 'Terminé')
          AND ("Prix" IS DISTINCT FROM ROUND("Prix", 2)
               OR "PrixVariante" IS DISTINCT FROM ROUND("PrixVariante", 2));
        IF v_souscent > 0 THEN
            RAISE NOTICE '[A9] % billet(s) à prix sous le centime, arrondis au centime : %', v_souscent, v_liste;
        END IF;
    END;

    RAISE NOTICE '=== REPORTING MIGRATION #16 =====================================';
    RAISE NOTICE '  collectes « Collecte initiale » : %  (attendu : % billets du périmètre)', v_collectes_init, a.nb_billets_scope;
    RAISE NOTICE '  inscriptions                    : % → %  (dont % pas_interesse migrées)', a.nb_inscriptions, v_inscriptions, a.nb_pas_interesse;
    RAISE NOTICE '  inscriptions orphelines         : %', v_orphelines;
    RAISE NOTICE '  somme prix           : % → %', a.somme_prix, v_somme_prix;
    RAISE NOTICE '  somme prix_variante  : % → %', a.somme_prix_variante, v_somme_prix_var;
    RAISE NOTICE '  changed_by = système : % → %  (baisse normale = lignes supprimées A3c/A3d ; l''intégrité est vérifiée ligne à ligne en A9.6)', a.nb_changed_by_systeme, v_systeme;
    RAISE NOTICE '=================================================================';

    -- 1. Une collecte initiale par billet du périmètre, ni plus ni moins (AC1)
    IF v_collectes_init <> a.nb_billets_scope THEN
        RAISE EXCEPTION 'SAFETY-NET A9.1 : % collectes « Collecte initiale » pour % billets du périmètre.', v_collectes_init, a.nb_billets_scope;
    END IF;

    -- 2. Aucune inscription orpheline
    IF v_orphelines > 0 THEN
        RAISE EXCEPTION 'SAFETY-NET A9.2 : % inscription(s) sans collecte_id.', v_orphelines;
    END IF;

    -- 3. Conservation EXACTE du volume d'inscriptions : seules disparaissent les
    --    pas_interesse (A3c) et les pré-inscriptions hors périmètre (A3d).
    SELECT nb_purge_a3d INTO v_purge_a3d FROM _mig16_flux;
    v_attendu := a.nb_inscriptions - a.nb_pas_interesse - v_purge_a3d;
    IF v_inscriptions <> v_attendu THEN
        RAISE EXCEPTION 'SAFETY-NET A9.3 : % inscriptions après migration, attendu % (avant % − pas_interesse % − purge A3d %).',
            v_inscriptions, v_attendu, a.nb_inscriptions, a.nb_pas_interesse, v_purge_a3d;
    END IF;

    -- 4. pas_interesse entièrement migré (AC25)
    IF v_pas_interesse > 0 THEN
        RAISE EXCEPTION 'SAFETY-NET A9.4 : % inscription(s) pas_interesse subsistent.', v_pas_interesse;
    END IF;

    -- 5. Sommes monétaires conservées au centime
    IF v_somme_prix <> a.somme_prix OR v_somme_prix_var <> a.somme_prix_variante THEN
        RAISE EXCEPTION 'SAFETY-NET A9.5 : discordance monétaire — prix %/% , prix_variante %/%.',
            v_somme_prix, a.somme_prix, v_somme_prix_var, a.somme_prix_variante;
    END IF;

    -- 6. Audit préservé : le DISABLE TRIGGER a bien fonctionné (AC24).
    --    On vérifie que les inscriptions SURVIVANTES gardent leur changed_by
    --    d'origine (le simple comptage global était faux : A3c/A3d suppriment
    --    légitimement des lignes, dont certaines changed_by='système').
    DECLARE v_clobber BIGINT;
    BEGIN
        SELECT COUNT(*) INTO v_clobber
        FROM inscriptions i
        JOIN _mig16_audit_avant s ON s.id = i.id
        WHERE i.changed_by IS DISTINCT FROM s.changed_by;
        IF v_clobber > 0 THEN
            RAISE EXCEPTION 'SAFETY-NET A9.6 : % inscription(s) survivante(s) ont un changed_by modifié — l''audit a été écrasé par le backfill.', v_clobber;
        END IF;
    END;

    -- 7. INFORMATIF (pas bloquant) : données historiques violant l'invariant D4.
    --    Ces lignes ne bloquent pas la migration (les triggers ne valident pas
    --    l'existant) mais casseront la prochaine mise à jour du front.
    SELECT COUNT(*), string_agg(DISTINCT i.billet_id::TEXT, ', ')
    INTO v_d4_bad, v_d4_detail
    FROM inscriptions i
    JOIN collectes c ON c.id = i.collecte_id
    WHERE (c.scope = 'normal'   AND COALESCE(i.nb_variantes, 0) <> 0)
       OR (c.scope = 'variante' AND COALESCE(i.nb_normaux, 0)   <> 0);

    IF v_d4_bad > 0 THEN
        RAISE WARNING '[A9.7] % inscription(s) historique(s) violent l''invariant D4 (billets : %) — à arbitrer avec Cyril avant la bascule prod.', v_d4_bad, v_d4_detail;
    ELSE
        RAISE NOTICE '[A9.7] Invariant D4 respecté par 100 %% des inscriptions migrées.';
    END IF;
END $$;

-- ============================================================================
-- A10 — DÉRIVATION : billets."Categorie" et billets.date_effective découlent
--       désormais des collectes (AM3 / Q2bis).
--
--       ⚠ PRIORITÉ VALIDÉE PAR CYRIL LE 2026-07-22 :
--         Collecte > Pré collecte > Terminé (l'état le plus actionnable gagne).
--         Motif : « Pré collecte » coupe le paiement côté membre (somme due,
--         PayPal, « Prix non défini ») — une pré-collecte secondaire ne doit
--         pas rendre impayable une collecte réellement ouverte.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A10.1 — date_effective : dérivation 100 % collectes (S8 : les fonctions en
--         prod lisent encore billets."DatePre"/"DateColl"/"DateFin", renommées
--         en A11 → réécriture obligatoire AVANT le renommage).
--         Si le billet n'a aucune collecte : la valeur existante est CONSERVÉE
--         (pas d'écrasement à NULL — cohérent avec le statut manuel).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_billet_date_effective() RETURNS TRIGGER AS $$
DECLARE
    v_billet_id INTEGER;
    v_date      DATE;
BEGIN
    v_billet_id := COALESCE(NEW.billet_id, OLD.billet_id);

    SELECT MAX(GREATEST(c.date_fin, c.date_coll, c.date_pre))   -- GREATEST ignore les NULL
    INTO v_date
    FROM collectes c
    WHERE c.billet_id = v_billet_id;

    IF v_date IS NOT NULL THEN
        UPDATE billets SET date_effective = v_date
        WHERE id = v_billet_id AND date_effective IS DISTINCT FROM v_date;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION sync_billet_date_effective_from_billet() RETURNS TRIGGER AS $$
DECLARE v_date DATE;
BEGIN
    SELECT MAX(GREATEST(c.date_fin, c.date_coll, c.date_pre))
    INTO v_date
    FROM collectes c
    WHERE c.billet_id = NEW.id;

    IF v_date IS NOT NULL THEN
        NEW.date_effective := v_date;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- A10.2 — Categorie dérivée + défaut « Pas de collecte » à 0 collecte (Q2bis)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION recalc_billet_categorie(p_billet_id INTEGER)
RETURNS VOID AS $$
DECLARE
    v_cat    TEXT;
    v_count  INTEGER;
    v_actuel TEXT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM collectes WHERE billet_id = p_billet_id;
    SELECT "Categorie" INTO v_actuel FROM billets WHERE id = p_billet_id;

    IF v_count = 0 THEN
        -- Plus aucune collecte : le billet retombe sur un STATUT MANUEL.
        -- Défaut « Pas de collecte » si la valeur courante était dérivée ;
        -- un statut manuel déjà saisi (Projet / Masqué) est préservé.
        IF v_actuel IS NULL OR v_actuel IN ('Pré collecte', 'Collecte', 'Terminé') THEN
            PERFORM set_config('app.derivation_categorie', 'on', true);
            UPDATE billets SET "Categorie" = 'Pas de collecte' WHERE id = p_billet_id;
            PERFORM set_config('app.derivation_categorie', 'off', true);
        END IF;
        RETURN;
    END IF;

    SELECT c.categorie INTO v_cat
    FROM collectes c
    WHERE c.billet_id = p_billet_id
    ORDER BY CASE c.categorie
                 WHEN 'Collecte'     THEN 1   -- priorité validée 2026-07-22
                 WHEN 'Pré collecte' THEN 2
                 WHEN 'Terminé'      THEN 3
                 ELSE 4
             END,
             c.created_at ASC
    LIMIT 1;

    IF v_cat IS NOT NULL AND v_cat IS DISTINCT FROM v_actuel THEN
        PERFORM set_config('app.derivation_categorie', 'on', true);
        UPDATE billets SET "Categorie" = v_cat WHERE id = p_billet_id;
        PERFORM set_config('app.derivation_categorie', 'off', true);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trg_recalc_billet_categorie() RETURNS TRIGGER AS $$
BEGIN
    PERFORM recalc_billet_categorie(COALESCE(NEW.billet_id, OLD.billet_id));
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_collectes_recalc_billet_categorie ON collectes;
CREATE TRIGGER trg_collectes_recalc_billet_categorie
    AFTER INSERT OR UPDATE OF categorie, billet_id OR DELETE ON collectes
    FOR EACH ROW EXECUTE FUNCTION trg_recalc_billet_categorie();

-- ----------------------------------------------------------------------------
-- A10.3 — Garde-fou du statut : les 3 états DE COLLECTE sont réservés à la
--         dérivation ; les 3 états DU BILLET SEUL ne sont saisissables que
--         lorsque le billet n'a aucune collecte.
--
--         ⚠ EXTENSION assumée vs tech-spec : le garde-fou couvre aussi INSERT
--         (sinon l'invariant serait contournable à la création). Conséquence
--         côté front : admin.js:80 `CATEGORIE_DEFAULT = 'Pré collecte'` doit
--         passer à 'Pas de collecte' (bloc B4/B6) sinon toute création de
--         billet est refusée.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_billet_categorie_manuelle() RETURNS TRIGGER AS $$
DECLARE v_count INTEGER;
BEGIN
    -- Écriture émise par la dérivation elle-même → laisser passer
    IF COALESCE(current_setting('app.derivation_categorie', true), 'off') = 'on' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW."Categorie" IS NOT DISTINCT FROM OLD."Categorie" THEN
        RETURN NEW;
    END IF;

    IF NEW."Categorie" IN ('Pré collecte', 'Collecte', 'Terminé') THEN
        RAISE EXCEPTION
            'Statut « % » réservé à la dérivation : il découle des collectes du billet. Créer, modifier ou clôturer la collecte concernée.',
            NEW."Categorie";
    END IF;

    IF TG_OP = 'UPDATE' THEN
        SELECT COUNT(*) INTO v_count FROM collectes WHERE billet_id = NEW.id;
        IF v_count > 0 THEN
            RAISE EXCEPTION
                'Statut manuel « % » impossible : le billet % porte % collecte(s). Supprimer ou clôturer ses collectes d''abord.',
                NEW."Categorie", NEW.id, v_count;
        END IF;
    END IF;

    IF NEW."Categorie" IS NOT NULL
       AND NEW."Categorie" NOT IN ('Pas de collecte', 'Jamais édité, projet', 'Masqué') THEN
        RAISE EXCEPTION 'Statut « % » inconnu. Valeurs manuelles autorisées : Pas de collecte, Jamais édité, projet, Masqué.', NEW."Categorie";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_billets_categorie_manuelle ON billets;
CREATE TRIGGER trg_billets_categorie_manuelle
    BEFORE INSERT OR UPDATE OF "Categorie" ON billets
    FOR EACH ROW EXECUTE FUNCTION check_billet_categorie_manuelle();

-- ----------------------------------------------------------------------------
-- A10.4 — Backfill de la dérivation sur tous les billets
--         Les billets sans collecte conservent leur statut manuel actuel
--         (les 143 sont déjà dans les 3 valeurs autorisées — AUD3).
-- ----------------------------------------------------------------------------

DO $$
DECLARE r RECORD; v_n BIGINT := 0;
BEGIN
    FOR r IN SELECT id FROM billets ORDER BY id LOOP
        PERFORM recalc_billet_categorie(r.id);
        v_n := v_n + 1;
    END LOOP;

    UPDATE billets b
    SET date_effective = d.max_date
    FROM (SELECT c.billet_id, MAX(GREATEST(c.date_fin, c.date_coll, c.date_pre)) AS max_date
          FROM collectes c GROUP BY c.billet_id) d
    WHERE b.id = d.billet_id
      AND d.max_date IS NOT NULL
      AND b.date_effective IS DISTINCT FROM d.max_date;

    RAISE NOTICE '[A10] Dérivation rejouée sur % billets (Categorie + date_effective).', v_n;
END $$;

-- ============================================================================
-- A11 — Renommage des colonnes migrées (bruyant, réversible) + DROP des mortes
--       Toute lecture front oubliée retournera undefined → visible immédiatement.
--       Les policies RLS suivent les renommages automatiquement (liaison attnum) :
--       billets_update_collecteur reste valide, son nettoyage (gels obsolètes)
--       est tracé en DETTE, non bloquant.
--       DROP définitif des *_deprecated : script séparé post-stabilisation.
-- ============================================================================

DO $$
DECLARE
    r RECORD;
    v_col TEXT;
BEGIN
    FOREACH v_col IN ARRAY ARRAY['Prix', 'PrixVariante', 'PayerFDP', 'FDP_Com', 'DatePre', 'DateColl', 'DateFin']
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'billets' AND column_name = v_col) THEN
            EXECUTE format('ALTER TABLE billets RENAME COLUMN %I TO %I', v_col, v_col || '_deprecated');
            RAISE NOTICE '[A11] billets.% → %_deprecated', v_col, v_col;
        END IF;
    END LOOP;

    -- AUD-N8 : 100 % vides sur 5 420 billets → colonnes mortes, DROP direct
    FOREACH v_col IN ARRAY ARRAY['DateCollVariante', 'DateFinVariante', 'CollecteurVariante']
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = 'billets' AND column_name = v_col) THEN
            EXECUTE format('ALTER TABLE billets DROP COLUMN %I', v_col);
            RAISE NOTICE '[A11] billets.% DROPPÉE (colonne morte AUD-N8).', v_col;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- A12 — Réactivation du trigger d'audit (miroir d'A0)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger
               WHERE tgrelid = 'public.inscriptions'::regclass
                 AND tgname  = 'trg_inscription_audit') THEN
        ALTER TABLE inscriptions ENABLE TRIGGER trg_inscription_audit;
        RAISE NOTICE '[A12] trg_inscription_audit RÉACTIVÉ.';
    END IF;
END $$;

-- ============================================================================
-- A13 — RPC compteurs (S6 : la v2 et la version par collecte n'ont jamais été
--       déployées). Signature changée → DROP préalable obligatoire.
--       Contournent la limite de 1 000 lignes de PostgREST.
-- ============================================================================

DROP FUNCTION IF EXISTS compteurs_inscriptions();

CREATE FUNCTION compteurs_inscriptions()
RETURNS TABLE (billet_id INTEGER, total_count BIGINT, total_normaux BIGINT, total_variantes BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
    SELECT billet_id,
           COUNT(*)::BIGINT,
           COALESCE(SUM(nb_normaux), 0),
           COALESCE(SUM(nb_variantes), 0)
    FROM inscriptions
    WHERE pas_interesse = false   -- parité avec la v1 déployée ; sans effet après A3c
    GROUP BY billet_id;
$$;

DROP FUNCTION IF EXISTS compteurs_inscriptions_par_collecte();

CREATE FUNCTION compteurs_inscriptions_par_collecte()
RETURNS TABLE (collecte_id UUID, total_count BIGINT, total_normaux BIGINT, total_variantes BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
    SELECT collecte_id,
           COUNT(*)::BIGINT,
           COALESCE(SUM(nb_normaux), 0),
           COALESCE(SUM(nb_variantes), 0)
    FROM inscriptions
    WHERE pas_interesse = false
    GROUP BY collecte_id;
$$;

-- Firebase JWT → rôle anon (D-Sec1). Le grant authenticated est conservé par
-- parité avec l'existant, mais aucun client du projet n'utilise ce rôle.
GRANT EXECUTE ON FUNCTION compteurs_inscriptions()             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION compteurs_inscriptions_par_collecte() TO anon, authenticated;

-- ============================================================================
-- FIN — relire les NOTICE ci-dessus avant de valider.
--       Toute EXCEPTION a annulé l'intégralité de la transaction.
-- ============================================================================

COMMIT;
