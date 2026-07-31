-- ============================================================================
-- MARQUEUR TESTENV — à jouer UNE SEULE FOIS sur la COPIE DE TEST
--   (base ijxajtxnhbczgiarkefo), JAMAIS sur la prod.
-- ============================================================================
-- Pose un marqueur qui identifie la base comme « environnement de test ».
-- Les scripts TEST-ONLY vérifient ce marqueur en tête et REFUSENT de tourner
-- si la base ne l'a pas (⇒ la prod est protégée : le marqueur n'y existe pas).
--
-- ⚠ Ne JAMAIS jouer ce fichier sur la prod. Si tu doutes de la base, ne le
--    joue pas — sur la prod ce marqueur désarmerait tous les garde-fous.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public._bt_env (
    name  TEXT PRIMARY KEY,
    note  TEXT,
    posee TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public._bt_env (name, note)
VALUES ('TESTENV', 'Copie jetable #16 — autorise les scripts TEST-ONLY')
ON CONFLICT (name) DO NOTHING;

-- Vérif
SELECT * FROM public._bt_env;
