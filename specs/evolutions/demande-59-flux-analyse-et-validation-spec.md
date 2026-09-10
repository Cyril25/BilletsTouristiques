# Demande #59 — Flux d'analyse des demandes L et validation de spec par un admin

- **Épic :** corrections et évolutions (complexité **M**)
- **Demande :** #59 de la table `demandes` de production — Cyril, 2026-09-10, priorité *normale*.
- **Concerne :** les admins (6 personnes).
- **Statut :** **À tester.** Développée le 2026-09-10. ⚠ **Migration à jouer**
  (`scripts/migration-demande-59-flux-analyse-validation.sql`) : sans elle, les deux nouveaux
  états n'existent pas en base et la validation reste indisponible — l'écran le dit et nomme le
  script, le reste continue de fonctionner.
- **Suite directe de #58**, qui a rendu les specs lisibles dans l'appli sans rendre visible
  qu'elles attendaient quelque chose.

## Contexte (demande)

> Dans la liste des demandes, on ne voit pas du premier coup d'œil qu'un point attend la lecture
> et la validation d'un ou plusieurs admins : il faut ouvrir la fiche pour découvrir qu'il y a
> une spec.
>
> Pour les points L, avant de les attaquer, au moins un admin doit lire et valider ce qui est
> écrit. La validation se fait par une case à cocher « validation de la spec », pas par un « ok
> pour moi » qu'on interprète.
>
> Faire évoluer les statuts en conséquence : un point L passe en « Prêt à analyser », puis
> « Analyse à valider » une fois l'analyse écrite, puis « Prêt à dev » une fois validée.

**Le défaut que ça corrige est celui de #58 elle-même** : les documents sont enfin lisibles, mais
rien dans la liste ne dit qu'ils existent ni qu'on attend quelque chose de vous. Une fonctionnalité
de relecture que personne ne voit ne produit aucune relecture.

## Les décisions du cadrage (2026-09-10)

| | Décision |
|---|---|
| **États** | Deux nouveaux : `a_analyser` (**Prêt à analyser**) et `analyse_a_valider` (**Analyse à valider**). **`en_cours` change de sens** : il désignait la phase d'analyse d'une L, il désigne désormais le **développement**. Neuf états au total. |
| **Validation** | **Une seule suffit**, et elle fait basculer **automatiquement** en Prêt à dev. |
| **Qui valide** | **N'importe quel admin, y compris celui qui a piloté l'analyse.** Choix assumé (voir plus bas). |
| **Signal liste** | La ligne se **met en évidence quand moi je n'ai pas encore validé**, sur le modèle existant de « À tester par \<moi\> » (#49), avec icône document et compteur. |

### Le flux

```
Nouvelle → À cadrer → Prêt à analyser → Analyse à valider → Prêt à dev
         → En cours (dev) → À tester → Terminée
```

### Ce qui déclenche le parcours

**Le L au moment du tri**, pas la complexité courante. Une ré-estimation ultérieure n'éjecte pas
la demande du flux — cas vécu avec **#1 et #22**, repassées à **M** après leur cadrage alors que
leur analyse existe et attend toujours une relecture.

### Pourquoi le pilote de l'analyse peut valider sa propre spec

C'est le point le plus discutable, et il est **assumé** : à six admins bénévoles, interdire
l'auto-validation, c'est risquer qu'une demande reste bloquée indéfiniment parce que personne
d'autre ne réagit. La contrepartie — une validation peut devenir une formalité qu'on s'auto-délivre
— est acceptée : **le mécanisme trace qui a validé et quand**, ce qui suffit à rendre la formalité
visible. Si l'usage montre que ça se vide de sens, restreindre plus tard ne coûte qu'une condition.

## Ce qui est construit

### 1. Les deux états, et un changement de sens

Les états sont **contraints en base** (`demandes_etat_check`) : en ajouter demande de recréer la
contrainte, exactement comme la migration qui avait introduit `a_tester`. La contrainte doit tomber
**avant** la reprise des données, sinon les nouvelles valeurs la violeraient.

Reprise mesurée le 2026-09-10 : exactement **deux lignes** en `en_cours`, **#1 et #22**, toutes
deux avec leur analyse écrite et non relue. Aucune n'est un développement en cours — il n'existait
pas d'état pour ça. Elles passent donc en `analyse_a_valider`.

### 2. Les validations

```
demande_validations (id, demande_id, admin_email, created_at)
  UNIQUE (demande_id, admin_email)
```

