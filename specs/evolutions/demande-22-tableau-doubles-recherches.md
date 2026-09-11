# Demande #22 — Doubles, ventes et échanges entre membres

- **Épic :** chantier structurant (complexité **L**)
- **Demande :** #22 de la table `demandes` de production — Cyril, 2026-07-16, priorité *normale*.
- **Concerne :** tous les membres (**110** whitelistés, dont 6 admins et 1 superadmin).
- **Statut :** **analyse reprise une deuxième fois le 2026-09-11**, après la remarque de
  Jean-Philippe (admin) sur le parcours. Demande repassée en **Prêt à analyser**. Trois décisions
  prises avec Cyril le jour même ; **une question posée à Jean-Philippe bloque encore** (O4,
  l'enveloppe groupée). **Aucun développement commencé.**
- **Historique de ce document :**
  - 09/09 — « tableau d'affichage sans argent ». **Faux** (remarque de Cyril du 10/09), voir
    « Pourquoi la première analyse s'est trompée ».
  - 10/09 — réécriture : une transaction a deux côtés, celui qui reçoit confirme.
  - 11/09 — remarque de Jean-Philippe : plusieurs billets par côté, paiement avant envoi, envoi
    groupé confirmé à l'enveloppe. Voir « Ce que la remarque de Jean-Philippe change ».

  Les passages invalidés sont **barrés et datés**, pas effacés. Le
  [cadrage commun](demande-22-et-1-cadrage-doubles-et-vente.md) garde la trace du raisonnement
  d'origine, avec son avertissement.

## Contexte (demande)

> Gestion des doubles avec possibilité de vendre et échanger. Attention car ça doit fonctionner
> autant pour un collecteur (reliquat de collecte), qu'un membre qui a des billets en double.

La précision de Cyril du 2026-09-10, qui a rouvert l'analyse :

> Nous souhaitons permettre un **historique des transactions**, que ce soit pour un **échange** ou
> pour une **vente**, mais également la possibilité d'une **dette de membre à membre**, qu'un
> membre puisse **valider le fait qu'un autre membre lui a payé** la somme qu'il lui doit.

Et la remarque de Jean-Philippe du 2026-09-11, sur la version en clair (« premier point à
modifier »), qui réécrit le parcours :

> Marie a un billet en double qu'elle met dans l'application **soit contre un billet soit contre de
> l'argent**. Jean-Philippe le cherche. Ils se sont mis d'accord sur le prix ou contre l'échange
> d'**un ou plusieurs billets** de la collection de Jean-Philippe. […] **JP indique qu'il a payé.**
> Quand l'argent arrive, Marie confirme l'avoir reçu. **Marie indique qu'elle a posté le billet
> avec d'autres billets si elle a d'autres billets pour JP.** Quand il arrive, **JP confirme avoir
> reçu l'enveloppe.**

## Pourquoi la première analyse s'est trompée

La question Q1 du cadrage opposait « place de marché » et « tableau d'affichage ». **Ce binaire
empaquetait deux choses sans rapport :**

| Ce que la question mélangeait | Voulu |
|---|---|
| Tenir le compte de ce qui est dû entre deux membres, et permettre au créancier d'accuser réception | **oui** |
| Garder un historique des ventes **et** des échanges | **oui** |
| Encaisser le paiement (PayPal…) | non |
| Arbitrer un litige | non |

Répondre « tableau d'affichage » voulait dire « pas d'usine à gaz » ; l'analyse l'a lu « pas
d'argent du tout ». **Une question binaire sur un sujet qui ne l'est pas produit une réponse juste
et une conclusion fausse** — et l'erreur est invisible, puisque la réponse a bien été donnée.

À retenir pour les cadrages suivants : **proposer les briques une par une, jamais un forfait.**

## Ce que la remarque de Jean-Philippe change (2026-09-11)

| Ce qu'il écrit | Ce que ça change | Sort de l'analyse du 10/09 |
|---|---|---|
| « contre l'échange d'un ou plusieurs billets » | Un côté peut porter **plusieurs billets différents** | ~~Pas de table de côtés séparée : le besoin est de 0 ou 1 remise par côté.~~ **Tombé** — il faut des lignes (§ 2) |
| « JP indique qu'il a payé » **avant** « Marie indique qu'elle a posté » | L'ordre habituel est **payer, puis envoyer** — l'inverse de l'exemple du 10/09 | Rien ne tombe : le modèle n'imposait aucun ordre. **Décidé le 11/09 : on ne l'impose pas non plus** |
| « avec d'autres billets si elle a d'autres billets pour JP » ; « JP confirme avoir reçu l'enveloppe » | Un **envoi** regroupe plusieurs billets, et la réception se confirme **une fois, pour l'enveloppe entière** | ~~Pas de machinerie d'enveloppes entre membres : un simple remis / reçu suffit.~~ **Tombé** (§ 3) |
| « qu'elle met dans l'application soit contre un billet soit contre de l'argent » | Le parcours commence par **l'annonce**, et l'annonce dit **quelle contrepartie** est acceptée | Le découpage **est maintenu** (décision du 11/09) ; l'annonce du lot 2 gagne un champ « contrepartie » |

**Ce qu'il a gardé tel quel** dans sa réécriture : un seul total dans le menu ; la transaction
qui reste ouverte si personne ne confirme ; « l'application ne relance pas, n'accuse personne et ne
ferme rien d'office » ; le compteur de transactions conclues. Lu comme un accord — **à confirmer**,
sa remarque se présentant comme un « premier point ».

**La mesure qui éclaire le point « enveloppe »** : dans les collectes, c'est déjà **le membre qui
confirme la réception de l'enveloppe entière** (`confirmerReception()` dans `mes-inscriptions.js`),
et **143** des 621 enveloppes sont à l'état « reçue ». Jean-Philippe transpose un geste que les
membres pratiquent déjà — raison de plus pour le reprendre tel quel plutôt que d'en inventer un.

## L'état du terrain

| Mesure | Valeur | Ce que ça implique |
|---|---|---|
| Lignes dans `dettes` | **0** (remesuré le 11/09) | La table de #44 est toujours vide |
| Requêtes sur `dettes` dans le front | **7** (global.js ×1, mes-collectes.js ×4, mes-inscriptions.js ×2) | Les requêtes tiennent ; **l'affichage de mes-inscriptions, non** — voir § 1 |
| `collection` | 877 lignes, **17 membres** (10/09) | dont **776** `pas_interesse` posés par le moteur de #16 |
| … dont `nb_doubles > 0` | **0** (remesuré le 11/09) | Le registre des doubles **n'existe toujours pas** |
| … possession déclarée | **1 membre** (remesuré le 11/09) | Le compte de Cyril |
| Membres | **110** (103 + 6 admins + 1 superadmin) | |
| `enveloppes` | **621** (11/09) : 266 en cours, 71 expédiées, 1 distribuée, 143 reçues, 140 annulées | La machinerie d'envoi est réelle — mais **ancrée sur l'alias du collecteur** (`collecteurs.alias`) |
| Collecteurs | **85**, dont **20** rattachés à un compte membre (14 non masqués) — chiffre précisé le 11/09 | |

~~**Le fait à retenir : dettes est vide.** C'est maintenant, et seulement maintenant, que la
généraliser est gratuit. Chaque changement de prix de collecte y créera des lignes.~~
*Corrigé le 11/09 : surestimé. Les modifications prévues au § 1 — une colonne ajoutée vide, deux
colonnes rendues facultatives, une contrainte que les lignes de #44 respectent d'office — ne
réécrivent aucune donnée : elles coûteront la même chose quand la table aura des lignes. Qu'elle
soit vide reste confortable pour tester, pas décisif. La conséquence sur l'ordre des travaux
(« #1 attend le lot 1 de #22 ») est à rediscuter — question O5.*

## Le constat qui structure tout : une vente et un échange sont le même objet

La première analyse traitait le troc comme un mécanisme à part, « qui ne se modélise pas ». C'est
faux dès qu'on le regarde par le bon bout :

> Une transaction a **deux côtés**. Chaque partie remet quelque chose — **un ou plusieurs billets,
> une somme, ou les deux** — et **celle qui reçoit confirme l'avoir reçu.**
>
> - **Vente** : A remet des billets, B remet de l'argent.
> - **Échange** : A remet des billets, B remet des billets.
> - **Échange avec complément** : A remet un billet, B remet deux billets et 2 €.
> - **Don** : un seul côté est rempli.

Et **une dette n'est rien d'autre que le côté « argent » pas encore confirmé.**

Le troc cesse d'être un cas particulier : c'est une transaction dont aucun côté n'est de l'argent.
Il n'y a **pas de mécanisme neuf à inventer** pour lui. La remarque du 11/09 ne remet pas ce
constat en cause, elle l'élargit : un côté n'est plus « une remise » mais **une liste**.

### Le rôle de collecteur n'était pas nécessaire — seulement commode

Le cadrage écartait la place de marché sur cet argument :

> *« Tout le modèle de paiement repose sur une relation asymétrique : le membre déclare, le
> collecteur valide. Entre deux pairs, il n'y a personne pour valider. »*

**Il y a quelqu'un : le créancier.** Le motif se transpose mot pour mot — *celui qui reçoit
confirme*. Le rôle vérifié de collecteur n'entrait pas dans la mécanique ; il se trouvait
simplement être toujours celui qui recevait l'argent.

### Et aucun arbitrage n'est nécessaire

Si le destinataire ne confirme pas, **la transaction reste ouverte**, visible des deux parties.
L'application **enregistre, elle ne juge pas**. C'est ce qui permet de tenir les comptes sans que
les 6 admins bénévoles deviennent arbitres de fait — la crainte qui avait fait écarter l'option.

## Les décisions

| | Date | Décision |
|---|---|---|
| **Confirmation** | 10/09 | **Chaque côté se confirme** : celui qui reçoit confirme. Une transaction est **close** quand tout ce qu'elle porte l'est. C'est ce qui fait qu'un troc fonctionne exactement comme une vente. |
| **Visibilité** | 10/09 | **Détail privé** aux deux parties (et aux admins), **plus un compteur public** « N transactions conclues » par membre. Réputation **factuelle**, sans note ni avis. |
| **Découpage** | 10/09, **confirmé le 11/09** | **Les transactions d'abord.** Le lot 1 enregistre un accord conclu ailleurs (Facebook, message) ; publier son double arrive au lot 2, avec le rapprochement. Maintenu malgré le parcours de Jean-Philippe, qui commence par l'annonce. |
| **Somme du menu** | 10/09 | **Un seul total.** Ce que je dois à un collecteur et ce que je dois à un membre s'additionnent. |
| **Modèle de dette** | 10/09 | **Voie A — généraliser la table des dettes.** Deux tables d'argent en parallèle coûteraient plus cher, et le membre n'aurait plus un seul endroit où lire ce qu'il doit. |
| **Plusieurs billets** | 11/09 | Un côté porte **un ou plusieurs billets**, chacun avec sa quantité et sa version. |
| **Complément** | 11/09 | Un échange **peut être complété d'une somme**. Coût nul dans le modèle : la somme devient une dette, comme dans une vente. |
| **Ordre** | 11/09 | **Payer puis envoyer** est l'ordre présenté par l'écran, **jamais imposé**. Un vendeur qui fait confiance et envoie d'abord n'est pas bloqué ; dans un échange, les deux envoient en même temps. |
| **Envoi groupé** | 11/09 | Celui qui doit des billets les regroupe dans **un envoi** ; le destinataire **confirme l'enveloppe entière**, une fois. D'où viennent les « autres billets » : **question O4, posée à Jean-Philippe**. |

## Le modèle de données

**Toutes les colonnes d'adresse créées par ce lot** (`dettes.creancier_email`,
`transactions.membre_a` / `membre_b`, `envois.expediteur_email` / `destinataire_email`) sont
déclarées **dès leur création** en clé étrangère vers `membres.email`, `ON UPDATE CASCADE` —
aligné sur la recommandation de #62, pour ne pas allonger la liste des colonnes d'email en texte
libre que personne ne rattrape au changement d'adresse. Le comportement à la suppression d'un
membre suit ce que #62 décidera.

### 1. `dettes` se généralise

Aujourd'hui la table suppose partout un collecteur en face du membre :

```sql
collecteur_alias TEXT NOT NULL,
collecte_id      UUID NOT NULL REFERENCES collectes(id)
```

Un membre lambda n'a pas d'alias, et une vente entre membres ne dépend d'aucune collecte. La
migration :

- `creancier_email TEXT NULL` — le créancier quand ce n'est pas un collecteur ;
- `collecteur_alias` et `collecte_id` deviennent **nullables** ;
- un `CHECK` impose **exactement un** créancier : soit `collecteur_alias`, soit `creancier_email` ;
- `dettes_select` gagne `OR lower(creancier_email) = lower(auth.jwt() ->> 'email')` ;
- **le créancier membre peut mettre à jour** (`dettes_update`) *(ajouté le 11/09 — la version du 10/09 n'ouvrait
  que la lecture, et Marie n'aurait donc jamais pu confirmer le paiement de JP)*. Il peut passer
  la ligne à `confirme`, rien d'autre ;
- **un garde-fou par colonne** *(ajouté le 11/09, voir ci-dessous)* ;
- **la dette naît d'un trigger** (`SECURITY DEFINER`) à l'acceptation de la transaction, pas du
  front. L'INSERT sur `dettes` reste réservé aux admins (`dettes_insert_admin`) — même raisonnement
  qu'en #44 (les lignes naissent du trigger) et qu'en #59 (une règle de cohérence ne dépend pas du
  chemin emprunté).

⚠ **Pourquoi une colonne d'e-mail du créancier plutôt que de réutiliser l'alias** (`creancier_email`) : sur les **85 collecteurs
déclarés, 20 seulement sont rattachés à un compte membre**. On ne peut donc pas remplir un e-mail
de créancier pour les lignes de #44. Les deux colonnes cohabitent, et le `CHECK` empêche
l'ambiguïté.

#### Le garde-fou par colonne — trouvé le 11/09 en relisant la migration #44

`dettes_update` contrôle **les lignes**, pas **les colonnes**. Sa branche « débiteur » exige
seulement que la ligne *finisse* à l'état `declare` :

```sql
OR (lower(membre_email) = lower(auth.jwt() ->> 'email')
    AND statut_paiement = 'declare')
```

Un membre peut donc, par appel direct à l'API, **changer le montant** (`montant`, ou encore `collecteur_alias`)
de sa propre ligne dans la même requête que sa déclaration. Aucun trigger ne l'en empêche (vérifié
dans les scripts de migration : aucun trigger sur `dettes`). Latent aujourd'hui — 0 ligne, et les
lignes de #44 ne concernent que des collecteurs — mais **inacceptable dès que la table porte des
dettes entre pairs** : on demande à un membre de faire confiance au montant affiché.

