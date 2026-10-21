# Demande #89 — Scinder une collecte « les deux versions » au lieu d'en créer une seconde

- **Épic :** Corrections et évolutions (complexité **L**)
- **Demande :** #89 de la table `demandes` de production — Cyril, 2026-10-21, priorité *normale*.
  Publics cités : membres, collecteurs, admins. Liée à #87, #88 et #83.
- **Statut :** développée le 2026-10-21 (« go 89 » de Cyril) — **migration à jouer** (voir
  Réalisation).
- **Version en clair :** [demande-89-scinder-collecte-deux-versions-en-clair.md](demande-89-scinder-collecte-deux-versions-en-clair.md)

## Contexte (demande)

> En fait il y a un problème en lien avec 87 et 88, c'est que pour le billet palisse, il y a une
> pré-collecte pour les deux versions, puis une collecte pour la version normale. ce qui n'est pas
> pertinent, en fait il aurait fallu pouvoir splitter la pré-collecte en une collecte normale et une
> collecte dorée, car la ils se sont rendu compte que pour le moment la version doré n'était pas
> encore dispo, mais le jour ou elle sera dispo il faudrait une collecte juste pour la version non
> collectée. En fait l'idée quand on créé une version pour lequel il y a déjà une collecte
> existante, c'est qu'il y ai un message qui permette de dire voulez vous plutot spliter la
> collecte existante que de créer une nouvelle collecte. est-ce que c'est clair ?

## Constat

**Lapalisse (billet 5658, UEQX 2026-8), lu en base le 21/10 :**

| Collecte | Périmètre | Statut | Créée (UTC) | Inscrits | Normaux | Variantes | Paiements ≠ non payé |
|---|---|---|---|---|---|---|---|
| « Collecte 2026 » | les deux | Pré collecte, sans collecteur ni prix | 05:52 | 12 (11 automatiques) | 17 | 11 | 0 |
| « Collecte Normale » | normal | Collecte, Damien, 3,20 € | 05:53 | 7 (manuelles) | 13 | — | 6 |

Un seul membre est inscrit aux deux.

**Pourquoi les 12 pré-inscrits ne sont pas passés dans la collecte de Damien** : à la création
d'une collecte (`saveCollecte()` → `creerAutoInscriptions()`), la règle anti-réinscription N1
(`chargerDejaInscrits()` / `scopesSeRecouvrent()`) écarte tout membre déjà inscrit à une collecte
du billet dont le périmètre recouvre le nouveau — et « les deux » recouvre « normal ». Leurs
normaux restent donc dans une pré-collecte qui ne sera jamais ouverte pour eux : **17 normaux
pré-réservés ne mènent nulle part.**

**Ce que la base impose à une scission** :
- `inscriptions_collecte_membre_id_uk UNIQUE (collecte_id, membre_id)` : une inscription par membre
  et par collecte — répartir une inscription sur deux collectes, c'est donc **deux lignes**, une par
  collecte (ce qui est permis : un membre peut être inscrit à plusieurs collectes d'un billet) ;
- invariant D4 (`check_inscription_scope_invariant`, `check_collecte_scope_vs_inscriptions`) : on
  ne peut passer une collecte en `variante` que lorsqu'aucune de ses inscriptions n'a plus de
  normaux, et réciproquement — **l'ordre des opérations compte** ;
- ce qui accroche une inscription : paiement (`statut_paiement`, trigger
  `enforce_inscription_statut_paiement`), compléments de prix (#44, `dettes.inscription_id`),
  rangement en enveloppe (`enveloppe_id`, `statut_livraison`), `fdp_regles`, `envoye` (D12).

## Proposition

### 1. L'opération « scinder »

Une fonction en base, `scinder_collecte(p_collecte uuid, p_version text, p_nouvelle jsonb)`,
exécutée en **une seule transaction** (sinon une coupure au milieu laisserait des
inscriptions à moitié déplacées), réservée aux admins (`is_admin_ou_superadmin()`, jamais
`TO authenticated`). Pour une collecte `les_deux` et une version à détacher (`normal` ou
`variante`) :

1. crée la **nouvelle collecte** avec le périmètre détaché et les champs du formulaire (nom,
   collecteur, prix, dates, statut) ; le plafond (`nb_max`) de l'originale **est recopié** sur la
   nouvelle, et l'originale garde le sien (décision de Cyril, 21/10 — Q4 : « dans un premier temps
   ça ira bien ») ;
2. pour chaque inscription de la collecte d'origine qui a des quantités dans la version détachée :
   crée l'inscription correspondante dans la nouvelle collecte (même membre, mêmes quantités pour
   cette version, `date_inscription` et `changed_by` conservés), puis remet ces quantités à 0 dans
   l'inscription d'origine — et **supprime** celle-ci si elle n'a plus rien ;
