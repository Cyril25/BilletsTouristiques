# Demande #62 — Migrer un membre vers une nouvelle adresse email

> **Complexité L.** Analyse écrite le 2026-09-10. **Reprise le 2026-09-11** : deux affirmations se
> sont révélées fausses en développant #64 — elles sont barrées ci-dessous, avec la correction et
> la preuve.
>
> **Complétée le 2026-09-12** : la question Q6 — comment le renommage traverse les triggers pendant
> le cascade — est **tranchée** (section « Traverser les triggers pendant le cascade »). La demande
> repart en **Analyse à valider** : ce qui reste ouvert (Q1 à Q5) appartient aux relecteurs, plus à
> l'analyse.
>
> **Reprise le 2026-09-14** avec les réponses de Cyril (commentaire de 14 h 57) : le besoin est
> confirmé ; **supprimer un membre qui a des données devient une désactivation** ; tous les admins
> peuvent changer une adresse ; le membre n'est pas prévenu. Q1 à Q3 sont tranchées, Q4 (le
> garde-fou) reste ouverte après explication. Voir « La désactivation » et « Questions ouvertes ».
>
> **Le même jour (15 h 47)**, Cyril propose une autre voie : un identifiant de membre utilisé
> partout, l'email ne servant plus qu'à l'authentification. Elle est analysée, avec son coût mesuré,
> dans « Voie C » ; la recommandation devient « B maintenant, C dans une demande à part » — à
> trancher par Cyril (Q7).
>
> **⚠ Tranché à 16 h 46 : la voie C.** « Il n'y a plus d'urgence, on peut donc repartir sur l'idée du
> numéro, qui modifiera un peu l'archi, mais qui finalement simplifiera et réduira le nombre d'erreurs
> possibles. » ~~L'analyse est reprise sur cette base et la demande repasse en « Prêt à analyser ».~~
> **Analyse réécrite le même jour (17 h)** : voir « Le plan retenu : un numéro de membre ». La demande
> repart en « Analyse à valider ».
> Tout ce qui décrit la voie B ci-dessous — clés en cascade, traversée des triggers (Q6), garde-fou
> d'exhaustivité (Q4) — est **conservé pour l'historique mais n'est plus le plan**. Ce qui reste
> acquis quelle que soit la voie : la désactivation au lieu de la suppression (Q1), tous les admins
> (Q2), pas de notification (Q3), la fusion de comptes hors périmètre, et le correctif de
> `is_admin_ou_superadmin()` sur le statut.
>
> **Validée par Cyril le 2026-09-15**, sans objection aux questions Q8 à Q11 : leurs recommandations
> sont retenues. **Développement ouvert le 2026-09-16** : les étapes 0 et 1 sont écrites et éprouvées
> sur un banc identique à la production, **puis jouées en production le 2026-09-17**. Voir
> « Réalisation ».
>
> Version en clair pour les relecteurs : `demande-62-migration-email-membre-en-clair.md`.
>
> Demande déposée par Cyril le 2026-09-10, écran visé : **Gestion Membres** (`users.html`).

## Contexte (demande)

> « Parfois il y a des membres qui n'arrivent plus à se connecter à une adresse mail et qui en
> créent une deuxième. Tous les membres ne sont pas forcément bons en informatique et ne
> comprennent pas forcément comment rebasculer sur l'ancien compte via la connexion Google. Il
> serait utile de réussir à "mettre à jour" l'adresse email d'un membre, via la gestion des
> membres. Techniquement je ne sais plus ce que cela implique, je ne sais plus si l'adresse email
> est utilisée en tant qu'identifiant en base ou si on a un `membreId`, à vérifier donc pour
> connaître la complexité de cette demande. »

**Réponse à la question posée : c'est l'email, il n'y a pas d'identifiant interne.** `membres.email` est la
clé primaire, et l'adresse est recopiée telle quelle dans **20 colonnes réparties sur 14 tables**.

## Le plan retenu : un numéro de membre *(analyse du 2026-09-14, voie C)*

> Décision de Cyril, 14/09 à 16 h 46. Cette section **remplace le plan** ; l'analyse de la voie B
> (10–14/09) reste plus bas, marquée comme historique : ses constats de terrain restent vrais, son
> plan ne l'est plus.

### Le principe

- `membres` reçoit un **identifiant**, `id`, qui ne change jamais. `email` reste dans `membres`,
  **unique**, et ne sert plus qu'à retrouver le membre à partir de la connexion Google.
- Chaque table qui **appartient** à un membre porte un `membre_id` (clé étrangère vers `membres.id`)
  **à la place** de sa copie d'adresse.
- **Changer une adresse, c'est modifier une seule ligne** : `UPDATE membres SET email = … WHERE id = …`. Rien d'autre.

Deviennent **sans objet** : la cascade, la traversée des triggers pendant la cascade (Q6), le
garde-fou d'exhaustivité (Q4) et la fonction de renommage en huit étapes. Restent **acquis** : la
désactivation au lieu de la suppression (Q1), tous les admins (Q2), pas de notification (Q3), pas de
fusion de comptes remplis, et le correctif de `is_admin_ou_superadmin()` sur le statut.

### Ce qui bouge, table par table

Le classement du 10/09 tient (voir « Classement des 20 colonnes », plus bas) :