D'où un trigger `BEFORE UPDATE` : le débiteur ne peut toucher qu'à `statut_paiement`
(`non_paye` ↔ `declare`), le créancier membre qu'à `statut_paiement` vers `confirme` et
`date_validation`, l'admin à tout. Garde-fou de maintenance **étroit** —
`auth.jwt() IS NULL OR auth.jwt() ->> 'role' = 'service_role'` — leçon de #64, où un garde-fou
« email absent » aurait ouvert le trigger à tout appel anonyme. La latitude actuelle du collecteur
sur ses lignes de #44 n'est pas touchée (hors périmètre, notée).

#### Ce que les 7 requêtes existantes deviennent

| Requête | Filtre actuel | Après |
|---|---|---|
| `global.js` — somme du menu | `membre_email=eq.moi & non_paye & montant>0` | **inchangée** (revérifiée le 11/09), et elle ramasse naturellement les dettes entre membres → « un seul total » est satisfait **sans écrire une ligne** |
| `mes-inscriptions.js` ×2 | `membre_email=eq.moi` | ~~inchangées — ce que je dois, quelle qu'en soit l'origine~~ **requêtes inchangées, affichage à reprendre** (corrigé le 11/09, ci-dessous) |
| `mes-collectes.js` ×4 | `collecteur_alias=eq.mon_alias` | **inchangées** — l'écran collecteur ne voit que ses lignes de collecte |

