-- =============================================================
-- Migration : Annulation d'une déclaration de paiement par le membre
-- =============================================================
-- Le membre peut annuler un « J'ai payé » déclaré par erreur :
--   declare → non_paye (billets ET frais de port)
-- Mais JAMAIS toucher à un paiement validé par le collecteur :
--   confirme → * interdit côté membre (et 'confirme' inatteignable).
--
-- Transitions membre autorisées : non_paye → declare, declare → non_paye.
-- Admin et collecteur du billet gardent le contrôle total.
--
-- NB : jusqu'ici la policy inscriptions_update_admin laissait un membre
-- PATCHer statut_paiement à n'importe quelle valeur (y compris 'confirme'),
-- et le trigger enveloppes autorisait confirme → declare. Cette migration
-- resserre les deux en passant par le pattern trigger BEFORE UPDATE
-- (accès natif OLD/NEW, pas de récursion RLS — cf. fix-recursion).
-- =============================================================

-- -------------------------------------------------------
-- 1. INSCRIPTIONS : trigger de garde sur statut_paiement
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_inscription_statut_paiement()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_inscription_statut_paiement ON inscriptions;
CREATE TRIGGER trg_enforce_inscription_statut_paiement
    BEFORE UPDATE ON inscriptions
    FOR EACH ROW
    EXECUTE FUNCTION enforce_inscription_statut_paiement();

-- -------------------------------------------------------
-- 2. ENVELOPPES : mise à jour du trigger membre existant
--    (mêmes règles pour statut_paiement_port)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_enveloppe_membre_update()
RETURNS TRIGGER AS $$
DECLARE
    est_collecteur BOOLEAN;
BEGIN
    -- Le collecteur propriétaire peut tout modifier (expédition, prix, suivi...)
    SELECT EXISTS (
        SELECT 1 FROM collecteurs
        WHERE alias = OLD.collecteur_alias
          AND email_membre = auth.jwt() ->> 'email'
    ) INTO est_collecteur;

    IF est_collecteur THEN
        RETURN NEW;
    END IF;

    -- Sinon : on est le membre destinataire → champs verrouillés
    IF NEW.collecteur_alias IS DISTINCT FROM OLD.collecteur_alias
       OR NEW.membre_email   IS DISTINCT FROM OLD.membre_email
       OR NEW.mode_envoi_reel IS DISTINCT FROM OLD.mode_envoi_reel
       OR NEW.numero_suivi    IS DISTINCT FROM OLD.numero_suivi
       OR NEW.date_expedition IS DISTINCT FROM OLD.date_expedition
       OR NEW.prix_envoi_reel IS DISTINCT FROM OLD.prix_envoi_reel
    THEN
        RAISE EXCEPTION 'Champ non modifiable par le membre';
    END IF;

    -- statut : le membre ne peut que confirmer la réception ('recue')
    IF NEW.statut IS DISTINCT FROM OLD.statut AND NEW.statut <> 'recue' THEN
        RAISE EXCEPTION 'Le membre ne peut passer le statut qu''a recue';
    END IF;

    -- statut_paiement_port : le membre peut déclarer (non_paye → declare)
    -- ou annuler sa déclaration (declare → non_paye) ; un paiement
    -- 'confirme' par le collecteur n'est plus modifiable par le membre.
    IF NEW.statut_paiement_port IS DISTINCT FROM OLD.statut_paiement_port
       AND NOT (
            (OLD.statut_paiement_port = 'non_paye' AND NEW.statut_paiement_port = 'declare')
         OR (OLD.statut_paiement_port = 'declare' AND NEW.statut_paiement_port = 'non_paye')
       )
    THEN
        RAISE EXCEPTION 'Transition de paiement des frais de port non autorisee pour le membre';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
