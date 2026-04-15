-- ============================================================
-- EPIC 13 — Catégorie manuelle quand aucune collecte
-- Modifie recalc_billet_categorie : si 0 collecte → NE TOUCHE PAS
-- à billets."Categorie" (laisse la valeur manuelle saisie depuis l'UI).
-- Si ≥ 1 collecte → dérivé comme avant (Pré collecte > Collecte > Terminé).
--
-- Rationale : permet les statuts manuels "Projet", "Masqué",
-- "Pas de collecte" pour les billets sans collecte.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION recalc_billet_categorie(p_billet_id INTEGER)
RETURNS VOID AS $$
DECLARE
  v_cat   TEXT;
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM collectes
  WHERE billet_id = p_billet_id;

  IF v_count = 0 THEN
    -- Aucune collecte : efface la valeur dérivée potentiellement périmée.
    -- L'UI propose alors un badge "Non défini" cliquable pour saisir une
    -- valeur manuelle (Projet, Masqué, Pas de collecte...).
    UPDATE billets
    SET "Categorie" = NULL
    WHERE id = p_billet_id
      AND "Categorie" IS NOT NULL;
    RETURN;
  END IF;

  SELECT categorie INTO v_cat
  FROM collectes
  WHERE billet_id = p_billet_id
  ORDER BY
    CASE categorie
      WHEN 'Pré collecte' THEN 1
      WHEN 'Collecte'     THEN 2
      WHEN 'Terminé'      THEN 3
      ELSE 4
    END,
    created_at ASC
  LIMIT 1;

  UPDATE billets
  SET "Categorie" = v_cat
  WHERE id = p_billet_id
    AND "Categorie" IS DISTINCT FROM v_cat;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