~~**Aucune des sept ne casse.** Le travail est dans l'écran neuf, pas dans l'existant.~~
*Corrigé le 11/09 : c'était vrai des requêtes, pas de l'affichage.* `mes-inscriptions.js` range
les dettes **par collecteur** et parle **au nom du collecteur** :

- `makeDetteItem()` regroupe sur `collecteur_alias` → une dette entre membres apparaîtrait sous
  un en-tête « (sans collecteur) » ;
- la carte dit « Complément », libellé par défaut « Écart de prix », info-bulle « En attente de
  vérification par le collecteur » ; le résumé dit « en attente de validation par les
  collecteurs ».

Le lot 1 doit donc regrouper les dettes **par créancier** (alias du collecteur ou nom du membre)
et adapter les libellés au `motif`.

⚠ **Et un défaut déjà présent en production, indépendant de #22.** Le récapitulatif par
collecteur (`buildCollecteurRecapHtml()`) n'a **pas de branche pour les dettes** : il les traite
comme des inscriptions, `getTarif()` ne leur trouve pas de collecte et rend un prix nul. Dès qu'un
membre a une ligne de #44 **et** au moins un autre élément chez le même collecteur, le « Total
dû » du groupe et le bouton « J'ai payé » groupé **oublient la dette**, alors que le total en haut
de page la compte. Latent (0 ligne), il se déclenchera au premier changement de prix d'une
collecte où un membre a plusieurs inscriptions. **À corriger sans attendre #22** — signalé à Cyril.

