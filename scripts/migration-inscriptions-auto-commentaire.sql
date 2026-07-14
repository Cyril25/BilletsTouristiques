-- =============================================================
-- Migration : Commentaire sur le paramétrage de pré-inscription
-- =============================================================
-- Champ texte libre par (membre, année) dans la gestion admin des
-- pré-inscriptions, typiquement pour noter les terminaisons de
-- numéros demandées par le membre (ex. « souhaite terminaison 07 »).
-- Le commentaire est recopié dans les inscriptions créées
-- automatiquement, pour être visible du collecteur dans Mes collectes.
-- =============================================================

ALTER TABLE inscriptions_auto
    ADD COLUMN IF NOT EXISTS commentaire TEXT NOT NULL DEFAULT '';