| Catégorie | Colonnes | Devient |
|---|---|---|
| **Appartenance** (16) | `inscriptions.membre_email`, `inscriptions_auto.membre_email`, `inscriptions_auto_pays.membre_email`, `collection.membre_email`, `dettes.membre_email`, `enveloppes.membre_email`, `collecteurs.email_membre`, `collecteur_blacklist.membre_email`, `membre_blocages.membre_email`, `notifications_vues.membre_email`, `contacts_collecteur.proprietaire_email`, `demandes.demandeur`, `demande_commentaires.auteur_email`, `demande_validations.admin_email`, `signalements.auteur_email`, `notifications.cible_email` | `membre_id` (ou un nom qui dit le rôle : `auteur_id`, `demandeur_id`…), clé étrangère vers `membres.id`. La colonne d'adresse **disparaît** en fin de migration |
| **Trace** (4) | `inscriptions.changed_by`, `membre_blocages.bloque_by`, `signalements.traite_par`, `membres.validated_by` | **Q8** : garder le texte (c'était l'adresse au moment de l'action), ou ajouter un identifiant quand l'auteur est un membre |
| **Pas un membre** | `contacts_collecteur.email`, `collecteurs.paypal_email` | Inchangées |

*Complété le 2026-09-16 (export du catalogue de la production).* Quatre colonnes de **trace** sont nées
depuis le relevé du 10/09, avec #66 et #69 : `controles_billets.decide_par`,
`controles_billets_verifications.lancee_par`, `imports_billets.importe_par`,
`imports_billets_lignes.decide_par`. Elles gardent leur texte, comme les quatre autres (Q8).

**Les noms retenus au développement** (étape 1) :

| Table | Adresse | Numéro | Obligatoire | Si le membre est supprimé |
|---|---|---|---|---|
| `inscriptions`, `inscriptions_auto`, `inscriptions_auto_pays`, `collection`, `dettes`, `enveloppes` | `membre_email` | `membre_id` | oui | refusé |
| `collecteurs` | `email_membre` | `membre_id` | non (65 collecteurs sans membre) | refusé |
| `collecteur_blacklist`, `membre_blocages` | `membre_email` | `membre_id` | oui | la ligne part avec lui (comme leur clé actuelle) |
| `notifications_vues` | `membre_email` | `membre_id` | oui | la ligne part avec lui (simple marqueur) |
| `contacts_collecteur` | `proprietaire_email` | `proprietaire_id` | oui | refusé |
| `demandes` | `demandeur` | `demandeur_id` | non (13 demandes importées) | refusé |
| `demande_commentaires` | `auteur_email` | `auteur_id` | oui | refusé |
| `demande_validations` | `admin_email` | `admin_id` | oui | refusé |
| `signalements` | `auteur_email` | `auteur_id` | oui | refusé |
| `notifications` | `cible_email` | `cible_membre_id` | non (annonces à un groupe) | l'annonce part avec lui |

> ~~Annonces : colonne facultative, prévoir de vider le destinataire à la suppression~~ (classement du 10/09, plus bas : `ON DELETE SET NULL`).
> **Corrigé le 2026-09-16 : ce serait une fuite.** Une annonce privée se reconnaît à son destinataire
> renseigné ; la policy `notifications_select` montre à **tout le monde** une annonce `cible = 'tous'`
> sans destinataire. Vider le destinataire à la suppression du membre transformerait son annonce
> privée (un complément de paiement, par exemple) en annonce publique. Elle est donc supprimée avec lui.

### Trois pièges trouvés en préparant

1. **Le deuxième compte existe déjà, et c'est le cas normal.** À la première connexion avec une
   nouvelle adresse Google, la policy `membres_insert_self_pending`
   (`scripts/migration-inscription-publique.sql`) crée une ligne « en attente ». Le membre qui a
   changé d'adresse a donc **déjà** une deuxième fiche, presque vide. Renommer l'ancienne heurterait
   l'unicité de l'adresse : il faut d'abord **retirer la fiche vide** — après avoir vérifié qu'elle
   ne porte rien, ou seulement des marqueurs sans valeur comme `notifications_vues` (17 lignes dans le
   cas du 10/09). Même garde qu'avant : si la fiche cible porte de vraies données, le renommage est
   refusé et dit lesquelles.
2. **L'assistant n'est pas un membre.** Il signe ses commentaires `claude-code@assistant.local` dans
   `demande_commentaires.auteur_email`, sans ligne dans `membres`. Avec une clé étrangère, ses
   commentaires n'auraient plus d'auteur valide. Et l'écran de #68 le reconnaît justement à cette
   adresse. **Q9.**
3. **Des valeurs ne sont pas des adresses.** `demandes.demandeur` porte « Import Google Sheet » sur 13
   demandes ; les 15 adresses orphelines n'ont pas de membre. Aucune ne peut recevoir un numéro telle
   quelle. **Q10.**

### Les règles d'accès et les fonctions

- Une **fonction nouvelle**, `mon_membre_id()` (`SECURITY DEFINER`, `STABLE`), rend l'`id` du membre dont
  l'adresse est celle du jeton, **s'il est actif**. Les règles d'accès comparent `membre_id =
  mon_membre_id()` au lieu de `membre_email = auth.jwt() ->> 'email'` — sans clause `TO
  authenticated` (rôle anon pour Firebase).
- `is_whitelisted()`, `is_admin()`, `is_admin_ou_superadmin()` et `is_collecteur()` gardent leur
  forme — elles lisent déjà `membres` par l'adresse — mais `is_admin_ou_superadmin()` reçoit le filtre
  `statut = 'actif'` qui lui manque.
- Les fonctions des triggers qui comparent une colonne d'adresse à l'adresse du jeton sont à
  réécrire : paiements d'inscription, enveloppes, audit des inscriptions, et celles que le constat
  listera.
- **Combien** : 39 scripts de migration du dépôt comparent l'adresse du jeton, anciens compris. Le
  nombre réel de règles et de fonctions vivantes vient du constat
  `scripts/migration-demande-62-5-constat-numero-membre.sql` (lecture seule, requêtes 2 et 3).

### Le site

Relevé du 14/09 — références aux colonnes d'adresse de membre, par fichier :

| Fichier | Réf. | Fichier | Réf. |
|---|---|---|---|
| `mes-collectes.js` | 109 | `mes-inscriptions.js` | 8 |
| `admin.js` | 29 | `users.js` | 6 |
| `admin-pre-inscriptions.js` | 25 | `ma-collection.js` | 6 |
| `admin-demandes.js` | 25 | `collecteurs.js` | 4 |
| `demande.js` | 13 | `billet.js` | 3 |
| `app-new.js` (chargé par `billets.html`) | 13 | `notifications.js` | 2 |
| `global.js` | 10 | `mes-contacts.js`, `admin-signalements.js`, `admin-inscriptions.js` | 1 chacun |
| `admin-notifications.js` | 9 | | |

S'y ajoutent **116 usages de l'adresse de la personne connectée** et l'**impersonation admin**
(`window.impersonatedEmail`, `global.js:84`), qui « voit en tant que » par l'adresse : le site
devra connaître l'`id` de la personne connectée — un seul appel au chargement, gardé en mémoire
comme l'adresse aujourd'hui.

### Comment migrer : par étapes, pas d'un bloc

Deux façons :

- **d'un bloc**, comme #16 : schéma, règles et 17 fichiers le même jour, après répétition sur la copie
  de test ;
- **par étapes**, chacune petite, vérifiable en production et réversible.

**Recommandé : par étapes** — un projet sans tests automatiques, où chaque écran se vérifie à la main,
supporte mal un jour J de cette taille. **Q11.**

| Étape | Contenu | Visible ? | Retour arrière |
|---|---|---|---|
| **0 — préalables** | Jouer le constat ; régler les adresses orphelines et les valeurs qui ne sont pas des adresses (Q10) ; décider pour l'assistant (Q9) | Non | — |
| **1 — ajouter** | `membres.id` ; une colonne `membre_id` à côté de chaque adresse, remplie par jointure ; **un trigger par table** qui la remplit à chaque écriture tant que le site écrit encore des adresses ; clés étrangères posées | Non | Supprimer les colonnes et triggers ajoutés |
| **2 — règles d'accès** | `mon_membre_id()` ; les règles comparent `membre_id` ; `is_admin_ou_superadmin()` filtrée sur le statut | Non, si l'étape 1 est complète | Remettre les anciennes règles (scriptées avant) |
| **3 — le site, fichier par fichier** | Chaque écran lit et écrit `membre_id` ; un déploiement par groupe d'écrans, du plus petit à `mes-collectes.js` | Oui, écran par écran | Revenir au commit précédent |
| **4 — retirer** | Supprimer les triggers de l'étape 1 et les colonnes d'adresse | Non | Plus de retour : c'est la dernière |
| **5 — l'écran** | Dans Gestion Membres : changer l'adresse (avec le cas du deuxième compte), désactiver, réactiver | Oui | — |

Chaque étape se répète d'abord sur la **copie de test** (`ijxajtxnhbczgiarkefo`, site
`BilletsTouristiques-TestEnv`), comme pour #16. L'étape 1 est la plus délicate : tant que les
triggers de synchronisation existent, deux colonnes disent la même chose, et l'étape 4 est là pour
que ça ne dure pas.

> **Précisé au développement (16/09).**
>
> - **L'étape 0 a un volet site, à mettre en ligne AVANT son volet base.** Le site ne filtrait le
>   statut presque nulle part : Gestion Membres et les listes où l'on choisit un membre chargeaient
>   toutes les fiches. Créer les onze fiches désactivées avant d'adapter ces écrans les y aurait fait
>   apparaître comme des membres ordinaires. Et la page de connexion restait **muette** pour tout
>   statut autre qu'« en attente » ou « refusé » : un membre désactivé n'aurait vu aucun message.
> - **La copie de test est remplacée par un banc local** pour les étapes 0 et 1. La copie date de
>   juillet (avant #44, #58, #59, #63, #64, #66, #69) et la rafraîchir demande un accès direct à la
>   base, celui qui a déclenché l'alerte de sécurité du 15/09. Le banc est plus fidèle : image
>   Supabase officielle, **schéma exporté de la production le jour même** (99 policies, 40 fonctions,
>   16 triggers), données de production lues par le Worker, vrai PostgREST devant. La copie de test
>   reste utile à l'étape 3, où l'on vérifie des écrans à la main.
> - **Jusqu'à l'étape 2, un compte désactivé lit encore ses propres lignes par appel direct** : les
>   règles comparent l'adresse sans regarder le statut. Idem pour un admin désactivé sur les règles qui
>   testent le rôle sans le statut (`frais_port_admin_*`, `inscriptions_auto*_admin_*`,
>   `inscriptions_insert_admin`) et dans `enforce_inscription_statut_paiement()`. Sans conséquence tant
>   que personne n'est désactivé — et rien ne permet de désactiver quelqu'un avant l'étape 5.

### Critères d'acceptation

1. Changer l'adresse d'un membre depuis Gestion Membres ne modifie **qu'une ligne** ; il se reconnecte
   avec la nouvelle adresse Google et retrouve tout.
2. Si la nouvelle adresse a déjà une fiche vide (le deuxième compte), elle est retirée et le
   renommage passe ; si elle porte de vraies données, il est refusé avec la liste de ce qui bloque.
3. Plus aucune table d'appartenance ne porte d'adresse de membre à la fin de l'étape 4.
4. Chaque règle d'accès donne les mêmes droits qu'avant, vérifiée écran par écran sur la copie de
   test puis en production.
5. Un membre ou un admin désactivé perd tout accès, y compris par appel direct à la base.
6. L'impersonation admin fonctionne comme avant.
7. Les commentaires de l'assistant gardent leur auteur, et l'écran de #68 le reconnaît toujours.
8. Aucune donnée perdue : les comptes de lignes par table sont identiques avant et après chaque
   étape.

### Questions ouvertes *(voie C)*

| | Question | Recommandation |
|---|---|---|
| **Q8** | Les colonnes de **trace** (qui a modifié, bloqué, traité, validé) : garder le texte, ou ajouter un identifiant ? | Garder le texte : c'est l'adresse au moment de l'action, un historique. Après un changement d'adresse, l'ancienne y reste — acceptable pour une trace |
| **Q9** | **L'assistant** : lui créer une fiche de membre technique (désactivée, sans droits), ou laisser ses commentaires sans `auteur_id` avec un libellé ? | Une fiche technique : une seule règle pour tous les auteurs, et #68 le reconnaît par son `id` |
| **Q10** | Les **15 adresses orphelines** et les 13 « Import Google Sheet » : créer pour chacune une fiche **désactivée**, ou supprimer les lignes ? | Des fiches désactivées : rien ne se perd, et c'est exactement le rôle de la désactivation décidée en Q1. « Import Google Sheet » : `demandeur_id` vide, libellé conservé |
| **Q11** | Migrer **par étapes** ou **d'un bloc** ? | Par étapes |

**Q8 à Q11 : recommandations retenues** (validation de Cyril du 15/09, sans objection). La fiche
technique de l'assistant s'appelle « Claude Assistant », statut désactivé ; les dix adresses fantômes
reçoivent une fiche désactivée au pseudo « Ancien membre ».

**Une question de plus, tranchée le 16/09 (Q10 bis).** Le relevé du jour trouve **2 inscriptions dont le
« membre » n'est pas une adresse** : le texte `pour 2024` (n° 1182 et 1183, billets USAR et TUBJ 2024, non payées, non
envoyées, créées par l'import du 31/03). Elles n'appartiennent à personne. **Décision de Cyril : les
supprimer** (étape 0, seulement si elles sont encore exactement dans cet état).

**Q5 est tranchée par la base** (export du 16/09) : la version vivante d'`is_admin()` est celle de
`migration-inscription-publique.sql` — `admin` ou `superadmin`, **et actif**. Seules
`is_admin_ou_superadmin()` et `is_collecteur()` ignoraient le statut ; l'étape 0 les corrige.

## L'état du terrain, mesuré le 2026-09-10

Relevé sur la production via le schéma OpenAPI de PostgREST, pas de mémoire.

| Constat | Chiffre |
|---|---|
| Colonnes portant une adresse de membre | **20**, sur 14 tables |
| Dont protégées par une clé étrangère vers `membres.email` | **3** (`collection`, `membre_blocages`, `collecteur_blacklist`) |
| Adresses orphelines déjà en base (pointent vers un membre inexistant) | **15** |
| Dont enveloppes orphelines | **23 lignes, 10 adresses** |
| Membres | 108 |

**Le commentaire « FK vers membres.email » de l'ancien script de migration était faux** :
`inscriptions.membre_email` est déclarée `TEXT NOT NULL` depuis `migration-5-4-inscriptions.sql`
et n'a jamais eu de contrainte.

### La preuve que le problème est déjà réalisé, pas hypothétique

Parmi les 10 adresses d'enveloppes orphelines figure **celle qui a été migrée en 2024**, avec
6 lignes. C'est l'adresse exacte de la seule migration d'email faite à la main jusqu'ici
(un script `scripts/migrate-email-*.sql`, non versionné). Ce script traitait 6 tables ; `enveloppes`
n'en faisait pas partie. **Les 6 lignes sont restées derrière, sans erreur, sans alerte, pendant
des mois.**

Les 9 autres adresses viennent d'un autre chemin : la suppression d'un membre depuis
[users.js](../../users.js). Le code ne vérifie que `inscriptions` avant de supprimer
([users.js:626](../../users.js#L626)) — les enveloppes, elles, restent.

**Deux causes, un seul mécanisme : rien en base ne relie ces colonnes à la fiche du membre.**

## Le constat qui structure toute la suite

La demande se présente comme « ajouter un bouton pour changer une adresse ». Le travail réel n'est
pas là. **Ce qui manque, c'est l'intégrité référentielle** — et tant qu'elle manque, toute
solution est une liste écrite à la main, qui sera fausse à la prochaine table ajoutée.

**On ne construit pas une fonctionnalité sur une liste que personne ne maintiendra.**

## Ce que la migration manuelle du 2026-09-10 a appris

Faite le 2026-09-10 (`<ancienne adresse>` → `<nouvelle adresse>` : 139 inscriptions,
27 lignes de collection, 24 enveloppes, 17 marqueurs de notification). Scripts
`scripts/migration-demande-62-{1,2,3}-*.sql`. Trois enseignements qui contraignent le design :

1. **Le trigger des enveloppes BLOQUE le renommage** (`trg_enforce_enveloppe_membre_update`). Sa fonction n'a pas le garde-fou
   « JWT nul → laisser passer » de son homologue `enforce_inscription_statut_paiement()`. Sans
   JWT, elle croit avoir affaire au membre destinataire et refuse tout changement de
   `membre_email` : `Champ non modifiable par le membre`. → **saisi en demande #64.**
   ⚠ Une fonction `SECURITY DEFINER` appelée depuis l'écran **aura** un JWT (celui de l'admin), donc
   ce trigger ne bloquera pas — mais il refusera quand même, puisque l'admin n'est pas le
   collecteur propriétaire de l'enveloppe. ~~**#64 est un prérequis de #62**, ou la fonction devra
   désactiver le trigger, ce qui est bien pire dans du code appelé depuis le navigateur.~~

   > **Corrigé le 2026-09-11.** La conclusion ne suivait pas de ce qui la précède : la phrase
   > disait elle-même que le JWT de l'admin serait refusé, puis faisait de #64 — qui ne traite que
   > le cas *sans* JWT — la solution. **#64 débloque la maintenance (éditeur SQL, Worker), pas le
   > renommage lancé depuis l'écran.** Vérifié sur le banc de #64 : avec la nouvelle fonction en
   > place, un renommage porté par un JWT d'admin est toujours refusé (`Champ non modifiable par le
   > membre`). #64 reste utile, mais n'est ni suffisante ni, à strictement parler, un prérequis.
   > Voir Q6.
2. **Le trigger d'audit des inscriptions écrase l'historique sans rien dire** (`trg_inscription_audit`) : `changed_by='système'` et
   `last_changed=NOW()` sur chaque ligne touchée. Sur 139 inscriptions, toute la traçabilité.
3. **L'invariant D4 ne gêne pas** : `trg_inscription_scope_invariant` ne se déclenche que sur
   `UPDATE OF nb_normaux, nb_variantes, collecte_id`. Les 142 inscriptions hors invariant ne
   bloquent pas un renommage.

---

## Historique : l'analyse de la voie B *(10–14 septembre, plan abandonné le 14/09)*

> Tout ce qui suit décrit la voie B — faire suivre l'adresse par des clés en cascade — et son plan
> (triggers, garde-fou, fonction de renommage, découpage, critères). **Ce n'est plus le plan** : voir
> « Le plan retenu : un numéro de membre ». Conservé parce que ses constats restent vrais (les
> colonnes, les orphelines, les triggers, la désactivation) et pour comprendre pourquoi C a été
> choisie.

## Les voies

### Voie A — la liste de colonnes écrite à la main

Une fonction `SECURITY DEFINER` qui enchaîne les 20 `UPDATE`, comme le script manuel.

- **Pour** : aucun changement de schéma, aucune donnée à arbitrer, livrable vite.
- **Contre** : **elle pourrit**. Toute table ajoutée plus tard devra y être ajoutée, et rien ne le
  rappellera. C'est exactement le mécanisme qui a coûté les 6 enveloppes de 2024.

### Voie B — de vraies clés étrangères `ON UPDATE CASCADE` *(recommandée)*

On pose la contrainte sur les colonnes d'**appartenance**. Un simple
`UPDATE membres SET email = …` se propage alors partout, **y compris dans les tables qui
n'existent pas encore**, du moment qu'elles déclarent leur FK à la création — ce qui est le
réflexe normal quand on crée une table.

L'objection attendue était : « il faut d'abord nettoyer les 15 adresses orphelines ». **Vérifié sur
Postgres 16, elle ne tient pas.** Une contrainte posée `NOT VALID` :

| Question | Résultat mesuré |
|---|---|
| Peut-on la poser malgré des orphelines existantes ? | **Oui** |
| `ON UPDATE CASCADE` fonctionne-t-il quand même ? | **Oui** — la ligne suit le renommage, l'orpheline préexistante reste intacte |
| Empêche-t-elle une **nouvelle** orpheline ? | **Oui**, refusée immédiatement |
| Bloque-t-elle la suppression d'un membre qui a des données ? | **Oui** (voir ci-dessous) |

`NOT VALID` ne désactive pas la contrainte : il saute seulement la **vérification initiale** de
l'existant. Les déclencheurs d'intégrité sont bien installés et actifs.

**On peut donc adopter la voie B tout de suite, sans arbitrer une seule ligne orpheline.** Le
nettoyage devient un chantier séparé, et le jour où il est fait, un `VALIDATE CONSTRAINT` referme
le dossier.

### Voie C — un identifiant de membre *(proposée par Cyril le 2026-09-14)*

> « Tu dis “la solution retenue”, mais pour moi c'est une des solutions. La meilleure solution ne
> serait-elle pas plutôt de faire une table de correspondance email / membre id ? On utiliserait
> partout le membre id, et l'email juste pour l'authentification et la table de correspondance, ce
> qui permettrait un changement d'adresse beaucoup plus simple. »

**Sur le mot, Cyril a raison** : rien n'était retenu. La voie B était recommandée, pas décidée — et
la version en clair disait « la solution retenue » à un endroit. C'est corrigé.

**Sur le fond, c'est le modèle correct**, celui qu'on choisirait en partant de zéro : `membres.id`
comme clé, un `membre_id` dans chaque table d'appartenance, l'email seulement dans `membres`.
Changer une adresse devient **une seule mise à jour d'une seule ligne**. Plus de cascade, donc plus
de triggers à traverser (Q6 sans objet), et plus besoin du garde-fou d'exhaustivité pour le
renommage (Q4 sans objet). Et un pas vers la fusion de comptes, exclue aujourd'hui.

**Ce qu'elle coûte ici, mesuré le 14/09 dans le dépôt** :

| Où | Ce qu'il faudrait reprendre |
|---|---|
| Le site | **323 références** aux colonnes qui portent un email de membre, dans **17 fichiers** — dont **109** dans `mes-collectes.js`, le cœur des collecteurs —, plus **116** usages de l'email de la personne connectée |
| Les règles d'accès | Elles comparent presque toutes `auth.jwt() ->> 'email'` à une colonne de la table : **155 occurrences** dans les scripts de migration *(plafond : ces scripts contiennent aussi des versions remplacées)*. Le jeton Firebase porte un email, pas un identifiant : chaque règle devrait passer par une fonction « mon identifiant de membre » |
| Les données | 16 tables à doter d'une colonne, à remplir, à rendre obligatoire. **Les 15 adresses orphelines n'ont pas d'identifiant** : elles doivent être arbitrées avant, ce que la voie B évitait |
| Les triggers | Ceux qui comparent l'email du jeton à une colonne (enveloppes, paiements, audit) sont à réécrire |

C'est une migration **de la taille de la refonte des collectes (#16)**, qui a demandé une répétition
générale et un jour J — dans un projet sans tests automatisés, où chaque écran touché se vérifie à
la main.

**Ce qui les rapproche** : la voie B n'est pas un détour. Ses clés étrangères garantissent que
**chaque email recopié correspond à un membre existant** — et c'est exactement la condition pour
remplir un jour les `membre_id` par une simple jointure, sans orpheline. B prépare C.

**Ce qui les oppose** : les parties de B propres à la cascade — la sortie de renommage dans les
triggers (Q6) et le garde-fou d'exhaustivité (Q4) — deviendraient inutiles le jour où C serait faite.
C'est le coût d'aller vite.

| | Délai jusqu'au premier changement d'adresse depuis l'écran | Risque | Fin de parcours |
|---|---|---|---|
| **B seule** | Court : 16 clés, une fonction, cinq triggers, un écran | Contenu | L'email reste recopié partout |
| **C directement** | Long : une refonte de la taille de #16 | Élevé : 17 fichiers du site, la plupart des règles d'accès | Le modèle propre |
| **B maintenant, C ensuite** *(recommandé)* | Court | Contenu d'abord, puis réparti sur un chantier planifié | Le modèle propre, atteint sans orphelines ; une partie de B jetée en route |

~~Recommandation : B maintenant, C dans une demande à part, planifiée comme #16. Deux raisons :
Cyril a dit que le besoin était urgent, et C ne peut pas l'être ; et B nettoie le terrain dont C a
besoin. Entre-temps, un cas isolé reste traitable par le script manuel éprouvé le 10/09.~~ **C'est une
décision d'architecture, qui revient à Cyril : question Q7.**

> **Tranché par Cyril le 14/09 à 16 h 46 : C, dans cette demande.** La recommandation reposait
> d'abord sur l'urgence, que Cyril lève : « il n'y a plus d'urgence ». L'argument « B prépare C »
> reste vrai d'une autre manière — les adresses orphelines devront être arbitrées **avant** de
> pouvoir donner un numéro à chaque ligne, et c'est désormais un préalable de la migration, plus un
> chantier facultatif. L'analyse est reprise pour décrire C en entier : colonnes, règles d'accès,
> triggers, écrans, ordre de migration et répétition sur la copie de test.

## Conséquence à assumer : supprimer un membre change de comportement

C'est le point qui n'était pas dans la demande et qu'il faut trancher sciemment.

Aujourd'hui, supprimer un membre depuis Gestion Membres **réussit** même s'il a des enveloppes,
une collection, des dettes — et laisse tout ça orphelin. **C'est le bug qui a produit 9 des 10
adresses orphelines.** Avec les FK, ce `DELETE` sera **refusé** par la base.

Trois options :

| | Effet | Avis |
|---|---|---|
| `ON DELETE NO ACTION` (défaut) | Suppression refusée tant qu'il reste des données | **Recommandé** — c'est la correction du bug, pas un effet de bord |
| `ON DELETE CASCADE` | Supprimer un membre efface son historique | À écarter : perte de données silencieuse, dans l'autre sens |
| Pas de FK sur les tables gênantes | On garde le trou | Incohérent avec le reste |

Si `NO ACTION` est retenu, [users.js](../../users.js) doit être adapté : le contrôle actuel ne
regarde que `inscriptions`, il doit énumérer **tout** ce qui bloque et le dire clairement, au lieu
de laisser remonter une erreur Postgres brute. Sinon un admin verra un message incompréhensible.

### La désactivation *(décision de Cyril, 2026-09-14)*

> « La suppression d'un membre qui a des données devient en fait une désactivation de compte. »

`NO ACTION` **reste le bon choix en base** : une suppression physique qui laisserait des données
orphelines est refusée. Ce qui change, c'est ce que l'écran en fait. ~~Refuser la suppression avec un
message qui énumère ce qui bloque.~~ Quand le membre a des données, **« Supprimer » devient
« Désactiver »** ; un membre sans aucune donnée se supprime comme aujourd'hui.

**Le mécanisme existe déjà à moitié.** `membres.statut` porte `'actif'`, `'en_attente'` ou `'refuse'`
(`scripts/migration-inscription-publique.sql`), et
`is_whitelisted()` n'admet que `statut = 'actif'` : un membre qui n'est pas actif ne passe plus la
porte d'entrée du site. La désactivation, c'est **une valeur de plus**, `'desactive'` — distincte de
`'refuse'`, qui dit qu'une inscription a été rejetée, pas qu'un compte a vécu :

- ses données restent intactes : inscriptions, collection, enveloppes, dettes ;
- il ne peut plus se connecter ;
- un admin peut le **réactiver** (`statut` → `'actif'`) ;
- les listes où l'on choisit un membre — « Inscrire un membre » d'un collecteur, qui charge
  aujourd'hui **tous** les membres sans filtre ([mes-collectes.js:4020](../../mes-collectes.js#L4020)) —
  doivent l'exclure. Relevé exhaustif au moment du dev.

⚠ **Un point de sécurité trouvé en préparant.** `is_admin_ou_superadmin()`, sur laquelle reposent
les règles d'accès des admins, **ne regarde pas le statut** : elle ne vérifie que le rôle
(`scripts/migration-notif-cibles-3-niveaux.sql`).
Un admin désactivé ne passerait plus la porte du site, mais un jeton encore valide lui garderait
ses droits d'admin sur les appels directs à la base. Deux parades : ajouter `AND statut = 'actif'`
à la fonction (une ligne, et c'est le sens qu'on lui prête déjà), ou interdire de désactiver un
admin sans lui retirer d'abord son rôle. **Recommandé : la première**, parce qu'elle protège aussi
de tout autre chemin qui ferait perdre son statut à un admin.

## Classement des 20 colonnes

La distinction n'est pas cosmétique : elle décide où une FK a du sens.

### Appartenance — la ligne **est à** ce membre → FK `ON UPDATE CASCADE`

| Table | Colonne | FK déjà là ? |
|---|---|---|
| `inscriptions` | `membre_email` | non |
| `inscriptions_auto` | `membre_email` | non |
| `inscriptions_auto_pays` | `membre_email` | non |
| `collection` | `membre_email` | **oui** (ajouter le CASCADE) |
| `dettes` | `membre_email` | non |
| `enveloppes` | `membre_email` | non |
| `collecteurs` | `email_membre` | non |
| `collecteur_blacklist` | `membre_email` | **oui** (ajouter le CASCADE) |
| `membre_blocages` | `membre_email` | **oui** (ajouter le CASCADE) |
| `notifications_vues` | `membre_email` | non |
| `contacts_collecteur` | `proprietaire_email` | non |
| `demandes` | `demandeur` | non |
| `demande_commentaires` | `auteur_email` | non |
| `demande_validations` | `admin_email` | non |
| `signalements` | `auteur_email` | non |
| `notifications` | `cible_email` | non — **nullable**, prévoir `ON DELETE SET NULL` |

⚠ **Une exception à ne pas manquer** : `contacts_collecteur.email` ne doit PAS recevoir de FK — c'est l'adresse d'un contact
extérieur au groupe, pas d'un membre. Piège de nommage.

### Trace — la ligne **dit qui a fait** quelque chose → **pas de FK**, mise à jour explicite

`inscriptions.changed_by`, `membre_blocages.bloque_by`, `signalements.traite_par`,
`membres.validated_by`.

**Les données le confirment** : ces colonnes contiennent des valeurs qui ne sont pas des adresses —
`système`, `pré-inscription`. Et `demandes.demandeur` porte 13 lignes `Import Google Sheet` :
tolérées par `NOT VALID`, mais toute nouvelle ligne devra être une vraie adresse.

## La fonction de renommage

`migrer_email_membre(p_ancien TEXT, p_nouveau TEXT)`, `SECURITY DEFINER`, appelée depuis l'écran
en `/rest/v1/rpc/migrer_email_membre` — le pattern existe déjà dans le projet
([admin.js:605](../../admin.js#L605), [global.js:958](../../global.js#L958)).

Elle doit, dans cet ordre :

1. **vérifier l'appelant** : `is_admin_ou_superadmin()`, sinon lever une erreur ;
2. **refuser** si l'ancienne adresse n'existe pas, si les deux sont identiques, ou si le format de
   la nouvelle n'est pas une adresse ;
3. **refuser si la cible porte des données d'appartenance** (voir « périmètre » ci-dessous), avec
   un message qui nomme la table et le nombre de lignes ;
4. **contrôle d'exhaustivité** (voir ci-dessous) — refuser si une colonne inconnue est apparue ;
5. si la cible existe et est vide : **compléter la fiche cible** depuis l'ancienne (identité,
   adresse postale, préférences de collection ; on garde la trace d'inscription de la cible, plus
   récente), puis `UPDATE membres SET email = p_nouveau` qui **cascade** ;
   si la cible n'existe pas : `UPDATE membres SET email = p_nouveau` directement.
   Cet `UPDATE` — et lui seul — est **entouré du drapeau de renommage** (voir « Traverser les
   triggers pendant le cascade ») ;
6. **retirer le drapeau**, puis mettre à jour les 4 colonnes de trace explicitement — elles
   s'écrivent triggers actifs, comme n'importe quelle autre modification ;
7. **journaliser** le renommage ;
8. **auto-contrôle final** : plus aucune ligne ne doit porter l'ancienne adresse, sinon
   `RAISE EXCEPTION` — la fonction étant une seule instruction, tout est annulé.

~~⚠ Le trigger d'audit des inscriptions se déclenchera-t-il ? **Non** : avec la voie B, on ne fait plus
d'UPDATE sur inscriptions — c'est le CASCADE qui agit, et il n'exécute pas les triggers
utilisateur BEFORE UPDATE. **À vérifier en recette**, c'est un point où je peux me tromper.~~

> **Corrigé le 2026-09-11 — c'était faux.** Un `ON UPDATE CASCADE` est exécuté par Postgres comme un
> véritable `UPDATE` sur la table fille, et **cet UPDATE déclenche les triggers de la table fille**
> comme n'importe quel autre. Vérifié sur Postgres 16 (banc de #64, cas A et B) :
>
> | Cas | Ce qui se passe pendant le cascade |
> |---|---|
> | A — renommage avec JWT d'admin | `trg_enforce_enveloppe_membre_update` s'exécute et **bloque** le renommage |
> | B — même renommage, trigger enveloppes retiré | `trg_inscription_audit` s'exécute et **écrase** `changed_by` (→ l'admin) et `last_changed` (→ aujourd'hui) |
>
> La mention « à vérifier en recette » était la bonne intuition, au mauvais moment : **une
> affirmation dont on doute se vérifie avant de la mettre dans une spec soumise à validation**, pas
> après. Vérifier coûtait trois minutes.
>
> **Conséquence** : la voie B reste la bonne — elle règle la question de l'exhaustivité, qui était
> le fond du problème. Mais le cascade ne dispense pas de s'occuper des triggers : la fonction de
> renommage doit dire comment elle les traverse sans les désactiver pour tout le monde. C'est Q6.

## Traverser les triggers pendant le cascade *(Q6, tranchée le 2026-09-12)*

### Le relevé : cinq triggers, pas deux

Le banc de #64 en avait trouvé deux — parce qu'il n'exerçait que `inscriptions` et `enveloppes`.
Le tour complet des **16 tables cascadées**, fait le 2026-09-12 sur les scripts de migration du
dépôt, en trouve **cinq qui se déclenchent réellement** :

| Table cascadée | Trigger | Se déclenche ? | Effet sur le renommage |
|---|---|---|---|
| `enveloppes` | `trg_enforce_enveloppe_membre_update` | **oui** | **refuse** l'opération |
| `inscriptions` | `trg_inscription_audit` | **oui** | écrase `changed_by` et `last_changed` |
| `demandes` | `trg_demandes_updated_at` | **oui** | pousse `updated_at` sur toutes les demandes du membre |
| `signalements` | `signalements_touch_updated_at_trg` | **oui** | idem |
| `contacts_collecteur` | `trg_contacts_collecteur_updated_at` | **oui** | idem |
| `inscriptions` | `trg_enforce_inscription_statut_paiement` | oui, sans effet | sort dès la 1ʳᵉ ligne : `statut_paiement` ne change pas |
| `inscriptions` | `trg_inscription_scope_invariant` | non | `UPDATE OF nb_normaux, nb_variantes, collecte_id` |
| `inscriptions` | `trg_inscriptions_annule_dettes` | non | `UPDATE OF statut_paiement` + clause `WHEN` |
| `demande_validations` | `trg_demande_validation` | non | `AFTER INSERT` seulement |
| 11 autres tables cascadées | *(aucun trigger)* | — | — |

Les trois `updated_at` ne cassent rien, mais ils **datent d'aujourd'hui un changement que personne
n'a fait** : c'est la même famille de défaut que `changed_by` réécrit — une trace qui ment. Un admin
verrait remonter en tête de liste les demandes d'un membre qui n'a rien touché.

⚠ **Ce relevé vient du dépôt, pas de la base.** Il se confirme avec le script
`scripts/migration-demande-62-4-constat-triggers.sql`, en **lecture seule** : il liste les triggers
d'`UPDATE` des 16 tables et répond `PRET` si aucun ne sort de la liste ci-dessus. Comme les trois
autres scripts de cette demande, il vit sur le poste de Cyril et n'est pas versionné (`scripts/` est
ignoré par git, il contient des adresses de membres).

À jouer avant d'écrire le lot 1 — mais **ce n'est pas un préalable à la validation de l'analyse** :
le garde-fou d'exhaustivité ci-dessous fait échouer bruyamment le renommage si un trigger inconnu
est apparu.

### La décision : un drapeau qui **nomme** le renommage en cours

Des trois pistes de Q6, c'est **a** (drapeau de transaction) qui est retenue, avec un renforcement
qui rend caduque la vérification annoncée le 11/09.

La fonction pose le drapeau autour du seul `UPDATE` qui cascade, et le retire aussitôt :

```sql
PERFORM set_config('app.migration_email', p_ancien || ' > ' || p_nouveau, true);  -- local à la transaction
UPDATE membres SET email = p_nouveau WHERE email = p_ancien;                      -- cascade
PERFORM set_config('app.migration_email', '', true);
```

et chacun des cinq triggers sort en tête, **si et seulement si la ligne qu'il voit est exactement ce
renommage-là et rien d'autre** (ici `enveloppes`, colonne `membre_email`) :

```sql
IF TG_OP = 'UPDATE'
   AND current_setting('app.migration_email', true) = OLD.membre_email || ' > ' || NEW.membre_email
   AND to_jsonb(NEW) - 'membre_email' = to_jsonb(OLD) - 'membre_email'
THEN
    RETURN NEW;
END IF;
```

Trois conditions, chacune pour une raison :

1. `set_config(…, true)` est **local à la transaction** : le drapeau meurt avec elle, il ne peut pas
   fuir d'une requête à l'autre dans un pool de connexions ;
2. le drapeau **nomme le couple d'adresses** : il n'autorise pas « les triggers sont en pause », il
   autorise « cette ligne-ci passe de X à Y » ;
3. `to_jsonb(NEW) - 'colonne' = to_jsonb(OLD) - 'colonne'` dit « **aucune autre colonne n'a bougé** »
   sans écrire la liste des colonnes — une liste qui pourrirait à la première colonne ajoutée,
   exactement ce que cette spec refuse partout ailleurs.

**Le pattern existe déjà dans le projet** : `app.derivation_categorie`, posé par
`recalc_billet_categorie()` et lu par `check_billet_categorie_manuelle()` (demande #16,
[migration-demande-16-1.sql:699](../../scripts/migration-demande-16-1.sql#L699)). Ce n'est pas un
mécanisme nouveau à éprouver, c'en est un second usage.

### Pourquoi pas de contrôle `is_admin_ou_superadmin()` dans les triggers — un piège trouvé le 12/09

Le réflexe serait d'ajouter « …et l'appelant est admin » à la condition de sortie. **Ça casserait le
cas de l'admin qui renomme sa propre adresse** : le cascade s'exécute *après* que la ligne `membres`
a pris la nouvelle adresse, or `is_admin_ou_superadmin()` cherche le JWT (ancienne adresse) dans
`membres` — il ne trouve plus rien et répond `false`. Le renommage serait refusé au milieu de
lui-même.

Le contrôle n'est de toute façon pas à sa place là : **la fonction vérifie déjà l'appelant à
l'étape 1**, avant de poser quoi que ce soit.

> *Conséquence à connaître, pas à corriger : un admin qui renomme sa propre adresse se déconnecte
> de fait — son JWT ne correspond plus à aucun membre jusqu'à ce qu'il se reconnecte avec le nouveau
> compte Google. C'est le comportement attendu pour n'importe quel membre renommé.*

### Ce qu'un drapeau forgé permettrait — et pourquoi ce n'est plus la question

La réserve du 11/09 était : « à vérifier, qu'aucun appelant ne puisse poser ce drapeau lui-même ».
**Cette vérification n'a pas été faite, et elle n'est plus nécessaire** : le drapeau ne porte plus
seul la décision. Si un appelant parvenait malgré tout à le poser, la condition 3 limite ce qu'il y
gagne à : *modifier une ligne qu'il a déjà le droit de modifier, en n'y changeant que la colonne
d'appartenance, et exactement vers l'adresse qu'il a nommée dans le drapeau*. Aucune élévation de
droits — là où la piste **b** aurait ouvert les enveloppes aux admins en permanence.

Pour mémoire : PostgREST n'expose en RPC que les fonctions du schéma `public`, et `set_config`
vit dans `pg_catalog` ; le projet fait déjà ce pari depuis #16. La différence est qu'ici, il ne
porte plus rien.

### Pourquoi pas b ni c

- **b — élargir les règles métier** : le trigger des enveloppes laisserait passer *tous* les
  `UPDATE` d'un admin, pour toujours, bien au-delà du renommage. Un droit permanent pour un besoin
  ponctuel.
- **c — désactivation temporaire** (`DISABLE TRIGGER`) : c'est ce qu'a fait le script manuel du 10/09,
  et c'est acceptable pour un script lancé à la main dans l'éditeur SQL. Depuis du code appelé par
  le navigateur, non : `ALTER TABLE` pose un **verrou exclusif** (tout le site attend), c'est de la
  DDL déclenchée par un clic, et un échec au mauvais endroit laisse un trigger de sécurité
  désactivé — le scénario que `migration-demande-62-1-constat.sql` surveille déjà.

### Ce que ça ajoute au lot 1

Cinq fonctions de trigger à modifier, la même sortie de trois lignes dans chacune, avec le nom de
colonne de la table (`membre_email` pour `enveloppes` et `inscriptions`, `demandeur` pour `demandes`,
`auteur_email` pour `signalements`, `proprietaire_email` pour `contacts_collecteur`). Aucune autre
ligne de ces fonctions ne change.

## Le garde-fou contre le pourrissement

C'est ce qui distingue cette spec d'une liste de plus. Avant d'agir, la fonction interroge
`information_schema` et lève une erreur si elle trouve, dans le schéma `public`, une colonne texte
dont le nom évoque un membre (`%email%`, `demandeur`, `changed_by`, `traite_par`, `bloque_by`,
`validated_by`) qui n'est **ni** couverte par une FK vers `membres.email`, **ni** inscrite dans la
liste explicite des colonnes de trace et des exceptions connues (`contacts_collecteur.email`,
`collecteurs.paypal_email`).

**Une table ajoutée sans y penser fera échouer la migration avec un message qui la nomme**, au lieu
de laisser des lignes derrière en silence. Le coût est d'une vingtaine de lignes de SQL, écrites
une fois. Le bénéfice est que le mode de défaillance passe de « silencieux et découvert des mois
plus tard » à « bruyant et immédiat ».

**Depuis Q6, il couvre aussi les triggers** *(ajouté le 2026-09-12)*. Même requête, même esprit, sur
`pg_trigger` cette fois : un trigger de ligne qui se déclenche sur `UPDATE` d'une des tables
cascadées et qui ne figure pas dans la liste connue fait échouer le renommage en le nommant. C'est
la même faiblesse qui a coûté la reprise du 11/09 — un trigger qu'on n'avait pas vu — traitée par le
même remède. C'est aussi ce que fait le constat
`migration-demande-62-4-constat-triggers.sql`, mais à froid : le garde-fou, lui, est là le jour où
plus personne ne pense à jouer le constat.

⚠ **Q4 tranche les deux d'un coup** : ce sont les deux moitiés du même garde-fou. Si les relecteurs
le jugent trop coûteux, il tombe en entier — et le renommage redevient une opération qui peut
laisser des choses derrière elle en silence.

## Traçabilité

Table `membres_migrations_email` : `ancien_email`, `nouveau_email`, `migre_par`, `migre_at`,
`nb_lignes_deplacees`.

Sans elle, une adresse disparue est inexplicable — et personne ne peut répondre à « où est passée
ma collection ». Quatre colonnes, remplies par la fonction.

## L'écran (Gestion Membres)

Dans la modale d'édition d'un membre ([users.js:489](../../users.js#L489)), où l'adresse est
aujourd'hui affichée en lecture seule ([users.js:503](../../users.js#L503)) : un bouton
**« Changer l'adresse email »**, réservé aux admins.

Il ouvre une confirmation qui **affiche ce qui va être déplacé** (le décompte par table, obtenu de
la même fonction en mode simulation), demande de saisir la nouvelle adresse, et prévient que
l'opération est irréversible. Au retour, message de succès nommant les deux adresses.

**Le décompte avant confirmation n'est pas un ornement** : c'est ce qui permet à l'admin de voir
qu'il s'apprête à déplacer 139 inscriptions, et donc de s'arrêter s'il s'est trompé de personne.

*Ajouté le 14/09* : le bouton « Supprimer » d'un membre qui a des données devient **« Désactiver »**
(avec le décompte de ce qui est conservé), et un membre désactivé affiche **« Réactiver »**. Aucune
notification n'est envoyée au membre lors d'un changement d'adresse (Q3).

## Découpage

| Lot | Contenu | Dépend de |
|---|---|---|
| ~~**0**~~ | ~~**#64** — garde-fou JWT sur la fonction du trigger des enveloppes~~ *(faite le 2026-09-11 — utile à la maintenance, ne débloque pas l'écran)* | — |
| **1** | Migration : FK `ON UPDATE CASCADE NOT VALID` sur les 16 colonnes d'appartenance, table de journal, fonction `migrer_email_membre()` + contrôle d'exhaustivité (colonnes **et** triggers) + sortie de renommage dans les **5 triggers concernés** (Q6, tranchée) | constat des triggers joué |
| **2** | Écran : bouton, simulation, confirmation, ~~message d'erreur de suppression revu~~ **désactivation et réactivation** dans `users.js` (14/09) ; valeur `'desactive'` ajoutée au statut, `is_admin_ou_superadmin()` limitée aux membres actifs, listes de choix d'un membre filtrées | lot 1 |
| **3** *(séparé)* | Arbitrage des 15 adresses orphelines, puis `VALIDATE CONSTRAINT` | indépendant |

Le lot 3 n'est **pas** un prérequis : c'est tout l'intérêt du `NOT VALID`.

## Critères d'acceptation

1. Un admin renomme un membre depuis Gestion Membres ; ses inscriptions, sa collection, ses
   enveloppes, ses dettes et ses contacts le suivent.
2. `changed_by`, `validated_by`, `traite_par`, `bloque_by` suivent également.
3. **Les inscriptions gardent leur auteur et leur date de dernière modification** (`changed_by`,
   `last_changed`) : l'opération ne les écrase pas.
4. Renommer vers une adresse déjà titulaire de données d'appartenance est **refusé**, avec un
   message nommant la table et le nombre de lignes.
5. Renommer vers une adresse existante mais vide (le cas rencontré le 10/09) **fonctionne** et fusionne les fiches.
6. Un non-admin appelant la fonction directement par l'API est **refusé**.
7. Après renommage, plus aucune ligne de la base ne porte l'ancienne adresse (contrôle automatique).
8. Créer une ligne pointant vers un membre inexistant est **refusé** par la base.
9. ~~Supprimer un membre qui a des données est refusé, avec un message lisible qui dit quoi.~~
   *(14/09)* Un membre qui a des données **ne se supprime pas, il se désactive** : il ne peut plus se
   connecter, ses données restent, un admin peut le réactiver. Une suppression directe par l'API
   reste refusée par la base.
10. Le renommage est inscrit dans `membres_migrations_email`.
11. Le membre se reconnecte avec la nouvelle adresse Google et retrouve tout.
12. Mode sombre et téléphone réel pour la modale — c'est ce qui avait rattrapé #53.
13. La date de dernière modification (`updated_at`) des demandes, des signalements et des contacts
    du membre **ne bouge pas** : rien ne doit apparaître comme « modifié aujourd'hui » alors que
    personne n'y a touché.
14. **Hors renommage, les cinq triggers se comportent exactement comme avant.** Un `UPDATE` qui
    change autre chose que la seule colonne d'appartenance, ou qui ne correspond pas au couple
    d'adresses nommé dans le drapeau, reste soumis à la règle habituelle — y compris pendant la
    transaction du renommage.
15. Un trigger ajouté sur une table cascadée sans être déclaré **fait échouer** le renommage avec un
    message qui le nomme (pendant du critère 8 côté colonnes).
16. *(14/09)* Un admin désactivé **perd ses droits d'admin**, y compris sur un appel direct à la base
    avec un jeton encore valide.
17. *(14/09)* Un membre désactivé n'apparaît plus dans les listes où l'on choisit un membre, et
    Gestion Membres permet de le retrouver et de le réactiver.

## Ce que cette spec ne fait pas

- **Fusionner deux comptes qui portent tous les deux des données.** Les trois doublons connus
  (un traité le 2026-09-10, deux restants) ont tout d'un seul côté. Construire l'arbitrage d'un conflit
  qui n'existe pas doublerait le travail. *Confirmé par Cyril le 14/09 : « le besoin urgent, c'est de
  changer l'adresse d'un compte » ; la fusion de deux comptes remplis demanderait de choisir les
  données de l'un, de l'autre ou des deux, et reste hors du périmètre.*
- **Permettre à un membre de changer sa propre adresse.** Opération d'admin.
- **Nettoyer les orphelines existantes** (lot 3, séparé).
- **Toucher à l'adresse PayPal d'un collecteur** (`collecteurs.paypal_email`) : c'est un compte PayPal, il peut légitimement différer
  de l'adresse de connexion.

## Questions ouvertes — à trancher avant le dev

- ~~Q1 — Suppression d'un membre : NO ACTION (refusée quand il reste des données, recommandé) ou
  autre chose ?~~ **Tranchée par Cyril le 14/09 : la suppression d'un membre qui a des données
  devient une désactivation.** NO ACTION reste en base ; voir « La désactivation ».
- ~~Q2 — Qui a le droit ? Tous les admins, ou le superadmin seul ?~~ **Tranchée le 14/09 : tous les
  admins** — `is_admin_ou_superadmin()`, comme le reste de Gestion Membres.
- ~~Q3 — Prévenir le membre ?~~ **Tranchée le 14/09 : non.**
- **Q4 — Le garde-fou d'exhaustivité vaut-il ses 20 lignes ?** Il protège d'une répétition exacte
  de l'incident de 2024. Je le recommande, mais c'est de la complexité en plus dans un projet dont la
  simplicité est une contrainte assumée. *14/09 : Cyril n'en voit pas bien l'intérêt et demande une
  explication — donnée dans la version en clair et en réponse sur la fiche. Toujours ouverte.*
- ~~Q7 — Voie B, voie C, ou B puis C ?~~ **Tranchée par Cyril le 14/09 à 16 h 46 : C.** L'analyse
  est reprise sur cette base. Q4 (le garde-fou d'exhaustivité) et Q6 (les triggers pendant la
  cascade) ne se posent plus pour le renommage.
- **Q5 — les deux définitions d'is_admin().** Elles coexistent dans le dépôt : `migration-4-1-membres.sql`
  (rôle `admin` seul) et `migration-inscription-publique.sql` (`admin` + `superadmin` + actif). À
  vérifier en base laquelle est vivante ; la spec utilise `is_admin_ou_superadmin()`, non ambigu.
- **Q6 — Comment la fonction traverse-t-elle les triggers pendant le cascade ?** *(ajoutée le
  2026-09-11, bloquante — **tranchée le 2026-09-12**, voir « Traverser les triggers pendant le
  cascade » ; elle n'attend rien des relecteurs, elle est laissée ici pour l'historique)*
  ~~Deux~~ **cinq** triggers s'exécutent pendant le renommage : celui des
  enveloppes le **refuse**, celui d'audit des inscriptions **écrase l'historique**, et trois autres
  datent d'aujourd'hui des lignes que personne n'a modifiées *(le compte de deux datait du banc de
  #64, qui n'exerçait que deux tables)*. Trois pistes étaient ouvertes :

  | Piste | Principe | À peser |
  |---|---|---|
  | **a. Drapeau de transaction** | La fonction pose `set_config('app.migration_email', 'on', true)` — local à la transaction — et les deux triggers sortent immédiatement quand il est posé | Le plus ciblé : seul le renommage passe. **À vérifier : qu'aucun appelant ne puisse poser ce drapeau lui-même** (PostgREST n'expose pas `set_config`, mais c'est précisément le genre d'hypothèse qui s'est révélée fausse ici) |
  | **b. Règles métier élargies** | Le trigger enveloppes laisse passer les admins, comme sa fonction sœur ; le trigger d'audit ne réécrit rien quand **seul** `membre_email` change | Chaque changement se défend seul, mais **élargit des droits au-delà du renommage** : un admin pourrait alors modifier n'importe quelle enveloppe |
  | **c. Désactivation temporaire** | La fonction fait `ALTER TABLE … DISABLE TRIGGER` puis `ENABLE`, comme le script manuel | Simple et déjà éprouvé, mais pose un **verrou exclusif** sur les tables (tout le site attend pendant l'opération) et fait de la DDL depuis du code appelé par le navigateur |

  ~~Je penche pour **a**, sous réserve de la vérification indiquée — et elle se fait sur un banc, pas
  en recette.~~

  > **Tranchée le 2026-09-12 : c'est bien a**, mais la vérification annoncée n'a pas eu lieu et n'est
  > plus nécessaire. Le drapeau ne dit plus « les triggers sont en pause » : il **nomme le couple
  > d'adresses** en cours de renommage, et chaque trigger ne sort que si la ligne qu'il voit est
  > exactement ce renommage-là, sans qu'aucune autre colonne n'ait bougé. Un drapeau forgé ne
  > donnerait alors rien de plus que ce que son auteur peut déjà faire. Détail et code dans
  > « Traverser les triggers pendant le cascade ».

## Réalisation

### Relevé de la production, 2026-09-16 (lecture seule)

| Constat | Chiffre |
|---|---|
| Fiches de membres | 109 (108 actives, 1 refusée) |
| Adresses sans fiche | **10**, toutes dans `enveloppes` (23 lignes) |
| Valeurs qui ne sont pas des adresses | 13 demandes « Import Google Sheet », 2 inscriptions « pour 2024 » |
| Commentaires de l'assistant (sans fiche) | 24 |
| Deux fiches actives qui ne diffèrent que par une majuscule | 1 paire (la fiche en majuscule n'a aucune inscription) — sans effet sur la migration, qui compare les adresses exactement comme les règles d'accès |

### Étape 0 — préalables

**Site** (à mettre en ligne en premier) :

| Fichier | Changement |
|---|---|
| `global.js` | `membreSelectionnable(m)` (statut actif) ; « Se connecter en tant que » ne propose que les actifs ; la connexion d'un compte ni actif, ni en attente, ni refusé affiche « Compte désactivé » |
| `login.html` | l'écran « Compte désactivé » |
| `users.js`, `users.html`, `style.css` | Gestion Membres : les fiches désactivées n'apparaissent que sous le filtre « Désactivés », badgées, sans « Supprimer » ni « Promouvoir » ; un refus de suppression par la base dit quelles données bloquent |
| `admin.js`, `mes-collectes.js`, `admin-pre-inscriptions.js`, `collecteurs.js`, `admin-notifications.js` | les listes où l'on choisit un membre (inscrire, réaffecter, liste noire, pré-inscription, collecteur, destinataire d'une annonce) ne proposent plus que les actifs (les annonces gardent aussi les demandes en attente, comme avant). Le nom d'un membre désactivé reste affiché sur ses inscriptions |

**Base** — `scripts/migration-demande-62-e0-{1-constat,2-migration,3-controle}.sql` (non versionnés,
sur le poste de Cyril, comme toutes les migrations) : statut `desactive` autorisé ;
`is_admin_ou_superadmin()` et `is_collecteur()` limitées aux membres actifs (empreintes vérifiées avant
remplacement) ; fiche technique de l'assistant ; dix fiches « Ancien membre » ; suppression des deux
inscriptions « pour 2024 ». Un seul bloc, qui refait les contrôles du constat et se vérifie lui-même.

**Banc** : 27 vérifications — parcours nominal, rejeu (refusé, rien ne change), perte des droits d'un
admin ou d'un collecteur désactivé par le vrai PostgREST, écran « Compte désactivé » (le compte lit sa
propre fiche), et cinq gardes (assistant déjà présent, fonction modifiée, adresse fantôme en plus ou
ailleurs, inscription « pour 2024 » modifiée). Volet site : 17 vérifications dans jsdom sur la base du
banc (Gestion Membres, filtre, compteurs, sélecteurs, message de refus).

### Étape 1 — les numéros

`scripts/migration-demande-62-e1-{1-constat,2-migration,3-controle}.sql`, plus un retour arrière
testé (`-e1-9-retour-arriere.sql`), qui ne se joue que sur décision.

- `membres.id` : `bigint`, identité, unique, **immuable** (trigger `membres_id_immuable`). Numérotation
  initiale par date de validation, puis adresse.
- Une colonne de numéro par table d'appartenance (tableau plus haut), **remplie triggers utilisateur
  suspendus** : l'empreinte des 17 tables, colonnes d'origine, est identique avant et après — auteurs et
  dates d'audit des 5 484 inscriptions compris. Le bloc refuse de démarrer si un trigger est déjà
  désactivé, et d'aboutir s'il en reste un.
- **Un seul trigger de synchronisation, générique**, `synchroniser_membre_id(colonne adresse, colonne
  numéro[, valeur vide])`, posé sur les 16 tables sous le nom `a0_synchroniser_membre_id` : les triggers
  s'exécutant par ordre alphabétique, il passe avant les autres, qui voient une ligne cohérente. Adresse
  seule → il met le numéro ; numéro seul → il met l'adresse ; les deux → ils doivent désigner le même
  membre, sinon refus. Adresse sans fiche → refus clair (`foreign_key_violation`). `SECURITY DEFINER` :
  il doit voir toutes les fiches, quelles que soient les règles de lecture de `membres`.
- Clés étrangères, dix unicités doublées sur le numéro (pour que les fusions `on_conflict` du site
  puissent passer au numéro), douze index.

**Banc** : 53 vérifications, jouées deux fois — dont, par le vrai PostgREST et les règles de la
production : inscription et déclaration de paiement d'un membre (l'audit nomme toujours le membre),
usurpations refusées (inscrire un autre, adresse et numéro contradictoires, réaffecter par le numéro),
fusions de la collection et des pré-inscriptions par adresse **et** par numéro, enveloppe créée par un
collecteur puis reçue par le membre, réaffectation par un admin (le numéro suit), inscription par le
numéro seul (la règle d'accès, écrite sur l'adresse, passe : elle s'évalue après le trigger), collecteur
relié puis délié, annonces ciblée et diffusée, demande, commentaire (écran et assistant), validation,
signalement, contact, **dettes et annonces privées créées par un changement de prix**, inscription
publique d'un nouveau membre, suppression refusée d'un membre qui a des données, suppression acceptée
d'une fiche vide, retour arrière puis nouvelle migration.

**Mesuré** : la migration prend moins d'une seconde sur le volume de la production.

### Étape 2 — les règles d'accès par le numéro *(écrite le 2026-09-17)*

`scripts/migration-demande-62-e2-{1-constat,2-migration,3-controle}.sql`, plus un retour arrière
généré depuis l'export du 17/09 (`-e2-9-retour-arriere.sql` : textes d'origine embarqués en base64,
restaurés à l'octet près).

- La fonction `mon_membre_id()` (`STABLE`, `SECURITY DEFINER`, `search_path` fixé) rend le numéro de la fiche
  dont l'adresse est celle du jeton, **si elle est active**, sinon rien. Les règles l'appellent sous
  la forme `(SELECT mon_membre_id())`, calculée une fois par requête. `membre_bloque_inscription(id)`
  remplace `is_bloque_inscription(adresse)` dans la règle d'inscription (l'ancienne reste jusqu'à
  l'étape 4).
- **Les 50 règles** qui comparaient une adresse à celle du jeton (liste exacte : le script) comparent
  le numéro ; celles qui cherchaient un admin dans `membres` par l'adresse appellent
  `is_admin_ou_superadmin()`. Mêmes noms, mêmes commandes. `notifications_select` garde sa forme :
  une annonce qui a un destinataire (numéro **ou** adresse, tant que les deux coexistent) n'est
  visible que par lui. Les règles de `membres` ne changent pas : c'est la table de correspondance.
- **Quatre fonctions** : `is_collecteur()`, `marquer_signalement_vu()` (droits d'exécution
  conservés), et les triggers `enforce_enveloppe_membre_update()` (le numéro rejoint les champs que
  le destinataire ne peut pas modifier) et `enforce_inscription_statut_paiement()`.
- **Garde** : empreinte des 50 règles et des 4 fonctions identique à l'export du 17/09 (calculée en
  ordre binaire, `COLLATE "C"`, pour ne pas dépendre du classement de la base).

**Changements voulus** (et seuls changements) :

| Qui | Avant | Après |
|---|---|---|
| Compte désactivé, refusé ou en attente | lisait ses propres lignes par appel direct ; un admin ou un collecteur désactivé gardait ses droits sur les règles qui testaient le rôle sans le statut | plus rien |
| Tout compte, même en attente ou refusé | lisait **toutes** les pré-inscriptions (`inscriptions_auto`, `inscriptions_auto_pays`) et les frais de port | pré-inscriptions : leur membre et les admins seulement (seuls les écrans d'admin les lisent) ; frais de port : membres actifs |
| Jeton dont l'adresse diffère de la fiche par la casse | reconnu par les rares règles en `lower()` | non reconnu — comme partout ailleurs (`is_whitelisted()` compare exactement : un tel compte n'entre pas sur le site) |

**Conservé tel quel, à signaler** : dans `enforce_inscription_statut_paiement()`, seul le rôle
`admin` a la main sur les paiements — un **superadmin** qui n'est pas le collecteur de la collecte
ne peut pas confirmer un paiement (le banc le vérifie). Antérieur à #62, non corrigé ici. De même,
une annonce diffusée à tous (`cible = 'tous'`, sans destinataire) reste lisible avec la seule clé
publique.

**Jouée en production le 2026-09-18** (constat, migration, contrôle : tout vert). Le site, qui écrit
encore des adresses, continue de fonctionner : ce sont les triggers de l'étape 1 qui remplissent le
numéro avant que la règle ne le lise.

**Banc** : une **photo des droits** (`scripts/banc-62/photo-droits.mjs`) essaie, pour 16 profils
(superadmin, admin, collecteur, membres dans diverses situations, admin et collecteur désactivés,
ancien membre, assistant, compte refusé, demande en attente, clé publique seule, compte inconnu…) et
un échantillon de lignes de chacune des 16 tables concernées, la **lecture, la modification, la
suppression et la création** avec les vraies règles ; et, pour les 121 fiches, le nombre de lignes
lisibles par table. Photo avant, migration, photo après : **3 897 essais, 0 anomalie** — chaque écart
tombe dans les changements voulus ci-dessus, aucun droit n'est gagné. Puis les parcours du site
(inscription et paiement, confirmation par le collecteur et par l'admin, membre bloqué, enveloppes,
pré-inscriptions, signalement, annonces privées et aux collecteurs, commentaires et validations,
dettes, collection, contacts), le rejeu (refusé), le **retour arrière (droits identiques à l'avant,
vérifiés par une troisième photo)** et une nouvelle migration.

### Reste à faire

| Étape | État |
|---|---|
| 0 — site | **en ligne** le 16/09 (`333b89b`, cache v312) |
| 0 — base | **jouée le 17/09** par Cyril : constat 6 PRET + 1 OK, contrôle 8/8 ; 11 fiches désactivées vérifiées par l'API |
| 1 — base | **jouée le 17/09** par Cyril : contrôle 20/20 — 120 numéros, 0 ligne discordante ; les nouvelles colonnes sont servies par l'API |
| 2 — règles d'accès | **jouée le 18/09** par Cyril : constat OK/PRET, contrôle 8/8 ; `mon_membre_id()` vérifiée par l'API |
| 3 — le site, écran par écran | à écrire |
| 4 — retirer les adresses recopiées | à écrire |
| 5 — l'écran (changer l'adresse, désactiver, réactiver) | à écrire |

*Commits : voir l'index des demandes.*