### 2. `transactions` et `transaction_billets` — l'accord

~~Un seul enregistrement porte les deux côtés. **Choix assumé : pas de table de côtés séparée.**
Tous les écrans lisent les deux côtés ensemble — une jointure systématique est une jointure qui
coûte sans rien rapporter — et le besoin est bien de 0 ou 1 remise par côté.~~
*Tombé le 11/09 : Jean-Philippe décrit un échange contre « un ou plusieurs billets ». Le « besoin
de 0 ou 1 remise par côté » était une supposition, pas une mesure — et c'est elle qui justifiait
l'absence de table de lignes.*

`transactions` — **l'accord**, et sa partie « argent » :

| Colonne | Rôle |
|---|---|
| `id`, `created_at`, `accepted_at`, `closed_at` | |
| `membre_a` | celui qui propose |
| `membre_b` | l'autre partie |
| `statut` | `'proposee'` → `'acceptee'` → `'close'`, plus `'refusee'` et `'annulee'` |
| `montant` | la somme, s'il y en a une — `NULL` sinon |
| `payeur` | `'a'` ou `'b'` : qui paie la somme |
| `dette_id` | la ligne de `dettes` créée à l'acceptation pour la somme |
| `commentaire` | texte libre (« port compris »…) |
| `annonce_id` | lien vers l'annonce d'origine — **lot 2**, nullable |