**Qui et quand, pas un booléen** : à six admins, savoir *qui* a relu vaut autant que le fait
qu'une relecture a eu lieu. La contrainte d'unicité évite qu'un double-clic fasse mentir le
compteur affiché dans la liste.

**RLS** — conventions du projet : jamais `TO authenticated` (le JWT Firebase arrive en rôle `anon`),
et `is_admin_ou_superadmin()` plutôt que `is_admin()`, qui exclut le superadmin.

- **SELECT** : les admins.
- **INSERT** : les admins, **sous leur propre nom uniquement** (`lower(admin_email) = lower(jwt.email)`).
  Sans ce `WITH CHECK`, un admin pourrait faire basculer une demande en Prêt à dev au nom d'un autre.
- **DELETE** : sa propre validation seulement.

### 3. La bascule automatique

Par **trigger en base**, pas dans le front — même raisonnement qu'en #44 : une règle de cohérence
qui vit en base ne se contourne pas par un chemin imprévu (appel direct à l'API, correction en SQL).

Le trigger ne touche **que** les demandes en `analyse_a_valider` : valider une demande déjà partie
en dev, ou déjà terminée, ne doit rien rouvrir.

⚠ **Retirer sa validation ne fait pas revenir en arrière.** Le compteur baisse, l'état reste. Une
demande qui retomberait toute seule en analyse parce que quelqu'un a décoché serait plus déroutante
qu'utile ; le retour se fait à la main.

### 4. Le signal dans la liste

Trois indices, du plus discret au plus fort :

- une **icône document** dès qu'une spec est attachée (`docs` non vide, cf. #58) ;
- un **compteur de validations** sur les demandes en attente de relecture — vert si j'ai validé,
  ambre sinon ;
- la **ligne mise en évidence** quand la demande attend une relecture **et que je n'ai pas encore
  validé**. C'est le motif de #49 : ce qui attend quelque chose de moi ne doit pas demander un survol.

### 5. Un effet de bord réparé : les référentiels étaient dupliqués

`ETATS`, `ETATS_ACTIFS`, `PRIORITE_*`, `QUI_*`, `parseQui()`, `quiLabel()` et `getEtatDef()`
vivaient **en double**, dans `admin-demandes.js` et dans `demande.js` — duplication introduite par
#58. Ajouter deux états aurait voulu dire les ajouter deux fois, avec la certitude qu'un jour les
deux copies divergeraient. Ils sont désormais dans **`global.js`**, chargé sur toutes les pages,
sous les mêmes noms : aucun site d'appel n'a bougé.

## Critères d'acceptation

1. La liste propose les **neuf** états, dans l'ordre du flux, et « En cours » s'affiche
   « En cours (dev) ».
2. Une demande avec une spec attachée porte une **icône document** dans la liste, sans qu'on ait
   à ouvrir la fiche.
3. Une demande en « Analyse à valider » que **je** n'ai pas validée **ressort visuellement** dans
   la liste ; une fois que je l'ai validée, elle ne ressort plus.
4. Le compteur affiche le bon nombre de validations, et son infobulle dit si la mienne en fait partie.
5. Depuis la fiche, « J'ai lu et je valide l'analyse » **fait passer la demande en Prêt à dev**,
   et la fiche l'affiche **sans rechargement manuel**.
6. La liste des validations nomme qui a validé et quand.
7. « Retirer ma validation » enlève ma ligne, **sans** changer l'état de la demande.
8. Un admin ne peut pas valider au nom d'un autre, **y compris par appel direct à l'API**.
9. Un non-admin n'atteint ni la fiche ni les validations.
10. #1 et #22 se retrouvent en « Analyse à valider » après la migration, avec leurs documents
    toujours attachés.
11. **Avant la migration**, la liste et la fiche continuent de fonctionner ; le bloc de validation
    annonce son indisponibilité en nommant le script.

## Ce que cette spec ne fait pas

- **Pas de notification** quand une analyse est validée. Le geste est visible dans la liste ; une
  cloche de plus à chaque validation serait du bruit. À reconsidérer si les relectures traînent.
- **Pas de seuil de validations** : une suffit, décision de cadrage.
- **Pas de retour automatique en arrière** quand une validation est retirée.
- **Pas de reprise des états historiques** autre que `en_cours` → `analyse_a_valider` : les
  demandes closes gardent leur état.

## Le SQL de la migration

Reproduit ici parce que `scripts/` est **gitignoré** : cette spec est la seule copie
versionnée. Le script est **rejouable** et ne contient aucun bloc de retour arrière.

```sql
-- ============================================================
-- Demande #59 — Flux d'analyse des demandes L
--               et validation de spec par un admin
-- ============================================================
-- Spec : specs/evolutions/demande-59-flux-analyse-et-validation-spec.md
--
-- À jouer dans l'éditeur SQL Supabase, projet de PRODUCTION
-- lhwcoybugdsggcclhtgb (la copie de test ijxajtxnhbczgiarkefo
-- existe encore : un script idempotent joué dessus affiche un
-- succès parfait sans rien faire d'utile).
--
-- Rejouable : DROP CONSTRAINT IF EXISTS / CREATE TABLE IF NOT
-- EXISTS / CREATE OR REPLACE partout.
-- ============================================================

-- ------------------------------------------------------------
-- 1. LES DEUX NOUVEAUX ÉTATS
-- ------------------------------------------------------------
-- Le flux d'une demande estimée L au moment du tri devient :
--   Nouvelle → À cadrer → Prêt à analyser → Analyse à valider
--            → Prêt à dev → En cours (dev) → À tester → Terminée
--
-- ⚠ `en_cours` CHANGE DE SENS : il désignait la phase d'analyse
-- d'une demande L, il désigne désormais le DÉVELOPPEMENT.
--
-- La contrainte doit tomber avant l'UPDATE : les nouvelles
-- valeurs la violeraient. Même enchaînement que la migration qui
-- avait introduit 'a_tester'.
ALTER TABLE demandes DROP CONSTRAINT IF EXISTS demandes_etat_check;

-- Reprise des demandes en cours d'analyse. Mesuré le 2026-09-10 :
-- exactement DEUX lignes sont en `en_cours`, #1 et #22, toutes
-- deux avec leur analyse écrite et pas encore relue. Aucune n'est
-- un développement en cours — il n'existait pas d'état pour ça.
UPDATE demandes SET etat = 'analyse_a_valider' WHERE etat = 'en_cours';

ALTER TABLE demandes ADD CONSTRAINT demandes_etat_check
  CHECK (etat IN ('nouvelle', 'a_cadrer', 'a_analyser', 'analyse_a_valider',
                  'validee', 'en_cours', 'a_tester', 'terminee', 'abandonnee'));

-- ------------------------------------------------------------
-- 2. LES VALIDATIONS DE SPEC
-- ------------------------------------------------------------
-- Une ligne = « cet admin a lu l'analyse et la valide ». On garde
-- QUI et QUAND plutôt qu'un simple booléen : à six admins, savoir
-- qui a relu vaut autant que le fait qu'une relecture a eu lieu.
CREATE TABLE IF NOT EXISTS demande_validations (
    id          INT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    demande_id  INT  NOT NULL REFERENCES demandes(id) ON DELETE CASCADE,
    admin_email TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Un admin ne valide qu'une fois : sans ça, le compteur affiché
    -- dans la liste mentirait au premier double-clic.
    CONSTRAINT demande_validations_unique UNIQUE (demande_id, admin_email)
);

CREATE INDEX IF NOT EXISTS idx_demande_validations_demande
    ON demande_validations (demande_id);

COMMENT ON TABLE demande_validations IS
    'Demande #59 — relecture des analyses par les admins. Une validation suffit à faire '
    'passer la demande en « Prêt à dev » (trigger trg_demande_validation).';

-- ------------------------------------------------------------
-- 3. RLS
-- ------------------------------------------------------------
-- Conventions du projet : JAMAIS `TO authenticated` (le JWT Firebase
-- arrive en rôle anon), et is_admin_ou_superadmin() plutôt que
-- is_admin() qui exclut le superadmin.
ALTER TABLE demande_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS demande_validations_select ON demande_validations;
CREATE POLICY demande_validations_select ON demande_validations FOR SELECT
    USING (is_admin_ou_superadmin());

-- On ne valide que sous son propre nom : sans ce WITH CHECK, un admin
-- pourrait faire basculer une demande en « Prêt à dev » au nom d'un autre.
DROP POLICY IF EXISTS demande_validations_insert ON demande_validations;
CREATE POLICY demande_validations_insert ON demande_validations FOR INSERT
    WITH CHECK (
        is_admin_ou_superadmin()
        AND lower(admin_email) = lower(auth.jwt() ->> 'email')
    );

-- Retirer sa validation est possible ; retirer celle d'un autre, non.
DROP POLICY IF EXISTS demande_validations_delete ON demande_validations;
CREATE POLICY demande_validations_delete ON demande_validations FOR DELETE
    USING (
        is_admin_ou_superadmin()
        AND lower(admin_email) = lower(auth.jwt() ->> 'email')
    );

-- ------------------------------------------------------------
-- 4. LA BASCULE AUTOMATIQUE EN « PRÊT À DEV »
-- ------------------------------------------------------------
-- En base et pas dans le front, pour la même raison qu'en #44 : une
-- règle de cohérence qui vit en base ne se contourne pas par un
-- chemin imprévu (appel direct à l'API, correction en SQL).
--
-- Ne touche QUE les demandes en attente de validation : valider une
-- demande déjà partie en dev, ou déjà terminée, ne doit rien rouvrir.
CREATE OR REPLACE FUNCTION demande_valider_spec()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE demandes
       SET etat = 'validee'
     WHERE id = NEW.demande_id
       AND etat = 'analyse_a_valider';
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_demande_validation ON demande_validations;
CREATE TRIGGER trg_demande_validation
    AFTER INSERT ON demande_validations
    FOR EACH ROW
    EXECUTE FUNCTION demande_valider_spec();

-- Note de conception : retirer sa validation NE REVIENT PAS en arrière.
-- Le compteur baisse, l'état reste « Prêt à dev ». Une demande qui
-- retomberait toute seule en analyse parce que quelqu'un a décoché
-- serait plus déroutante qu'utile ; le retour se fait à la main.

-- ------------------------------------------------------------
-- 5. CONTRÔLE POST-MIGRATION
-- ------------------------------------------------------------
-- Attendu :
--   table_validations   = 1
--   policies            = 3
--   trigger_bascule     = 1
--   en_cours_restants   = 0   (plus personne en « en_cours » : l'état a changé
--                              de sens, et les deux analyses ont été reprises)
--   analyses_a_valider  = 2   (#1 et #22)
--   contrainte_etats    = un CHECK listant les NEUF valeurs
SELECT
    (SELECT count(*) FROM information_schema.tables
      WHERE table_name = 'demande_validations')                       AS table_validations,
    (SELECT count(*) FROM pg_policies
      WHERE tablename = 'demande_validations')                        AS policies,
    (SELECT count(*) FROM pg_trigger
      WHERE tgname = 'trg_demande_validation')                        AS trigger_bascule,
    (SELECT count(*) FROM demandes WHERE etat = 'en_cours')           AS en_cours_restants,
    (SELECT count(*) FROM demandes WHERE etat = 'analyse_a_valider')  AS analyses_a_valider,
    (SELECT pg_get_constraintdef(oid) FROM pg_constraint
      WHERE conname = 'demandes_etat_check')                          AS contrainte_etats;
```

## Réalisation

Développée le **2026-09-10**.

| Fichier | Ce qui a changé |
|---|---|
| `global.js` | **Source unique** des référentiels de demandes : les neuf états, les priorités, les publics, `parseQui()`, `quiLabel()`, `getEtatDef()` et `attendValidationSpec()`. |
| `admin-demandes.js` | Charge les validations ; icône document, compteur de validations, et mise en évidence de la ligne quand c'est à moi de relire. Copie locale des référentiels retirée. |
| `demande.html` / `demande.js` | Bloc « Validation de l'analyse » : qui a validé et quand, bouton de validation ou de retrait, relecture de l'état après la bascule. Copie locale des référentiels retirée. |
| `style.css` | Jetons `--color-a-relire` / `--color-a-relire-bg` posés aux **trois** endroits (clair, `prefers-color-scheme: dark`, `[data-theme="dark"]`), plus les règles de mise en évidence, du badge et du bloc de validation. |
| `specs/evolutions/CONVENTION-DEMANDES.md` | Le tableau des états et la marche à suivre des L décrivent le nouveau parcours, avec l'avertissement sur le changement de sens d'`en_cours`. |
| `scripts/migration-demande-59-flux-analyse-validation.sql` | **À jouer** (gitignoré comme toutes les migrations ; reproduit ci-dessus). |

### Ce qui a été vérifié, et ce qui ne l'a pas été

Contrôles automatiques : syntaxe des quatre fichiers JS (`node --check`), cohérence
identifiants ↔ `getElementById` sur les deux écrans, fonctions appelées depuis le HTML **et**
depuis les gestionnaires construits en chaîne, et existence d'une règle CSS pour chaque classe
introduite. Le convertisseur markdown de #58 rend cette spec sans défaut — l'appli affiche donc
correctement sa propre documentation.

**Non vérifié : le rendu réel dans un navigateur**, la bascule automatique déclenchée par le
trigger, et le comportement sur téléphone — la migration n'étant pas encore jouée au moment du
commit. C'est le sens de l'état « À tester ».

---

*Spec du 2026-09-10, écrite après le cadrage à quatre questions et développée dans la foulée.*
