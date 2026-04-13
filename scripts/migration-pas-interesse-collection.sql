-- ============================================================
-- Migration : déplacer pas_interesse de inscriptions vers collection
-- Epic 13 — le "pas intéressé" concerne le billet, pas la collecte
-- ============================================================

-- 1. Ajouter la colonne à collection
ALTER TABLE collection ADD COLUMN IF NOT EXISTS pas_interesse BOOLEAN DEFAULT false;

-- 2. Migrer les données : copier les pas_interesse=true depuis inscriptions
INSERT INTO collection (membre_email, billet_id, pas_interesse, owned_normal, owned_variante, serial_normal, serial_variante, nb_doubles)
SELECT DISTINCT i.membre_email, i.billet_id, true, false, false, '', '', 0
FROM inscriptions i
WHERE i.pas_interesse = true
ON CONFLICT (membre_email, billet_id) DO UPDATE SET pas_interesse = true;

-- 3. Supprimer les fausses inscriptions pas_interesse
DELETE FROM inscriptions WHERE pas_interesse = true;

-- 4. Retirer la colonne pas_interesse de inscriptions (optionnel, peut être fait plus tard)
-- ALTER TABLE inscriptions DROP COLUMN pas_interesse;