Une seule somme par transaction : un échange avec complément a toujours un sens de paiement net.

`transaction_billets` — **ce que chaque partie remet** :

| Colonne | Rôle |
|---|---|
| `id`, `transaction_id` | |
| `donneur` | `'a'` ou `'b'` |
| `billet_id` | référence au catalogue, **nullable** |
| `libelle` | pour ce qui n'est pas au catalogue |
| `variante` | version normale ou variante |
| `quantite` | |
| `numero_serie` | facultatif — repris de #1 (Q3), où « le billet n° 00042 » est un cas réel |
| `envoi_id` | l'envoi dans lequel la ligne a voyagé — `NULL` tant qu'elle n'est pas partie |

**Le type n'est pas stocké, il se déduit** : billets d'un seul côté et une somme de l'autre =
vente ; billets des deux côtés = échange (avec ou sans complément) ; un côté vide et pas de somme =
don. Une colonne `type` serait une donnée capable de contredire les lignes.

**Les lignes sont figées à l'acceptation** : ce que B a accepté est ce qui a été proposé. Changer
après coup, c'est annuler et reproposer — ce qui renvoie à O2.

### 3. `envois` — l'enveloppe entre membres *(ajouté le 11/09)*

| Colonne | Rôle |
|---|---|
| `id`, `created_at` | |
| `expediteur_email`, `destinataire_email` | |
| `date_expedition` | déclarée par l'expéditeur |
| `date_reception` | confirmée par le destinataire |
| `statut` | `'expedie'` → `'recu'`, plus `'annule'` |

**Le geste d'envoi** : Marie ouvre « Envoyer à Jean-Philippe ». L'écran liste **tous les billets
qu'elle lui doit**, toutes transactions acceptées confondues, pas encore partis. Elle coche ce qui
est dans l'enveloppe et déclare « posté » : un envoi, N lignes.

**Le geste de réception** : JP voit « Enveloppe de Marie — 3 billets » et confirme **une fois**.
Toutes les lignes sont reçues. C'est exactement le `confirmerReception()` des collectes.

Les deux gestes touchent plusieurs lignes à la fois → **deux fonctions RPC** (`SECURITY DEFINER`) :
`declarer_envoi` et `confirmer_reception_envoi`, qui vérifient l'appelant : l'expéditeur n'envoie
que ses propres lignes, au bon destinataire ; seul le destinataire confirme. La règle vit à un seul
endroit — même motif que `mes_notifications_envoyees()` en #51.

- **Réception partielle** : non gérée. Comme pour les collectes, on confirme l'enveloppe entière ;
  s'il manque quelque chose, on ne confirme pas et on s'arrange — les transactions restent
  ouvertes, l'appli n'arbitre pas.
- **Frais de port** : non modélisés. Ils sont compris dans la somme convenue (« 6 € + 1,50 € de
  port = 7,50 € ») ; le `commentaire` de la transaction peut le dire.
- **Numéro de suivi** : non.

