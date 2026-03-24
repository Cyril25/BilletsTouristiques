-- =============================================================
-- Migration : Policy INSERT inscriptions pour admins
-- =============================================================
-- Permet à un admin d'inscrire n'importe quel membre à
-- n'importe quelle collecte.
-- =============================================================

CREATE POLICY "inscriptions_insert_admin"
  ON inscriptions FOR INSERT
  WITH CHECK (is_admin());
