-- ============================================================================
-- MIGRATION DEMANDE #16 — Script 2 : bascule du scoping collecteur
--   billets.Collecteur → collectes.collecteur, billet en écriture ADMIN ONLY
-- ============================================================================
-- Prérequis : migration-demande-16-1.sql déjà jouée (collectes.collecteur rempli
-- au backfill A3, colonnes migrées renommées *_deprecated).
--
-- Demandes de Cyril (retours de test, 2026-07-23) :
--   - les collecteurs ne modifient plus DU TOUT le billet, seulement leurs collectes ;
--   - autoriser des collecteurs DIFFÉRENTS sur des collectes différentes d'un même
--     billet dès maintenant (fin de la dette DV2-3) ;
--   - supprimer billets.Collecteur.
--
-- Transactionnel + idempotent (DROP POLICY IF EXISTS / IF EXISTS colonne).
-- Trigger (bloc 3) repris à l'identique de l'original (pg_get_functiondef,
-- 2026-07-23), seul le scoping collecteur change.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. GARDE-FOU TEST-ONLY — refuse de s'exécuter hors de la copie de test.
--    La copie porte le marqueur public._bt_env(name='TESTENV')
--    (cf. scripts/_marqueur-testenv.sql, à jouer une fois sur la copie).
--    Sur la PROD ce marqueur est absent → to_regclass NULL → refus propre,
--    la transaction est annulée et RIEN n'est modifié.
-- ============================================================================
DO $$
DECLARE marque BOOLEAN := false;
BEGIN
    -- Vérif dynamique (EXECUTE) : si la table n'existe pas, pas d'erreur de
    -- planification — on tombe simplement sur le refus au message clair.
    IF to_regclass('public._bt_env') IS NOT NULL THEN
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public._bt_env WHERE name = ''TESTENV'')'
          INTO marque;
    END IF;
    IF NOT marque THEN
        RAISE EXCEPTION
          'REFUS (garde-fou TEST-ONLY) : base non marquee TESTENV — c''est probablement la PROD. Aucune modification appliquee.';
    END IF;
END $$;

-- ============================================================================
-- 1. Billet en écriture ADMIN ONLY
--    On retire la policy qui laissait les collecteurs modifier le billet.
--    billets_update_admin (is_admin) subsiste → seuls les admins écrivent.
--    Effet de bord voulu : lève le gel de Collecteur/Prix_deprecated/Reference
--    qui bloquait le DROP de la colonne (bloc 4).
-- ============================================================================

DROP POLICY IF EXISTS billets_update_collecteur ON billets;

-- ============================================================================
-- 2. Inscriptions : scoping collecteur par la COLLECTE (collecte_id) et non
--    plus par billets.Collecteur. Un collecteur agit sur les inscriptions de
--    SES collectes. `IN (...)` conservé (un membre peut avoir plusieurs alias).
-- ============================================================================

-- 2a. DELETE
DROP POLICY IF EXISTS inscriptions_delete_collecteur ON inscriptions;
CREATE POLICY inscriptions_delete_collecteur ON inscriptions
    FOR DELETE
    USING (
        collecte_id IN (
            SELECT c.id FROM collectes c
            WHERE c.collecteur IN (
                SELECT collecteurs.alias FROM collecteurs
                WHERE collecteurs.email_membre = (auth.jwt() ->> 'email')
            )
        )
    );

-- 2b. INSERT
DROP POLICY IF EXISTS inscriptions_insert_collecteur ON inscriptions;
CREATE POLICY inscriptions_insert_collecteur ON inscriptions
    FOR INSERT
    WITH CHECK (
        collecte_id IN (
            SELECT c.id FROM collectes c
            WHERE c.collecteur IN (
                SELECT collecteurs.alias FROM collecteurs
                WHERE collecteurs.email_membre = (auth.jwt() ->> 'email')
            )
        )
    );