⚠ **En suspens — O4.** D'où viennent les « autres billets pour JP » :

- **d'autres transactions entre eux deux** → la table `envois` ci-dessus suffit ;
- **les billets d'une collecte que Marie mène et à laquelle JP est inscrit** → l'envoi serait
  **l'enveloppe de la collecte** (`enveloppes`), et ça touche la machinerie des collecteurs :
  table ancrée sur `collecteurs.alias`, 621 lignes, liste de préparation et statuts répartis dans
  `mes-collectes.js`, port payé à part. Une ligne pointerait alors soit vers un `envois`, soit
  vers une `enveloppes`, et la réception de l'enveloppe de collecte devrait confirmer les lignes de
  transaction. **C'est le plus gros coût et le plus gros risque de tout le lot.**

À noter : le **rab d'une collecte** rejoint déjà l'enveloppe de collecte par #1 (inscription à
quantités nulles). Seul resterait non couvert le **double personnel** d'un collecteur, glissé dans
une enveloppe de sa collecte. **Le modèle ci-dessus est écrit pour le premier cas** ; si la réponse
est le second, ce § est à refaire avant validation.

### 4. La règle de clôture

Une transaction est `close` quand :

- sa somme, s'il y en a une, est confirmée par celui qui la reçoit (dette à `confirme`) ;
- **et** chacune de ses lignes de billets a voyagé dans un envoi dont la réception est confirmée.

Calculée par un trigger (sur `dettes` → `confirme` et sur `envois` → `recu`) qui réévalue les
transactions concernées. Même règle pour une vente, un échange, un échange avec complément :
**aucun code propre à un type**.

### 5. Le compteur public

Pas de colonne : il se calcule (110 membres, aucun enjeu de volume). Mais les transactions étant
privées, un membre ne peut pas compter celles d'un autre — il faut une fonction
`SECURITY DEFINER`, exactement le motif retenu en **#51** pour `mes_notifications_envoyees()` :

```sql
CREATE OR REPLACE FUNCTION nb_transactions_conclues(p_email TEXT)
RETURNS INT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT count(*)::int FROM transactions
   WHERE statut = 'close' AND (membre_a = p_email OR membre_b = p_email);
$$;
```

Elle ne rend **qu'un nombre** — jamais le détail. La confidentialité tient sans dépendre du front.

### 6. Notifications

Privées (`cible_email`, policy de #33), à chaque étape où **l'autre** doit agir : proposition
(vers B), acceptation ou refus (vers A), paiement déclaré (vers celui qui reçoit la somme), envoi
déclaré (vers le destinataire). **Aucune relance automatique** (O1).

### RLS

Conventions du projet : **jamais** `TO authenticated` (le JWT Firebase arrive en rôle `anon`), et
`is_admin_ou_superadmin()` plutôt que `is_admin()`.

- `transactions` — SELECT : `membre_a` ou `membre_b`, ou admin. (Plus strict que
  `inscriptions_read_whitelisted`, qui laisse tout membre lire toutes les inscriptions : de l'argent
  entre pairs mérite mieux que le cloisonnement porté par le seul front.) INSERT : sous son propre
  nom en `membre_a`, en `'proposee'`. Les changements d'état sont gardés par trigger : seul B
  accepte ou refuse, seul le trigger de clôture pose `'close'`.
- `transaction_billets` — SELECT : les parties de la transaction, et les admins. Écriture par A
  seulement, tant que la transaction est `'proposee'`. `envoi_id` ne se pose que par
  `declarer_envoi`.
- `envois` — SELECT : expéditeur, destinataire, admins. Écriture uniquement par les deux
  fonctions du § 3.
- `dettes` — voir § 1.
- ~~UPDATE : chaque partie ne peut toucher que ses propres colonnes, celles de son côté.~~
  *Remplacé le 11/09 : il n'y a plus de colonnes par côté. La garantie « personne ne confirme à la
  place de l'autre » passe par les deux fonctions d'envoi et de réception, et par le garde-fou de
  la table des dettes.*

## Le parcours, en deux exemples *(réécrit le 11/09 d'après Jean-Philippe)*

### Une vente

Marie a un double du `UEBK 2026-14`. Jean-Philippe le cherche ; ils se sont mis d'accord à
**6,00 €, port compris**.

1. **Marie enregistre l'accord** : elle remet `UEBK 2026-14 ×1`, JP remet `6,00 €`.
2. **JP accepte** → la transaction passe `acceptee` ; le trigger crée une ligne de `dettes` de
   6,00 € à sa charge, créancière Marie. Elle apparaît dans **son « vous devez »** du menu, à côté
   de ce qu'il doit aux collecteurs.
3. **JP déclare avoir payé** (dette → `declare`). **Marie confirme avoir reçu l'argent** (dette →
   `confirme`).
