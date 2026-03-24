-- =============================================================
-- Migration : Policies RLS — support du rôle superadmin
-- =============================================================
-- Corrige toutes les policies qui vérifiaient role = 'admin'
-- en dur au lieu de passer par is_admin().
-- La fonction is_admin() a aussi été mise à jour pour inclure
-- le rôle superadmin.
-- =============================================================

-- 1. Mise à jour de is_admin()
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM membres
    WHERE email = auth.jwt() ->> 'email'
    AND role IN ('admin', 'superadmin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Recréer inscriptions_insert_admin (était inlinée avec role = 'admin')
DROP POLICY IF EXISTS "inscriptions_insert_admin" ON inscriptions;
CREATE POLICY "inscriptions_insert_admin" ON inscriptions FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM membres WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'superadmin')));

-- 3. frais_port
DROP POLICY IF EXISTS "frais_port_admin_insert" ON frais_port;
CREATE POLICY "frais_port_admin_insert" ON frais_port FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM membres WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'superadmin')));

DROP POLICY IF EXISTS "frais_port_admin_update" ON frais_port;
CREATE POLICY "frais_port_admin_update" ON frais_port FOR UPDATE
USING (EXISTS (SELECT 1 FROM membres WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'superadmin')))
WITH CHECK (EXISTS (SELECT 1 FROM membres WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'superadmin')));

DROP POLICY IF EXISTS "frais_port_admin_delete" ON frais_port;
CREATE POLICY "frais_port_admin_delete" ON frais_port FOR DELETE
USING (EXISTS (SELECT 1 FROM membres WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'superadmin')));

-- 4. inscriptions_auto
DROP POLICY IF EXISTS "inscriptions_auto_admin_insert" ON inscriptions_auto;
CREATE POLICY "inscriptions_auto_admin_insert" ON inscriptions_auto FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM membres WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'superadmin')));

DROP POLICY IF EXISTS "inscriptions_auto_admin_update" ON inscriptions_auto;
CREATE POLICY "inscriptions_auto_admin_update" ON inscriptions_auto FOR UPDATE
USING (EXISTS (SELECT 1 FROM membres WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'superadmin')))
WITH CHECK (EXISTS (SELECT 1 FROM membres WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'superadmin')));

DROP POLICY IF EXISTS "inscriptions_auto_admin_delete" ON inscriptions_auto;
CREATE POLICY "inscriptions_auto_admin_delete" ON inscriptions_auto FOR DELETE
USING (EXISTS (SELECT 1 FROM membres WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'superadmin')));

-- 5. inscriptions_auto_pays
DROP POLICY IF EXISTS "inscriptions_auto_pays_admin_insert" ON inscriptions_auto_pays;
CREATE POLICY "inscriptions_auto_pays_admin_insert" ON inscriptions_auto_pays FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM membres WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'superadmin')));

DROP POLICY IF EXISTS "inscriptions_auto_pays_admin_update" ON inscriptions_auto_pays;
CREATE POLICY "inscriptions_auto_pays_admin_update" ON inscriptions_auto_pays FOR UPDATE
USING (EXISTS (SELECT 1 FROM membres WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'superadmin')))
WITH CHECK (EXISTS (SELECT 1 FROM membres WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'superadmin')));

DROP POLICY IF EXISTS "inscriptions_auto_pays_admin_delete" ON inscriptions_auto_pays;
CREATE POLICY "inscriptions_auto_pays_admin_delete" ON inscriptions_auto_pays FOR DELETE
USING (EXISTS (SELECT 1 FROM membres WHERE email = auth.jwt() ->> 'email' AND role IN ('admin', 'superadmin')));

NOTIFY pgrst, 'reload schema';
