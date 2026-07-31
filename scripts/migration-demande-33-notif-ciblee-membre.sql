-- Demande #33 — Notification ciblée sur un membre précis (par email)
-- À exécuter dans l'éditeur SQL Supabase (PROD) au moment du déploiement du front.
--
-- Objectif : pouvoir adresser une notification à UN membre donné (par son email),
-- p.ex. prévenir l'auteur d'une demande d'amélioration quand elle passe :
--   - « À cadrer »  -> une précision est attendue de sa part,
--   - « À tester »  -> elle a été développée, il peut la vérifier.
-- La notif apparaît dans la cloche du menu et sur la page Nouveautés, POUR LUI SEUL.
--
-- Modèle : une colonne nullable `cible_email`.
--   - cible_email IS NULL      -> notification diffusée (broadcast) : logique `cible`
--                                 inchangée (migrations #26 / #28 / notif-cibles-3-niveaux).
--   - cible_email IS NOT NULL  -> notification PRIVÉE : visible du seul membre dont
--                                 l'email correspond, MASQUÉE même aux admins
--                                 (« uniquement pour l'utilisateur cible », cf. demande).
--
-- Comparaison insensible à la casse : les emails Google sont normalisés en minuscules,
-- mais un demandeur importé (Google Sheet) peut avoir une casse différente.
--
-- Rappel conventions projet : pas de `TO authenticated` (JWT Firebase -> rôle anon) ;
-- on s'appuie sur auth.jwt() ->> 'email' et les helpers is_admin_ou_superadmin()/is_collecteur().

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS cible_email TEXT;

-- SELECT : notif privée -> destinataire uniquement ; sinon logique de diffusion existante.
DROP POLICY IF EXISTS notifications_select ON notifications;
CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (
    CASE
      WHEN cible_email IS NOT NULL
        THEN lower(cible_email) = lower(auth.jwt() ->> 'email')
      ELSE (
        cible = 'tous'
        OR is_admin_ou_superadmin()
        OR (cible = 'collecteurs' AND is_collecteur())
      )
    END
  );

-- INSERT / UPDATE / DELETE inchangés (admins + superadmins), posés par
-- migration-notif-cibles-3-niveaux.sql — non redéfinis ici :
--   notifications_insert / _update / _delete = is_admin_ou_superadmin()