4. **Marie prépare un envoi pour JP** : l'écran liste ce qu'elle lui doit — ce billet, et un autre
   issu d'un échange précédent entre eux. Elle coche les deux, déclare « posté ».
5. **JP confirme avoir reçu l'enveloppe** → les deux lignes sont reçues.
6. Somme confirmée et lignes reçues → la transaction est **close**, et le compteur de chacun
   avance. L'autre transaction de l'enveloppe se clôt aussi, si le reste de ce qu'elle porte est
   confirmé.

L'ordre « payer puis envoyer » est celui que l'écran présente ; rien n'empêche Marie d'envoyer
avant d'avoir été payée.

### Un échange avec complément

Marie remet `UEBK 2026-14 ×1` ; JP remet deux billets et **2,00 €**.

- Les 2,00 € deviennent une dette à l'acceptation, que Marie confirme à réception.
- Marie envoie son billet à JP, JP envoie ses deux billets à Marie ; chacun confirme l'enveloppe
  reçue.
- Close quand les 2,00 € sont confirmés et les trois lignes reçues. **Même règle qu'une vente.**

Si l'un ne confirme jamais, la transaction **reste ouverte** — visible des deux, et de personne
d'autre. L'appli n'a rien à trancher.

## Le découpage

### Lot 1 — la fondation *(ce lot-ci)*