3. passe la collecte d'origine au périmètre restant (`normal` ou `variante`) — D4 l'accepte, plus
   aucune inscription incompatible ;
4. rend un compte rendu (inscriptions déplacées, supprimées, créées).

**La collecte d'origine garde la version qui reste en attente** (à Lapalisse : la dorée, en
pré-collecte), la nouvelle prend celle qu'on ouvre. Les pré-inscriptions gardent ainsi leur
historique là où rien ne bouge.

**Garde-fous** : refus si une inscription de la collecte d'origine a un paiement déclaré ou
confirmé, un complément de prix, un rangement en enveloppe, `fdp_regles` ou `envoye` (Q2 —
confirmé par Cyril le 21/10 : « uniquement quand collecte sans aucun paiement ») ; refus
si la collecte n'est pas `les_deux` ; refus si elle est terminée.

### 2. Où on le propose

- **À la création d'une collecte** (fiche du billet, « Ajouter une collecte », `saveCollecte()`) :
  si le périmètre choisi est `normal` ou `variante` et qu'une collecte **non terminée** du billet
  est `les_deux`, une fenêtre propose :
  - **« Scinder « Collecte 2026 » »** — ses inscrits gardent leurs variantes dans « Collecte 2026 »
    (qui devient « variantes seulement ») et retrouvent leurs normaux dans la nouvelle collecte ;
    chiffres à l'appui (« 12 inscrits : 17 normaux passeront dans la nouvelle collecte ») ;
  - **« Créer une collecte à part »** — le comportement actuel, avec l'avertissement que les
    pré-inscrits de « Collecte 2026 » ne seront **pas** inscrits à la nouvelle ;
  - « Annuler ».
- **Sur une collecte de la liste des collectes de la fiche** (`renderCollectesList()`), un bouton
  « Scinder », qui ouvre le même formulaire pré-rempli — **affiché seulement sur une collecte qu'on
  peut réellement scinder** : `les_deux`, non terminée, et sans aucune inscription à paiement
  déclaré ou confirmé, enveloppe, `envoye` ou `fdp_regles` (précisé par Cyril le 21/10 — Q6 : « il
  ne faut pas que ça perturbe la compréhension globale du système »). Pour le savoir à
  l'affichage, `chargerCompteursInscriptionsBillet()` lit déjà les inscriptions du billet : y
  ajouter ces colonnes et compter, par collecte, les inscriptions qui bloquent. La fonction en base
  refait le contrôle (compléments de prix compris) : le bouton n'est qu'un raccourci.
  ~~un bouton « Scinder » (Q6) sur toute collecte « les deux versions »~~ — remplacé le 21/10 : un bouton
  qu'on ne pourrait pas utiliser brouillerait la lecture de la liste.

### 3. Après la scission

- Le statut du billet reste dérivé de ses collectes (rien à faire).
- **Les membres ne sont pas prévenus** (décision de Cyril, 21/10 — Q3 : « c'est juste une collecte
  qui est scindée »).