-- 2c. UPDATE — scoping par collecte + gel des champs que le collecteur ne doit
--     pas toucher (membre_email, nb_normaux, nb_variantes, billet_id) + gel du
--     collecte_id (il ne peut pas déplacer l'inscription vers une autre collecte).
DROP POLICY IF EXISTS inscriptions_update_collecteur ON inscriptions;
CREATE POLICY inscriptions_update_collecteur ON inscriptions
    FOR UPDATE
    USING (
        collecte_id IN (
            SELECT c.id FROM collectes c
            WHERE c.collecteur IN (
                SELECT collecteurs.alias FROM collecteurs
                WHERE collecteurs.email_membre = (auth.jwt() ->> 'email')
            )
        )
    )
    WITH CHECK (
        collecte_id IN (
            SELECT c.id FROM collectes c
            WHERE c.collecteur IN (
                SELECT collecteurs.alias FROM collecteurs
                WHERE collecteurs.email_membre = (auth.jwt() ->> 'email')
            )
        )
        AND membre_email  = (SELECT i.membre_email  FROM inscriptions i WHERE i.id = inscriptions.id)
        AND nb_normaux    = (SELECT i.nb_normaux    FROM inscriptions i WHERE i.id = inscriptions.id)
        AND nb_variantes  = (SELECT i.nb_variantes  FROM inscriptions i WHERE i.id = inscriptions.id)
        AND billet_id     = (SELECT i.billet_id     FROM inscriptions i WHERE i.id = inscriptions.id)
        AND collecte_id   = (SELECT i.collecte_id   FROM inscriptions i WHERE i.id = inscriptions.id)
    );

-- ============================================================================
-- 3. Trigger anti-fraude : reprise À L'IDENTIQUE de l'original (confirmé par
--    pg_get_functiondef le 2026-07-23), en changeant UNIQUEMENT le bloc
--    « collecteur » : scoping par collectes.collecteur (via OLD.collecte_id) au
--    lieu de billets.Collecteur (via OLD.billet_id). Toute la logique membre
--    (non_paye↔declare seulement) et admin est préservée telle quelle.
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_inscription_statut_paiement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    jwt_email TEXT;
    est_admin BOOLEAN;
    est_collecteur BOOLEAN;
BEGIN
    -- Rien à contrôler si le statut ne change pas
    IF NEW.statut_paiement IS NOT DISTINCT FROM OLD.statut_paiement THEN
        RETURN NEW;
    END IF;

    -- Accès direct (SQL editor / service role, pas de JWT) : ne pas bloquer
    jwt_email := auth.jwt() ->> 'email';
    IF jwt_email IS NULL THEN
        RETURN NEW;
    END IF;

    -- Admin : contrôle total
    SELECT EXISTS (
        SELECT 1 FROM membres WHERE email = jwt_email AND role = 'admin'
    ) INTO est_admin;
    IF est_admin THEN
        RETURN NEW;
    END IF;

    -- Collecteur de LA COLLECTE : contrôle total (confirmer / rétrograder)
    -- (demande #16 : scoping par collectes.collecteur, plus billets.Collecteur)
    SELECT EXISTS (
        SELECT 1 FROM collectes col
        JOIN collecteurs c ON c.alias = col.collecteur
        WHERE col.id = OLD.collecte_id
          AND c.email_membre = jwt_email
    ) INTO est_collecteur;
    IF est_collecteur THEN
        RETURN NEW;
    END IF;

    -- Membre : déclarer (non_paye → declare) ou annuler sa déclaration
    -- (declare → non_paye). Tout le reste est interdit, notamment
    -- toucher à un paiement 'confirme' ou se l'auto-attribuer.
    IF (OLD.statut_paiement = 'non_paye' AND NEW.statut_paiement = 'declare')
       OR (OLD.statut_paiement = 'declare' AND NEW.statut_paiement = 'non_paye')
    THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Transition de statut de paiement non autorisee pour le membre (% -> %)',
        OLD.statut_paiement, NEW.statut_paiement;
END;
$function$;

-- ============================================================================
-- 4. DÉPRÉCIATION de billets.Collecteur (données préservées : recopiées sur
--    collectes.collecteur au backfill A3 du script 1).
--    Plus aucune policy/trigger ne la référence après les blocs 1-3.
--
--    ⚠ On NE DROP PAS encore : on RENOMME en "Collecteur_deprecated" comme
--    filet de sécurité. Bénéfices :
--      - données conservées → rollback trivial (rename inverse) ;
--      - toute lecture oubliée de "Collecteur" échouera immédiatement
--        (colonne introuvable) → détection, plutôt qu'un silence trompeur.
--    Le DROP dur se fera plus tard (bascule prod E), une fois validé que
--    plus rien ne s'appuie dessus.
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'billets'
          AND column_name = 'Collecteur'
    ) THEN
        ALTER TABLE billets RENAME COLUMN "Collecteur" TO "Collecteur_deprecated";
        RAISE NOTICE 'billets.Collecteur renommee en Collecteur_deprecated.';
    ELSE
        RAISE NOTICE 'billets.Collecteur absente (deja renommee/droppee) — rien a faire.';
    END IF;
END $$;

COMMIT;