Généralisation de `dettes` (avec le garde-fou par colonne et l'UPDATE du créancier), tables
`transactions`, `transaction_billets` et `envois` — **les envois et leurs deux gestes sont
ajoutés le 11/09** —, écran « Mes transactions » (proposer, accepter, payer/confirmer, envoyer/recevoir),
compteur public, et **l'affichage des dettes de « Mes inscriptions » regroupé par créancier**
*(ajouté le 11/09)*.

Le lot grossit par rapport au 10/09 : les envois et la reprise de l'affichage n'y étaient pas.

**Lien avec #1** : la vente du rab repose sur la même table `dettes`. L'ordre retenu le 10/09 était
« lot 1 de #22 → #1 → lot 2 » ; son argument principal est affaibli (voir la correction de
« L'état du terrain ») — **O5**.

### Lot 2 — les annonces

« J'ai en double » / « je recherche », le **rapprochement automatique** — la seule chose que
Facebook ne sait pas faire — et le bouton « ça m'intéresse » qui ouvre une transaction pré-remplie.
C'est là que Marie « met son double dans l'application », comme le décrit Jean-Philippe.

> Le rapprochement reste le cœur de la valeur : l'appli n'a **aucun avantage sur Facebook pour la
> mise en relation** (le groupe est plus grand que les 110 whitelistés), mais Facebook ne sait pas
> dire *« ce que tu as en double, trois membres le cherchent »*.

Table `annonces` (membre, `'double'`/`'recherche'`, `billet_id` **nullable** + `libelle_libre`,
version, quantité, commentaire, `actif`) et, **depuis le 11/09**, `contrepartie` : `'argent'`,
`'echange'` ou les deux — « soit contre un billet soit contre de l'argent ». Afficher ou non un
prix demandé : à trancher au lot 2. Contact par **notification privée** (`cible_email`, policy de
#33) : **aucune adresse e-mail affichée**.

### Lot 3 (séparé, indépendant) — ouvrir « Ma collection »

`ma-collection.html:16` porte `data-require-admin="true"` et `menu.html:30` classe le lien en
`admin-only`. Le retirer est trivial ; **le vrai travail est de vérifier la RLS** de `collection`,
qui n'a jamais été éprouvée par 103 membres. Aucun des deux autres lots n'en dépend — et vu que
`nb_doubles` vaut 0 partout depuis mars, mieux vaut ne pas l'attendre. Jean-Philippe parle des
billets « de la collection de Jean-Philippe » : au lot 1, on les choisit **dans le catalogue** ;
le jour où « Ma collection » est remplie, elle pourra proposer les siens en premier.

## Critères d'acceptation

1. Un membre propose une transaction à un autre ; celui-ci l'accepte ou la refuse.
2. Un côté peut porter **plusieurs billets** (quantité, version, numéro de série facultatif),
   **une somme, ou les deux**.
3. À l'acceptation, la somme éventuelle crée une **dette** à la charge de celui qui paie, qui
   apparaît dans **le total unique** du menu, à côté de ce qu'il doit aux collecteurs.
4. Celui qui paie déclare ; **celui qui reçoit l'argent confirme**.
5. Celui qui doit des billets les regroupe dans **un envoi**, y compris des billets de **plusieurs
   transactions** avec la même personne, et déclare l'avoir posté.
6. Le destinataire **confirme la réception de l'enveloppe entière**, en un geste.
7. L'ordre « payer puis envoyer » est présenté, **jamais imposé**.
8. Une transaction est **close** quand sa somme est confirmée et que toutes ses lignes ont été
   reçues — **un échange se clôt exactement comme une vente**, sans code spécifique.
9. **Personne ne peut confirmer à la place de l'autre, ni modifier le montant d'une dette**, y
   compris par appel direct à l'API.
10. Le **détail** d'une transaction n'est visible que de ses deux parties et des admins.
11. Le **compteur public** « N transactions conclues » est visible de tous, **sans jamais exposer
    le détail** — vérifié en appelant la fonction depuis un compte tiers.
12. Une transaction dont une partie n'est jamais confirmée **reste ouverte indéfiniment**, sans
    blocage ni escalade : l'appli n'arbitre pas.
13. Les **7 requêtes existantes** sur `dettes` rendent les mêmes résultats qu'avant ; **une dette
    entre membres s'affiche dans « Mes inscriptions » sous le nom du créancier**, jamais sous
    « (sans collecteur) ».
14. Les lignes de `dettes` créées par #44 (changement de prix) sont **inchangées** et gardent leur
    comportement.

## Ce que cette spec ne fait pas

- **Pas d'encaissement** : aucun paiement n'est traité par l'appli. Elle enregistre qui doit quoi
  et qui a confirmé avoir reçu.
- **Pas d'arbitrage** : une transaction non confirmée reste ouverte, point.
- **Pas de note ni d'avis** : le compteur est factuel, il ne dit pas si l'échange s'est bien passé.
- ~~**Pas de machinerie d'enveloppes** entre membres : la table des enveloppes est ancrée sur
  l'alias du collecteur. Un simple remis / reçu suffit, et évite un second chantier de même
  ampleur.~~ *Tombé le 11/09 : l'envoi groupé et la confirmation à l'enveloppe sont demandés
  (§ 3). Ce qui reste vrai : on ne réutilise pas la table des enveloppes de collecte — sous réserve
  de O4.*
- **Pas de numéro de suivi, pas de réception partielle** : on confirme l'enveloppe entière, comme
  pour les collectes.
- **Pas de frais de port calculés** : le port est compris dans la somme convenue.
- **Pas d'ordre imposé** entre paiement et envoi.
- **Pas de dépendance au registre des doubles** (`collection.nb_doubles`) : le lot 2 démarre en saisie manuelle.

## Questions restées ouvertes

| | Question | Quand elle se pose |
|---|---|---|
| **O1** | Une **dette qui traîne** : l'appli relance-t-elle, ou reste-t-elle passive ? *Jean-Philippe a gardé « l'application ne relance pas » tel quel — lu comme un accord, à confirmer.* | Au dev du lot 1 |
| **O2** | Un membre peut-il **annuler une transaction acceptée** unilatéralement, ou faut-il l'accord des deux ? | Au dev du lot 1 |
| ~~O3~~ | ~~Une transaction peut-elle naître sans annonce ?~~ **Tranchée le 11/09 : oui** — c'est le lot 1 tel qu'il est maintenu. | — |
| **O4** | **L'enveloppe groupée : les « autres billets » viennent-ils d'autres échanges entre les deux membres, ou aussi d'une collecte que le vendeur mène ?** | **Bloquante** — posée à Jean-Philippe le 11/09. Le second cas refait le § 3 et touche la machinerie des collecteurs |
| **O5** | L'ordre « lot 1 de #22 → #1 » tient-il encore, maintenant que « `dettes` est vide » ne pèse plus ? | Avant le dev — avec Cyril |

## Réalisation

*(à compléter après dev : fichiers touchés + commit)*

---

*Analyse reprise le 2026-09-10 après la remarque de Cyril, puis le 2026-09-11 après celle de
Jean-Philippe, sur mesures refaites ces jours-là. Aucune ligne de code : la règle des L demande
l'accord explicite avant dev.*
