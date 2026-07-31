-- ============================================================================
-- ROLLBACK PROD — annule le script 2 (#16) joué par erreur sur la PROD
--   (base lhwcoybugdsggcclhtgb) le 2026-07-24.
-- ============================================================================
-- Contexte : migration-demande-16-2.sql a été exécuté sur la prod par erreur
-- (mauvaise base sélectionnée dans l'éditeur SQL). La prod n'a PAS eu le script 1
-- (colonnes Prix/PrixVariante NON renommées ; table collectes présente mais VIDE).
-- Le script 2 y a donc :
--   (1) DROP de la policy billets_update_collecteur,
--   (2) réécrit les 3 policies inscriptions_*_collecteur (scoping collectes, vide),
--   (3) remplacé le trigger enforce_inscription_statut_paiement (scoping collectes),
--   (4) RENOMMÉ billets."Collecteur" -> "Collecteur_deprecated".
-- => Le front de prod (branche main), qui lit billets.Collecteur, est CASSÉ.
--
-- Ce script REMET la prod EXACTEMENT dans son état d'avant (définitions capturées
-- au dump pg_policies + pg_get_functiondef pré-bascule). Aucune donnée perdue :
-- le RENAME a préservé toutes les valeurs de Collecteur.
--
-- ⚠ À JOUER SUR LA PROD (lhwcoybugdsggcclhtgb) — VÉRIFIER LA BASE SÉLECTIONNÉE.
-- Transactionnel + idempotent.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Rendre son nom à la colonne (AVANT de recréer les policies qui la lisent).
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='billets'
                 AND column_name='Collecteur_deprecated')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='billets'
                 AND column_name='Collecteur') THEN
        ALTER TABLE billets RENAME COLUMN "Collecteur_deprecated" TO "Collecteur";
        RAISE NOTICE 'billets.Collecteur_deprecated renommee -> Collecteur.';
    ELSE
        RAISE NOTICE 'Colonne Collecteur deja en place — rien a faire.';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. Recréer billets_update_collecteur (le collecteur peut modifier SON billet,
--    en gelant Prix / PrixVariante / Collecteur / Reference).
--    Définition = celle de la copie, avec Prix_deprecated -> Prix et
--    PrixVariante_deprecated -> PrixVariante (jamais renommés en prod).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS billets_update_collecteur ON billets;
CREATE POLICY billets_update_collecteur ON billets
    FOR UPDATE
    USING (
        "Collecteur" IN (
            SELECT collecteurs.alias FROM collecteurs
            WHERE collecteurs.email_membre = (auth.jwt() ->> 'email'::text)
        )
    )
    WITH CHECK (
        "Collecteur" IN (
            SELECT collecteurs.alias FROM collecteurs
            WHERE collecteurs.email_membre = (auth.jwt() ->> 'email'::text)
        )
        AND (NOT ("Prix" IS DISTINCT FROM (
            SELECT b."Prix" FROM billets b WHERE b.id = billets.id)))
        AND (NOT ("PrixVariante" IS DISTINCT FROM (
            SELECT b."PrixVariante" FROM billets b WHERE b.id = billets.id)))
        AND (NOT ("Collecteur" IS DISTINCT FROM (
            SELECT b."Collecteur" FROM billets b WHERE b.id = billets.id)))
        AND (NOT ("Reference" IS DISTINCT FROM (
            SELECT b."Reference" FROM billets b WHERE b.id = billets.id)))
    );

-- ----------------------------------------------------------------------------
-- 2. Rétablir les 3 policies inscriptions_*_collecteur d'origine
--    (scoping par billet_id -> billets."Collecteur").
-- ----------------------------------------------------------------------------

-- 2a. DELETE
DROP POLICY IF EXISTS inscriptions_delete_collecteur ON inscriptions;
CREATE POLICY inscriptions_delete_collecteur ON inscriptions
    FOR DELETE
    USING (
        billet_id IN (
            SELECT billets.id FROM billets
            WHERE billets."Collecteur" IN (
                SELECT collecteurs.alias FROM collecteurs
                WHERE collecteurs.email_membre = (auth.jwt() ->> 'email'::text)
            )
        )
    );

-- 2b. INSERT
DROP POLICY IF EXISTS inscriptions_insert_collecteur ON inscriptions;
CREATE POLICY inscriptions_insert_collecteur ON inscriptions
    FOR INSERT
    WITH CHECK (
        billet_id IN (
            SELECT billets.id FROM billets
            WHERE billets."Collecteur" IN (
                SELECT collecteurs.alias FROM collecteurs
                WHERE collecteurs.email_membre = (auth.jwt() ->> 'email'::text)
            )
        )
    );

-- 2c. UPDATE (+ gel membre_email / nb_normaux / nb_variantes / billet_id)
DROP POLICY IF EXISTS inscriptions_update_collecteur ON inscriptions;
CREATE POLICY inscriptions_update_collecteur ON inscriptions
    FOR UPDATE
    USING (
        billet_id IN (
            SELECT billets.id FROM billets
            WHERE billets."Collecteur" IN (
                SELECT collecteurs.alias FROM collecteurs
                WHERE collecteurs.email_membre = (auth.jwt() ->> 'email'::text)
            )
        )
    )
    WITH CHECK (
        billet_id IN (
            SELECT billets.id FROM billets
            WHERE billets."Collecteur" IN (
                SELECT collecteurs.alias FROM collecteurs
                WHERE collecteurs.email_membre = (auth.jwt() ->> 'email'::text)
            )
        )
        AND membre_email = (SELECT i.membre_email FROM inscriptions i WHERE i.id = inscriptions.id)
        AND nb_normaux   = (SELECT i.nb_normaux   FROM inscriptions i WHERE i.id = inscriptions.id)
        AND nb_variantes = (SELECT i.nb_variantes FROM inscriptions i WHERE i.id = inscriptions.id)
        AND billet_id    = (SELECT i.billet_id    FROM inscriptions i WHERE i.id = inscriptions.id)
    );

-- ----------------------------------------------------------------------------
-- 3. Rétablir le trigger d'origine (scoping collecteur par billets."Collecteur"
--    via OLD.billet_id). Corps repris à l'identique de pg_get_functiondef.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_inscription_statut_paiement()
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

    -- Collecteur du billet : contrôle total (confirmer / rétrograder)
    SELECT EXISTS (
        SELECT 1 FROM billets b
        JOIN collecteurs c ON c.alias = b."Collecteur"
        WHERE b.id = OLD.billet_id
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

COMMIT;

-- ============================================================================
-- APRÈS COMMIT — vérifications rapides (à lancer séparément si besoin) :
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name='billets' AND column_name LIKE 'Collecteur%';   -- attendu: Collecteur
--   SELECT policyname FROM pg_policies
--     WHERE tablename IN ('billets','inscriptions') AND policyname LIKE '%collecteur%';
-- ============================================================================
