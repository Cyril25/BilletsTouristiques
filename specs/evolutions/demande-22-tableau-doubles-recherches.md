# Demande #22 — Doubles et recherches : le tableau d'affichage

- **Épic :** chantier structurant (complexité **L**)
  ⚠ Ré-estimée **M** au cadrage du 09/09, **remise à L le 10/09** : le tableau d'affichage reste une table neuve, un écran membre entier et un moteur de rapprochement.
- **Demande :** #22 de la table `demandes` de production — Cyril, 2026-07-16, priorité *normale*.
- **Concerne :** tous les membres (109 whitelistés, **52 actifs** sur 30 jours).
- **Statut :** ⚠ **ANALYSE ROUVERTE le 2026-09-10**, sur commentaire de Cyril : le périmètre
  décrit ci-dessous est **faux sur un point central**. Voir la section « Analyse rouverte ».
  Demande repassée en **Prêt à analyser**. Aucun développement commencé.
- **Origine :** cadrage commun `demande-22-et-1-cadrage-doubles-et-vente.md`, 7 questions
  tranchées le **2026-09-09**. #1 a désormais sa propre spec : les deux demandes ne partagent
  plus de modèle, et **#22 ne touche pas à l'argent**.

## ⚠ Analyse ROUVERTE le 2026-09-10 — ma question Q1 était mal posée

Commentaire de Cyril sur cette spec, section « Ce que cette spec ne fait pas » :