- Le catalogue et la fiche montrent deux collectes ; #88 garantit que les deux restent visibles
  tant qu'elles sont en cours ; #87 donne à chacune son bouton « Partager ».
- « Mes inscriptions » : le membre voit deux inscriptions au billet, une par collecte, comme
  aujourd'hui quand un billet a plusieurs collectes.
- Le recalcul des pré-inscriptions automatiques (`recalculerAutoInscriptions()`) ne vise que la
  collecte principale du billet : limite existante, à garder en tête (hors périmètre).

### 4. Lapalisse : la réparation (ponctuelle, à décider)

La scission arrive trop tard pour Lapalisse : la collecte des normaux existe déjà, avec des
paiements. Deux voies (Q1) :
- **(a) Rattacher** : inscrire les 11 pré-inscrits absents de la collecte de Damien à cette
  collecte, avec leurs normaux (ils lui devront 3,20 € par billet), retirer ces normaux de
  « Collecte 2026 », puis la passer en « variantes ». Le membre inscrit aux deux garde son
  inscription chez Damien. Script ponctuel, essai à blanc, joué par Cyril.
- **(b) Ne rien rattacher** : retirer les normaux de « Collecte 2026 » et la passer en
  « variantes » ; les 11 membres s'inscrivent eux-mêmes chez Damien s'ils le veulent (une
  notification peut les prévenir).

