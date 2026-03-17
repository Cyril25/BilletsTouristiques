-- =============================================================
-- Migration Story 5.12 : Fonction RPC compteurs_inscriptions
-- =============================================================
-- Calcule le total normaux et variantes par billet
-- (pour inscriptions actives uniquement)
-- =============================================================

CREATE OR REPLACE FUNCTION compteurs_inscriptions()
RETURNS TABLE(billet_id INTEGER, total_normaux BIGINT, total_variantes BIGINT)
LANGUAGE SQL STABLE
SECURITY DEFINER
AS $$
    SELECT billet_id,
           COALESCE(SUM(nb_normaux), 0) AS total_normaux,
           COALESCE(SUM(nb_variantes), 0) AS total_variantes
    FROM inscriptions
    WHERE pas_interesse = false
    GROUP BY billet_id;
$$;

-- Permettre l'appel par tout utilisateur whitelisté
GRANT EXECUTE ON FUNCTION compteurs_inscriptions() TO authenticated;