> Je pense qu'on s'est mal compris, et il est nécessaire de reprendre l'analyse afin de creuser le
> sujet. On ne veut en effet pas une « usine à gaz », mais la partie [« pas de vente entre membres,
> pas d'historique de transactions »] est totalement fausse. Nous souhaitons permettre un
> **historique des transactions**, que ce soit pour un **échange** ou pour une **vente**, mais
> également la possibilité d'une **dette de membre à membre**, qu'un membre puisse **valider le
> fait qu'un autre membre lui a payé** la somme qu'il lui doit. C'est donc bien quelque chose de
> lourd, il faut adapter et analyser tout cela avant de se lancer.

**L'erreur est dans ma question, pas dans sa réponse.** Q1 opposait « place de marché » et
« tableau d'affichage » — un binaire qui empaquetait deux choses sans rapport :

| Ce que le binaire mélangeait | Voulu ? |
|---|---|
| **Tenir le compte** de ce qui est dû entre deux membres, et permettre au créancier d'accuser réception | **OUI** |
| Garder un **historique** des ventes et des échanges | **OUI** |
| **Encaisser** le paiement (PayPal, etc.) | non |
| **Suivre l'expédition** entre deux membres | *à trancher* |
| **Arbitrer** un litige | non |

Répondre « tableau d'affichage » à cette question voulait dire « pas d'usine à gaz » ; je l'ai lu
« pas d'argent du tout ». **Une question binaire sur un sujet qui ne l'est pas produit une réponse
juste et une conclusion fausse.** À retenir pour les prochains cadrages : proposer les briques une
par une plutôt qu'un forfait.

### Ce qui rentre dans le périmètre

1. **Une dette de membre à membre**, née d'une vente ou d'un échange.
2. **La validation du règlement par le créancier** — celui à qui l'argent est dû confirme l'avoir reçu.
3. **Un historique des transactions**, ventes **et** échanges.

Le **troc revient donc dans le périmètre** : la réponse Q7 (« vendre suffit ») tombe avec le reste.

### La bonne nouvelle : le mécanisme existe déjà, et il n'a pas besoin d'arbitre

Le cadrage du 09/09 écartait la place de marché sur un argument qui se révèle faux :
*« tout le modèle de paiement repose sur une relation asymétrique — le membre déclare, le
collecteur valide. Entre deux pairs, il n'y a personne pour valider. »*

**Il y a quelqu'un : le créancier.** Le motif se transpose exactement — *le débiteur déclare, le
créancier valide* — et c'est mot pour mot ce que demande Cyril. Le rôle vérifié de collecteur
n'était pas nécessaire à la mécanique : il se trouvait simplement être toujours le créancier.

Et **aucun arbitrage n'est requis** : si le créancier ne confirme pas, la dette **reste ouverte**.
L'application *enregistre*, elle ne *juge pas*. C'est ce qui permet de tenir le compte sans que les
6 admins deviennent arbitres — la crainte qui avait fait écarter l'option.

### Ce qui bloque techniquement, et qui est le vrai travail

`dettes` (#44) porte la primitive « un montant dû entre deux parties, réglé par déclaration puis
validation ». Mais elle est **ancrée sur le collecteur** :

- `collecteur_alias TEXT NOT NULL` — un membre lambda n'a pas d'alias ;
- `collecte_id UUID NOT NULL REFERENCES collectes(id)` — une vente entre membres ne dépend d'aucune collecte ;
- la policy `dettes_select` résout le créancier par `SELECT alias FROM collecteurs WHERE email_membre = …`.

Deux voies, à trancher :

| | Voie | Ce que ça coûte | Ce que ça risque |
|---|---|---|---|
| **A** | **Généraliser `dettes`** : `creancier_email`, `collecteur_alias` et `collecte_id` rendus nullables, RLS élargie | Une seule table pour tout l'argent de l'appli, un seul parcours déclarer/valider, un seul écran de solde | Toucher à une table **déjà en production** et qui porte les écarts de prix de #44 ; chaque requête existante doit être relue |
| **B** | **Une table `transactions` à part** pour le membre ↔ membre | `dettes` n'est pas touchée, aucun risque de régression sur #44 | Deux mécanismes d'argent parallèles à maintenir, deux écrans de solde, et la question « où est mon total ? » pour le membre |

**Aucune recommandation ferme à ce stade** : le choix dépend de ce qu'on décide pour l'expédition
et pour l'historique, ci-dessous. C'est précisément ce que « creuser le sujet » veut dire.

### Les questions rouvertes

| | Question | Pourquoi elle bloque |
|---|---|---|
| **R1** | **Le troc : comment se trace-t-il ?** Un échange n'a pas de montant. Deux remises à confirmer de part et d'autre, chacun accusant réception de ce qu'il a reçu ? | Détermine si l'objet central est « une dette » ou « une transaction » dont la dette n'est qu'un cas. Change le modèle. |
| **R2** | **L'appli suit-elle l'expédition entre membres ?** Aujourd'hui l'envoi passe par `enveloppes`, ancrées sur `collecteurs.alias`. | Si oui, c'est un second chantier de même ampleur que la dette. Si non, l'historique dit « vendu », pas « reçu ». |
| **R3** | **Qui crée la dette : le vendeur l'inscrit, ou l'acheteur la reconnaît ?** | Précédent posé par #1 (Q5) : aucun montant n'apparaît chez un membre sans qu'il l'ait accepté. La même règle doit-elle valoir ici ? |
| **R4** | **Une dette qui traîne : l'appli relance, ou reste passive ?** | Une relance automatique entre deux membres est un message que le groupe envoie en leur nom. |
| **R5** | **L'historique est-il visible des seuls intéressés, ou de tous ?** | `inscriptions_read_whitelisted` laisse déjà tout membre lire toutes les inscriptions ; refaire ça sur de l'argent entre pairs serait plus gênant. |
| **R6** | **La réputation** (« ce membre honore ses engagements ») **est-elle souhaitée ?** | Écartée le 09/09 comme corollaire d'un choix qui vient de tomber — donc à reposer, pas à supposer. |

### Conséquence sur #1

Le cadrage du 09/09 concluait que **#1 et #22 ne sont pas deux tranches du même chantier**, sur
l'argument central que *« #1 a de l'argent, #22 n'en a pas »*. **Cet argument est mort.** Les deux
demandes ont désormais besoin d'une même primitive : *un montant dû entre deux personnes, réglé par
déclaration puis validation*. La séparation reste peut-être la bonne décision — mais elle doit être
**re-justifiée**, pas héritée. C'est la voie A/B ci-dessus qui la tranchera.

## Contexte (demande)

> Gestion des doubles avec possibilité de vendre et échanger. Attention car ça doit fonctionner
> autant pour un collecteur (reliquat de collecte), qu'un membre qui a des billets en double.

## Les décisions du cadrage qui commandent cette spec

| | Décision du 2026-09-09 |
|---|---|
| **Q1** | **Tableau d'affichage, pas place de marché.** L'application publie « j'ai en double » et « je recherche ». Elle **ne gère ni l'argent, ni l'envoi, ni le litige** entre deux membres : la transaction se fait de gré à gré, comme aujourd'hui. |
| **Q2** | Sans objet — sans transaction, pas d'arbitrage à inventer, et les 6 admins bénévoles ne deviennent pas arbitres. |
| **Q6** | **Deux lots.** Ouvrir « Ma collection » aux membres est un lot **séparé** ; #22 démarre en saisie manuelle et ne l'attend pas. |
| **Q7** | **Le troc sort du périmètre.** Un échange n'a pas de montant, il est bilatéral et simultané — mécanisme entièrement neuf, sans réemploi. « Vendre » est ce qui compte. |

**Ce que ces décisions font gagner.** #22 était estimée **L** parce qu'elle supposait un solde
membre ↔ membre, un casier membre ↔ membre et un mécanisme de litige — trois choses qui n'existent
nulle part dans l'application, dont le modèle de paiement repose entièrement sur une relation
asymétrique *le membre déclare, le collecteur valide*. En retirant la transaction et le troc, il
ne reste que de la **publication et de la mise en relation**.

⚠ **Ce qui l'allège beaucoup ne la fait pas descendre à M pour autant.** C'était la conclusion du
cadrage, corrigée le 10/09 : ce qui reste — une table neuve, un écran membre entier, un moteur de
rapprochement — est un chantier, pas un point qu'on attrape au fil d'une série de petites demandes.
Et la complexité n'est pas qu'une estimation de taille : **c'est elle qui, une fois la demande
passée en « Prêt à dev », l'empêche d'être ramassée par un « traite 2 demandes »**.

## Pourquoi ce périmètre livre l'essentiel

Le cadrage avait mesuré que **l'application n'a aucun avantage sur Facebook pour la mise en
relation** : le groupe est plus grand que les 109 membres whitelistés. Son avantage est ailleurs —
elle connaît le catalogue des 5 507 billets et sait qui possède quoi.

D'où le seul mécanisme que Facebook ne sait pas faire, et qui est le cœur de cette spec :

> **Le rapprochement automatique.** Quand ce que A publie en double figure dans ce que B recherche,
> les deux le voient — sans que personne ait à parcourir un fil de discussion.

C'est ça, la valeur. Le reste (publier une liste, la consulter) n'est que le support.

## Le modèle de données

Une table, `annonces`, et rien d'autre :

| Colonne | Rôle |
|---|---|
| `id` | clé |
| `membre_email` | l'auteur |
| `type` | `'double'` ou `'recherche'` — `CHECK` sur les deux valeurs |
| `billet_id` | référence au catalogue, **nullable** |
| `libelle_libre` | texte, pour ce qui n'est pas au catalogue (`billet_id` NULL) |
| `version` | `normal` / `variante` / indifférent — le projet distingue les deux partout |
| `quantite` | pour un double ; 1 par défaut |
| `commentaire` | état du billet, contraintes, « échange contre… » — texte libre |
| `actif` | l'annonce se retire sans se supprimer |
| `created_at` / `updated_at` | |

**Contrainte à respecter :** `billet_id` nullable **et** `libelle_libre`, parce qu'un membre peut
avoir un double d'un billet absent du catalogue. Un `CHECK` impose qu'au moins l'un des deux soit
renseigné.

### RLS — sur le patron du projet, pas un nouveau

- **SELECT** : tout membre whitelisté lit toutes les annonces actives. C'est le principe même d'un
  tableau d'affichage. *(À noter : c'est le même patron que `inscriptions_read_whitelisted`, avec
  cette différence que la publication est ici volontaire et publique par nature — il n'y a rien à
  cloisonner.)*
- **INSERT / UPDATE / DELETE** : uniquement ses propres annonces
  (`lower(membre_email) = lower(auth.jwt() ->> 'email')`), plus les admins.
- ⚠ **Jamais `TO authenticated`** — le JWT Firebase arrive en rôle `anon`. Et
  `is_admin_ou_superadmin()`, pas `is_admin()`.

## Les écrans

### Un écran nouveau : `annonces.html`

Deux onglets, **« Les doubles »** et **« Les recherches »**, plus **« Mes annonces »**.

- Recherche et filtres réutilisant ceux du catalogue (pays, millésime, référence).
- Chaque ligne : le billet (visuel du catalogue quand `billet_id` est renseigné), le membre, son
  commentaire.
- **Publier une annonce** : depuis le catalogue (« j'ai ce billet en double » sur la fiche) ou en
  saisie libre depuis l'écran.

### Le rapprochement

Un bandeau en haut de « Mes annonces » : *« 3 membres recherchent un billet que vous avez en
double »* et *« 2 membres proposent un billet que vous recherchez »*. Calculé sur `billet_id` —
c'est pour ça que la référence au catalogue vaut mieux que le texte libre, et l'écran doit y
inciter à la saisie.

### La prise de contact — sans exposer d'adresse e-mail

**Ne pas afficher l'e-mail des membres.** Le bouton « Ça m'intéresse » envoie une **notification
privée** à l'auteur de l'annonce : `cible_email` renseigné, rendue invisible aux autres membres
(admins compris) par la policy de **#33**. Le mécanisme existe déjà, il est éprouvé, et il évite
d'ouvrir un annuaire d'adresses là où la demande ne le réclame pas.

L'auteur répond ensuite comme il veut — Facebook, message privé. **L'application s'arrête là :
c'est exactement la décision Q1.**

## Le lot séparé : ouvrir « Ma collection » aux membres

Décidé en Q6, **livrable indépendamment et avant** — c'est petit :

- `ma-collection.html:16` porte `data-require-admin="true"` → à retirer ;
- `menu.html:30` classe le lien en `admin-only` → à retirer ;
- **vérifier la RLS de `collection`** avant d'ouvrir : la page n'a jamais servi qu'à des admins,
  ses policies n'ont jamais été éprouvées par 102 membres. C'est le seul vrai travail du lot.
- Rappel de l'état mesuré le 2026-09-07 : **873 lignes, dont 772 `pas_interesse`** posés par le
  moteur de pré-inscription de #16, **97 possessions réelles toutes du compte de Cyril**, et
  **`nb_doubles` = 0 partout depuis mars**.

Une fois les deux lots livrés, ils se rejoignent : « Ma collection » peut proposer *« publier mes
doubles comme annonces »*, et `nb_doubles` prend enfin un sens. **Mais #22 ne l'attend pas** — sans
quoi la demande dépendrait d'une adoption qu'on ne maîtrise pas, sur 5 507 billets.

## Critères d'acceptation

1. Un membre whitelisté publie un double ou une recherche, avec ou sans billet du catalogue.
2. Tous les membres whitelistés voient les annonces actives ; **personne ne peut modifier ou
   supprimer celle d'un autre**, y compris par appel direct à l'API.
3. Un membre retire son annonce (`actif = false`) sans la perdre, et la republie.
4. Le rapprochement signale à un membre qu'un autre recherche ce qu'il a en double, et l'inverse.
5. « Ça m'intéresse » envoie une notification **privée** à l'auteur — invisible aux autres membres
   et aux admins.
6. **Aucune adresse e-mail de membre n'est affichée** nulle part dans l'écran.
7. **Aucun montant, aucun paiement, aucune enveloppe** n'apparaît dans le parcours : l'appli ne
   promet rien qu'elle ne puisse tenir.
8. Lot séparé : un membre non-admin atteint « Ma collection » et n'y voit que **sa** collection.

## Ce que cette spec ne fait pas

- ~~**Pas de troc modélisé** (Q7).~~ ⚠ **FAUX — corrigé le 2026-09-10** : l'historique doit
  couvrir les échanges autant que les ventes. Reste à décider **comment** se trace un troc, qui
  n'a pas de montant (question R1).
- ~~**Pas de vente entre membres** : ni prix, ni paiement, ni litige.~~
  ~~**Pas de réputation, pas d'historique de transactions.**~~
  ⚠ **FAUX — corrigé le 2026-09-10.** La dette de membre à membre, sa validation par le créancier
  et l'historique des transactions (ventes **et** échanges) sont **dans le périmètre**. Restent
  hors périmètre : **encaisser** un paiement, et **arbitrer** un litige — l'appli enregistre, elle
  ne juge pas. Le suivi d'expédition est **à trancher** (question R2).
- **Pas de dépendance à `collection.nb_doubles`** dans ce lot.

## Réalisation

*(à compléter après dev : fichiers touchés + commit)*

---

*Spec du 2026-09-09, issue du cadrage commun #22/#1. Aucune ligne de code écrite : la demande est
en analyse jusqu'à validation explicite de Cyril.*