**Fait le 2026-10-21 — voie (a), décision de Cyril** (« tu peux inscrire les 11 pré-inscrits qui
ne le sont pas, et la pré-collecte existante doit être uniquement une pré-collecte pour les
dorés »). Script ponctuel par le Worker, essai à blanc puis exécution : 11 inscriptions créées
chez Damien (16 normaux, `changed_by` et `date_inscription` d'origine conservés, non payées) ; le
membre 100, déjà inscrit chez Damien, garde son inscription ; dans « Collecte 2026 », normaux
remis à 0 pour 10 inscrits, 2 inscriptions supprimées (que des normaux), périmètre passé à
`variante`. Contrôle relu en base : « Collecte 2026 » `variante` / Pré collecte, 10 inscrits,
0 normal, 11 dorés ; « Collecte Normale » 18 inscrits, 29 normaux. Personne n'était bloqué ni sur
la liste noire de Damien ; pas de plafond. Les membres n'ont pas été notifiés.

### 5. Base de données (migration à jouer par Cyril)

- `CREATE FUNCTION scinder_collecte(…)` (`SECURITY DEFINER`, `search_path` fixé, contrôle admin en
  tête), `GRANT EXECUTE` au rôle `anon` (le JWT Firebase arrive en `anon`) ;
- scripts habituels : constat, migration, contrôle (une scission jouée sur une collecte de test
  dans une transaction annulée), retour arrière (suppression de la fonction).

### 6. Découpage

1. La fonction en base + le bouton « Scinder » sur une collecte `les_deux`.
2. La proposition à la création d'une collecte.
3. La réparation de Lapalisse (script ponctuel), dès que Q1 est tranchée — elle peut précéder 1 et 2.

Vérification sur le banc PostgREST + jsdom (`scripts/banc-62/`) : les triggers D4, D12 et
paiement sont ceux de la production.

## Questions ouvertes (reprises dans la version en clair)

- ~~**Q1 — Lapalisse** : rattacher les 11 pré-inscrits à la collecte de Damien (a), ou les laisser
  s'inscrire eux-mêmes (b) ?~~ Tranchée par Cyril le 21/10 : (a), faite le jour même (§ 4).
*Réponses de Cyril en commentaire, le 21/10 (Q2, Q3, Q4, Q6).*

- ~~**Q2 — Quand peut-on scinder ?**~~ Seulement une collecte sans aucun paiement (§ 1, garde-fous).
- ~~**Q3 — Prévenir les membres ?**~~ Non (§ 3).
- ~~**Q4 — Le plafond**~~ : recopié sur les deux collectes, dans un premier temps (§ 1).
- ~~**Q5 — Qui**~~ : les admins seulement (confirmé par Cyril le 21/10).
- ~~**Q6 — Le bouton « Scinder »**~~ : oui, mais seulement sur une collecte qu'on peut scinder (§ 2).

## Réalisation

Développée le 2026-10-21 sur le « go 89 » de Cyril. Site : commit `3e166e0`, cache `v328`.
**La migration est à jouer par Cyril** : tant qu'elle ne l'est pas, « Scinder » répond « la
migration de la demande #89 doit être jouée » et rien d'autre ne change.

### Trouvé en route : l'audit réécrivait l'auteur des pré-inscriptions

`set_inscription_audit()` (déclencheur de toutes les inscriptions) **réécrit l'auteur** (`changed_by`) **à chaque
modification** — e-mail du jeton, ou « système » sans jeton. Or `changed_by = 'pré-inscription'`
est ce qui distingue une pré-inscription automatique : le D12, `supprimerPreCollecte()`, le
recalcul et la réconciliation des versions s'en servent. Conséquences :
- **la réparation de Lapalisse du matin** (par le Worker) a passé à « système » les 10 inscriptions
  restées dans « Collecte 2026 ». Les 11 lignes recopiées chez Damien ont gardé « pré-inscription »
  (une création conserve l'auteur fourni) : les 9 membres correspondants étaient donc des
  pré-inscrits, le 10ᵉ (membre 100) une inscription manuelle ;
- **la scission aurait fait pareil** sur chaque inscription de l'originale.

Parade : l'audit reçoit un réglage local à la transaction, `billets.audit_garder_auteur`, que
`scinder_collecte()` pose le temps de sa mise à jour (et que le script de Lapalisse utilise). Hors de
ce réglage, l'audit se comporte exactement comme avant (vérifié). Q5 : **admins seulement**,
confirmé par Cyril (commentaire du 21/10).

### Base (scripts non versionnés, `scripts/`)

| Script | Rôle |
|---|---|
| `migration-demande-89-1-constat.sql` | lecture seule : l'audit en prod a l'empreinte attendue (md5 du corps sans blancs, relevé sur le catalogue du 17/09), la fonction n'existe pas, colonnes présentes, 9 lignes de Lapalisse à corriger |
| `migration-demande-89-2-migration.sql` | l'audit avec le réglage, `scinder_collecte()`, droits, rechargement du schéma de l'API — reproduite en annexe |
| `migration-demande-89-3-controle.sql` | lecture seule : 5 points OK |
| `migration-demande-89-4-lapalisse-auteur.sql` | ponctuel, après l'étape 2 : rend « pré-inscription » aux 9 dorés de Lapalisse |
| `migration-demande-89-9-retour-arriere.sql` | l'audit d'avant, à l'identique (même empreinte), et la fonction supprimée |

### Site

- `admin.js` — `saveCollecte()` pose la question avant de créer (et `posterCollecte()` reprend la
  création telle qu'elle était) ; nouvelles `billetADeuxVersions()`, `collecteLesDeuxEnCours()`,
  `collecteScindable()`, `ouvrirScissionCollecte()`, `majInfoScission()`, `proposerScission()`,
  `choisirScission()`, `scinderCollecte()` ; `chargerCompteursInscriptionsBillet()` compte les
  inscriptions engagées ; bouton `btn-scinder-collecte` dans `renderCollectesList()` et délégation
  d'`initPanel()` ; `sortirEditionCollecte()` sort du mode scission.
- `style.css` — `.btn-scinder-collecte`, `.collecte-scission-info`, `.scission-choix-overlay`
  (au-dessus de la modale de collecte, z-index 3000).
- Pas de pré-inscriptions automatiques après une scission : elle emporte celles qui existent.

### Vérification

- `scripts/banc-62/test-89-scission.sh` : **vrai Postgres 17** (Docker), schéma minimal mais
  fonctions et déclencheurs de la production recopiés du catalogue (audit, D4 dans les deux sens,
  `is_admin_ou_superadmin`), et les **vrais scripts** 1, 2, 3, 4, 9. Constat → migration (rejouable)
  → contrôle 5/5 ; scission des normaux (cas de Lapalisse) et des variantes ; 8 refus sans effet
  (membre, clé publique seule, paiement déclaré, complément de prix, enveloppe, collecte d'une
  version, terminée, version inconnue) ; superadmin, éditeur SQL et Worker autorisés ; audit
  ordinaire inchangé ; étape 4 ; retour arrière jusqu'à l'empreinte d'origine. **36/36.**
- `scripts/banc-62/test-89-site.mjs` : vrai `admin.js` sur `admin-billet.html` dans jsdom, base
  imitée. Bouton (4 cas), modale de scission et appel, question à la création (3 choix), cas sans
  question, migration absente. **25/25.** Non-régression : #87 15/15, #80 51/51.
- **Pas vérifié** : la vraie base (le catalogue date du 17/09 ; c'est le constat, par l'empreinte,
  qui dira si l'audit a bougé depuis), la vraie page connectée, le téléphone.

### Annexe — la migration (étape 2)

```sql
-- =============================================================================
-- Demande #89 — Scinder une collecte « les deux versions » — étape 2 : MIGRATION
-- =============================================================================
-- À jouer dans l'éditeur SQL de Supabase, APRÈS le constat (…-89-1-constat.sql) : toutes ses
-- lignes doivent dire PRET ou OK. Rejouable sans danger (CREATE OR REPLACE). Rien n'est supprimé.
--
-- 1. L'audit des inscriptions (set_inscription_audit) sait, le temps d'une transaction, NE PAS
--    réécrire l'auteur d'une inscription modifiée. Sans ça, scinder une collecte transformait les
--    pré-inscriptions automatiques en inscriptions « manuelles » (vu sur Lapalisse le 21/10).
-- 2. scinder_collecte(collecte, version, nouvelle) : tout en une transaction, admins seulement.
-- =============================================================================

BEGIN;

-- 1. Audit : identique à la version en production, plus le réglage « garder l'auteur ».
CREATE OR REPLACE FUNCTION public.set_inscription_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Toujours mettre à jour last_changed
    NEW.last_changed := NOW();

    IF TG_OP = 'INSERT' THEN
        -- Sur création : garder changed_by si fourni explicitement (≠ valeur par défaut 'système')
        -- sinon utiliser l'email JWT de l'utilisateur connecté, sinon 'système'
        IF NEW.changed_by IS NULL OR NEW.changed_by = 'système' THEN
            NEW.changed_by := COALESCE(auth.jwt() ->> 'email', 'système');
        END IF;
    ELSIF current_setting('billets.audit_garder_auteur', true) = 'oui' THEN
        -- Demande #89 : une opération de maintenance (scission d'une collecte) déplace des
        -- quantités sans changer l'auteur de l'inscription. Réglage local à la transaction,
        -- posé par scinder_collecte() : changed_by garde la valeur de la ligne (ou celle que
        -- l'instruction fixe elle-même).
        NULL;
    ELSE
        -- Sur modification : toujours utiliser l'email JWT ou 'système'
        NEW.changed_by := COALESCE(auth.jwt() ->> 'email', 'système');
    END IF;

    RETURN NEW;
END;
$function$;

-- 2. La scission.
CREATE OR REPLACE FUNCTION public.scinder_collecte(p_collecte uuid, p_version text, p_nouvelle jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
DECLARE
    v_orig        collectes%ROWTYPE;
    v_reste       text;
    v_bloquantes  int;
    v_nouvelle    uuid;
    v_ids         int[];
    v_creees      int;
    v_modifiees   int;
    v_supprimees  int;
BEGIN
    -- Admins seulement. Hors du site (éditeur SQL : pas de JWT ; Worker de maintenance :
    -- service_role) : autorisé, comme les autres garde-fous du projet (#64).
    IF auth.jwt() IS NOT NULL
       AND COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
       AND NOT public.is_admin_ou_superadmin() THEN
        RAISE EXCEPTION 'Scinder une collecte est réservé aux admins.' USING ERRCODE = '42501';
    END IF;

    IF p_version IS NULL OR p_version NOT IN ('normal', 'variante') THEN
        RAISE EXCEPTION 'Version à détacher inconnue : % (normal ou variante).', p_version;
    END IF;
    v_reste := CASE p_version WHEN 'normal' THEN 'variante' ELSE 'normal' END;

    SELECT * INTO v_orig FROM collectes WHERE id = p_collecte FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Collecte introuvable.';
    END IF;
    IF v_orig.scope IS DISTINCT FROM 'les_deux' THEN
        RAISE EXCEPTION 'Seule une collecte « les deux versions » se scinde (« % » couvre : %).', v_orig.nom, v_orig.scope;
    END IF;
    IF v_orig.categorie = 'Terminé' THEN
        RAISE EXCEPTION 'La collecte « % » est terminée : elle ne se scinde pas.', v_orig.nom;
    END IF;

    -- Personne n'a encore payé, déclaré un paiement, reçu un billet ni de complément de prix
    -- (décision de Cyril du 21/10).
    SELECT COUNT(*) INTO v_bloquantes
      FROM inscriptions i
     WHERE i.collecte_id = p_collecte
       AND (i.statut_paiement <> 'non_paye'
            OR i.envoye = true
            OR i.fdp_regles = true
            OR i.enveloppe_id IS NOT NULL
            OR i.statut_livraison <> 'non_reparti'
            OR EXISTS (SELECT 1 FROM dettes d WHERE d.inscription_id = i.id));
    IF v_bloquantes > 0 THEN
        RAISE EXCEPTION 'Impossible de scinder « % » : % inscription(s) ont déjà un paiement, un envoi ou un complément de prix.',
            v_orig.nom, v_bloquantes;
    END IF;

    -- 1. La nouvelle collecte : la version détachée et les champs du formulaire. Le plafond de
    --    l'originale est recopié quand le formulaire n'en donne pas (décision du 21/10).
    INSERT INTO collectes (billet_id, nom, scope, categorie, collecteur, prix, prix_variante,
                           payer_fdp, fdp_com, date_pre, date_coll, date_fin, nb_max)
    VALUES (v_orig.billet_id,
            COALESCE(NULLIF(btrim(p_nouvelle ->> 'nom'), ''),
                     v_orig.nom || CASE p_version WHEN 'normal' THEN ' — normaux' ELSE ' — variantes' END),
            p_version,
            COALESCE(NULLIF(p_nouvelle ->> 'categorie', ''), 'Pré collecte'),
            NULLIF(p_nouvelle ->> 'collecteur', ''),
            NULLIF(p_nouvelle ->> 'prix', '')::numeric,
            NULLIF(p_nouvelle ->> 'prix_variante', '')::numeric,
            COALESCE(p_nouvelle ->> 'payer_fdp', ''),
            COALESCE(p_nouvelle ->> 'fdp_com', ''),
            COALESCE(NULLIF(p_nouvelle ->> 'date_pre', '')::date, current_date),
            NULLIF(p_nouvelle ->> 'date_coll', '')::date,
            NULLIF(p_nouvelle ->> 'date_fin', '')::date,
            COALESCE(NULLIF(p_nouvelle ->> 'nb_max', '')::int, v_orig.nb_max))
    RETURNING id INTO v_nouvelle;

    -- 2. Chaque inscrit retrouve, dans la nouvelle collecte, ses quantités de la version
    --    détachée : même auteur, même date d'inscription. Les « pas intéressé » ne suivent pas.
    INSERT INTO inscriptions (billet_id, collecte_id, membre_id, nb_normaux, nb_variantes,
                              mode_paiement, mode_envoi, commentaire, adresse_snapshot,
                              changed_by, date_inscription)
    SELECT i.billet_id, v_nouvelle, i.membre_id,
           CASE p_version WHEN 'normal' THEN i.nb_normaux ELSE 0 END,
           CASE p_version WHEN 'variante' THEN i.nb_variantes ELSE 0 END,
           i.mode_paiement, i.mode_envoi, i.commentaire, i.adresse_snapshot,
           i.changed_by, i.date_inscription
      FROM inscriptions i
     WHERE i.collecte_id = p_collecte
       AND i.pas_interesse = false
       AND CASE p_version WHEN 'normal' THEN i.nb_normaux ELSE i.nb_variantes END > 0;
    GET DIAGNOSTICS v_creees = ROW_COUNT;

    -- 3. L'originale perd ces quantités ; l'auteur des inscriptions ne change pas.
    SELECT array_agg(i.id) INTO v_ids
      FROM inscriptions i
     WHERE i.collecte_id = p_collecte
       AND CASE p_version WHEN 'normal' THEN i.nb_normaux ELSE i.nb_variantes END > 0;

    PERFORM set_config('billets.audit_garder_auteur', 'oui', true);
    UPDATE inscriptions i
       SET nb_normaux   = CASE p_version WHEN 'normal' THEN 0 ELSE i.nb_normaux END,
           nb_variantes = CASE p_version WHEN 'variante' THEN 0 ELSE i.nb_variantes END
     WHERE i.id = ANY (COALESCE(v_ids, '{}'));
    GET DIAGNOSTICS v_modifiees = ROW_COUNT;
    PERFORM set_config('billets.audit_garder_auteur', '', true);

    -- Une inscription qui n'a plus rien (le membre n'avait pris que la version détachée)
    -- disparaît de l'originale.
    DELETE FROM inscriptions i
     WHERE i.id = ANY (COALESCE(v_ids, '{}'))
       AND i.pas_interesse = false
       AND COALESCE(i.nb_normaux, 0) = 0
       AND COALESCE(i.nb_variantes, 0) = 0;
    GET DIAGNOSTICS v_supprimees = ROW_COUNT;

    -- 4. L'originale ne couvre plus que la version restante (l'invariant D4 l'accepte : il ne
    --    lui reste plus aucune quantité de l'autre version).
    UPDATE collectes SET scope = v_reste WHERE id = p_collecte;

    RETURN jsonb_build_object(
        'collecte_scindee', p_collecte,
        'nouvelle_collecte', v_nouvelle,
        'version_detachee', p_version,
        'inscriptions_creees', v_creees,
        'inscriptions_modifiees', v_modifiees,
        'inscriptions_supprimees', v_supprimees);
END;
$fn$;

REVOKE ALL ON FUNCTION public.scinder_collecte(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scinder_collecte(uuid, text, jsonb) TO anon, authenticated, service_role;

COMMIT;

-- Le site appelle la fonction par l'API : qu'elle la voie tout de suite.
NOTIFY pgrst, 'reload schema';
```

## Liens

- **#87** (partager une collecte) et **#88** (plusieurs collectes ouvertes visibles) : à
  développer **avant** ou avec #89 — une collecte scindée en produit justement deux.
- **#83** (normaux et variantes dans des enveloppes différentes) : avec la scission, une collecte
  `les_deux` déjà ouverte peut être coupée en deux, ce qui rend l'option D de #83 (deux collectes)
  valable aussi pour les collectes existantes. Si #89 est validée, #83 pourrait se réduire à rien.

## Hors périmètre

- Fusionner deux collectes (l'inverse).
- Scinder une collecte `normal` ou `variante` (il n'y a rien à scinder).
- Le recalcul des pré-inscriptions automatiques sur plusieurs collectes d'un même billet.
