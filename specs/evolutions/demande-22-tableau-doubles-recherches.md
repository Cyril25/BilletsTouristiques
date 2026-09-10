# Demande #22 — Doubles, ventes et échanges entre membres

- **Épic :** chantier structurant (complexité **L**)
- **Demande :** #22 de la table `demandes` de production — Cyril, 2026-07-16, priorité *normale*.
- **Concerne :** tous les membres (**110** whitelistés, dont 6 admins et 1 superadmin).
- **Statut :** **analyse reprise le 2026-09-10**, après la remarque de Cyril qui a invalidé le
  périmètre du 09/09. Quatre décisions prises ce jour-là. **Aucun développement commencé.**
- **Historique de ce document :** une première version du 09/09 concluait à un « tableau
  d'affichage sans argent ». **C'était faux** — voir « Pourquoi la première analyse s'est trompée ».
  Le [cadrage commun](demande-22-et-1-cadrage-doubles-et-vente.md) garde la trace du raisonnement
  d'origine, avec son avertissement.

## Contexte (demande)

> Gestion des doubles avec possibilité de vendre et échanger. Attention car ça doit fonctionner
> autant pour un collecteur (reliquat de collecte), qu'un membre qui a des billets en double.

Et la précision de Cyril du 2026-09-10, qui a rouvert l'analyse :

> Nous souhaitons permettre un **historique des transactions**, que ce soit pour un **échange** ou
> pour une **vente**, mais également la possibilité d'une **dette de membre à membre**, qu'un
> membre puisse **valider le fait qu'un autre membre lui a payé** la somme qu'il lui doit.

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

## L'état du terrain, remesuré le 2026-09-10

| Mesure | Valeur | Ce que ça implique |
|---|---|---|
| Lignes dans `dettes` | **0** | La table de #44 est **vide** : la généraliser coûte un `ALTER`, pas une migration de données |
| Requêtes sur `dettes` dans le front | **7** (global.js ×1, mes-collectes.js ×4, mes-inscriptions.js ×2) | Le coût de la généralisation est mesuré, pas supposé |
| `collection` | 877 lignes, **17 membres** | dont **776 `pas_interesse`** posés par le moteur de #16 |
| … dont `nb_doubles > 0` | **0** | Inchangé depuis mars : le registre des doubles **n'existe toujours pas** |
| … dont possession réelle | **97**, toutes du compte de Cyril | |
| Membres | **110** (103 + 6 admins + 1 superadmin) | |
| `enveloppes` | 618 | La machinerie d'envoi est réelle — mais **ancrée sur `collecteurs.alias`** |

**Le fait à retenir : `dettes` est vide.** C'est maintenant, et seulement maintenant, que la
généraliser est gratuit. Chaque changement de prix de collecte y créera des lignes.

## Le constat qui structure tout : une vente et un échange sont le même objet

La première analyse traitait le troc comme un mécanisme à part, « qui ne se modélise pas ». C'est
faux dès qu'on le regarde par le bon bout :

> Une transaction a **deux côtés**. Chaque partie remet quelque chose, et **celle qui reçoit
> confirme l'avoir reçu.**
>
> - **Vente** : A remet des billets, B remet de l'argent.
> - **Échange** : A remet des billets, B remet des billets.
> - **Don** : un seul côté est rempli.

Et **une dette n'est rien d'autre que le côté « argent » pas encore confirmé.**

Le troc cesse d'être un cas particulier : c'est une transaction dont aucun côté n'est de l'argent.
Il n'y a **pas de mécanisme neuf à inventer** pour lui.

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

## Les décisions du 2026-09-10

| | Décision |
|---|---|
| **Confirmation** | **Chaque côté se confirme** : celui qui reçoit confirme. Une transaction est **close** quand les deux côtés le sont. C'est ce qui fait qu'un troc fonctionne exactement comme une vente. |
| **Visibilité** | **Détail privé** aux deux parties (et aux admins), **plus un compteur public** « N transactions conclues » par membre. Réputation **factuelle**, sans note ni avis. |
| **Découpage** | **Les transactions d'abord.** Le lot 1 est la fondation commune, qui **débloque aussi #1**. Les annonces « j'ai en double / je recherche » viennent en lot 2. |
| **Somme du menu** | **Un seul total.** Ce que je dois à un collecteur et ce que je dois à un membre s'additionnent : une seule question « combien je dois ». |
| **Modèle de dette** | **Voie A — généraliser `dettes`**, décidé sur mesure : table vide, 7 requêtes à relire. Deux tables d'argent en parallèle coûteraient plus cher, et le membre n'aurait plus un seul endroit où lire ce qu'il doit. |

## Le modèle de données

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
- `dettes_select` gagne `OR lower(creancier_email) = lower(auth.jwt() ->> 'email')`.

⚠ **Pourquoi `creancier_email` plutôt que de réutiliser l'alias** : sur les **85 collecteurs
déclarés, 14 seulement sont rattachés à un compte membre**. On ne peut donc pas remplir un e-mail
de créancier pour les lignes de #44. Les deux colonnes cohabitent, et le `CHECK` empêche
l'ambiguïté.

**Ce que les 7 requêtes existantes deviennent** — vérifié une par une :

| Requête | Filtre actuel | Après |
|---|---|---|
| `global.js` — somme du menu | `membre_email=eq.moi & non_paye & montant>0` | **inchangée**, et elle ramasse naturellement les dettes entre membres → la décision « un seul total » est satisfaite **sans écrire une ligne** |
| `mes-inscriptions.js` ×2 | `membre_email=eq.moi` | **inchangées** — ce que je dois, quelle qu'en soit l'origine |
| `mes-collectes.js` ×4 | `collecteur_alias=eq.mon_alias` | **inchangées** — l'écran collecteur ne voit que ses lignes de collecte |

**Aucune des sept ne casse.** Le travail est dans l'écran neuf, pas dans l'existant.

### 2. `transactions`

Un seul enregistrement porte les deux côtés. **Choix assumé : pas de table de côtés séparée.**
Tous les écrans lisent les deux côtés ensemble — une jointure systématique est une jointure qui
coûte sans rien rapporter — et le besoin est bien de 0 ou 1 remise par côté.

| Colonne | Rôle |
|---|---|
| `id`, `created_at`, `closed_at` | |
| `type` | `'vente'` / `'echange'` / `'don'` |
| `membre_a`, `membre_b` | les deux parties |
| `statut` | `'proposee'` → `'acceptee'` → `'close'`, plus `'refusee'` et `'annulee'` |
| `a_nature`, `b_nature` | `'billets'` / `'argent'` / `'rien'` |
| `a_billet_id`, `b_billet_id` | référence au catalogue, **nullable** |
| `a_libelle`, `b_libelle` | pour ce qui n'est pas au catalogue |
| `a_quantite`, `b_quantite` | |
| `a_montant`, `b_montant` | quand la nature est `'argent'` |
| `a_remis_at`, `b_remis_at` | déclaré par **celui qui remet** |
| `a_confirme_at`, `b_confirme_at` | confirmé par **celui qui reçoit** |
| `dette_id` | la ligne de `dettes` créée pour le côté « argent », s'il y en a un |
| `annonce_id` | lien vers l'annonce d'origine — **lot 2**, nullable |

**La règle de clôture, en une phrase** : une transaction est `close` quand **chaque côté non vide
est confirmé**. C'est ce qui rend le troc et la vente identiques.

**Le lien avec `dettes`** : quand un côté est de l'argent, une ligne de `dettes` est créée
(`motif = 'transaction'`, créancier = celui qui reçoit). Confirmer la réception de l'argent, c'est
passer cette dette en `confirme` — **le parcours déclarer/valider de #44, sans une règle de plus.**

### 3. Le compteur public

Pas de colonne : il se calcule (110 membres, aucun enjeu de volume). Mais les transactions étant
privées, un membre ne peut pas compter celles d'un autre — il faut une fonction
**`SECURITY DEFINER`**, exactement le motif retenu en **#51** pour `mes_notifications_envoyees()` :

```sql
CREATE OR REPLACE FUNCTION nb_transactions_conclues(p_email TEXT)
RETURNS INT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT count(*)::int FROM transactions
   WHERE statut = 'close' AND (membre_a = p_email OR membre_b = p_email);
$$;
```

Elle ne rend **qu'un nombre** — jamais le détail. La confidentialité tient sans dépendre du front.

### RLS

Conventions du projet : **jamais `TO authenticated`** (le JWT Firebase arrive en rôle `anon`), et
`is_admin_ou_superadmin()` plutôt que `is_admin()`.

- **SELECT** : `membre_a` ou `membre_b`, ou admin. *(À noter : c'est plus strict que
  `inscriptions_read_whitelisted`, qui laisse tout membre lire toutes les inscriptions. De l'argent
  entre pairs mérite mieux que le cloisonnement porté par le seul front.)*
- **INSERT** : sous son propre nom, en `'proposee'`.
- **UPDATE** : chaque partie ne peut toucher **que ses propres colonnes** — `a_*` pour A, `b_*`
  pour B. C'est la garantie que personne ne confirme à la place de l'autre.

## Le parcours, en un exemple

Marie a un double, Jean-Philippe le cherche. Ils se sont mis d'accord à **6,00 €**.

1. **Marie propose** : type *vente*, elle remet `billet UEBK-2026-14`, JP remet `6,00 €`.
2. **JP accepte** → la transaction passe `acceptee`, et une ligne de `dettes` de 6,00 € naît à sa
   charge. Elle apparaît dans **son « vous devez »** du menu, à côté de ce qu'il doit aux collecteurs.
3. **Marie déclare avoir envoyé** le billet. **JP confirme l'avoir reçu.**
4. **JP déclare avoir payé.** **Marie confirme avoir reçu l'argent** → la dette passe `confirme`.
5. Les deux côtés confirmés → la transaction est **close**, et le compteur public de chacun avance.

Si l'un ne confirme jamais, la transaction **reste ouverte** — visible des deux, et de personne
d'autre. L'appli n'a rien à trancher.

## Le découpage

### Lot 1 — la fondation *(ce lot-ci)*

Généralisation de `dettes`, table `transactions`, écran « Mes transactions », compteur public,
et la somme du menu qui englobe les dettes entre membres.

**Il débloque #1 du même coup** : la vente du rab a besoin de la même primitive, et son modèle C
repose sur cette table. Voir la note de dépendance dans [la spec #1](demande-1-vente-du-rab.md).

### Lot 2 — les annonces

« J'ai en double » / « je recherche », le **rapprochement automatique** — la seule chose que
Facebook ne sait pas faire — et le bouton « ça m'intéresse » qui ouvre une transaction pré-remplie.

> Le rapprochement reste le cœur de la valeur : l'appli n'a **aucun avantage sur Facebook pour la
> mise en relation** (le groupe est plus grand que les 110 whitelistés), mais Facebook ne sait pas
> dire *« ce que tu as en double, trois membres le cherchent »*.

Table `annonces` (membre, `'double'`/`'recherche'`, `billet_id` **nullable** + `libelle_libre`,
version, quantité, commentaire, `actif`). Contact par **notification privée** (`cible_email`,
policy de #33) : **aucune adresse e-mail affichée**.

### Lot 3 (séparé, indépendant) — ouvrir « Ma collection »

`ma-collection.html:16` porte `data-require-admin="true"` et `menu.html:30` classe le lien en
`admin-only`. Le retirer est trivial ; **le vrai travail est de vérifier la RLS de `collection`**,
qui n'a jamais été éprouvée par 103 membres. Aucun des deux autres lots n'en dépend — et vu que
`nb_doubles` vaut 0 partout depuis mars, mieux vaut ne pas l'attendre.

## Critères d'acceptation

1. Un membre propose une transaction à un autre ; celui-ci l'accepte ou la refuse.
2. Une vente crée une **dette** à la charge de l'acheteur, qui apparaît dans **le total unique** du
   menu, à côté de ce qu'il doit aux collecteurs.
3. Chaque partie **déclare avoir remis** ce qu'elle devait ; **l'autre confirme l'avoir reçu**.
4. Une transaction est **close** quand chaque côté non vide est confirmé — **et un échange se
   clôt exactement comme une vente**, sans code spécifique.
5. **Personne ne peut confirmer à la place de l'autre**, y compris par appel direct à l'API.
6. Le **détail** d'une transaction n'est visible que de ses deux parties et des admins.
7. Le **compteur public** « N transactions conclues » est visible de tous, **sans jamais exposer
   le détail** — vérifié en appelant la fonction depuis un compte tiers.
8. Une transaction dont un côté n'est jamais confirmé **reste ouverte indéfiniment**, sans blocage
   ni escalade : l'appli n'arbitre pas.
9. Les **7 requêtes existantes** sur `dettes` rendent exactement les mêmes résultats qu'avant la
   généralisation — à vérifier écran par écran, c'est le seul vrai risque de régression.
10. Les lignes de `dettes` créées par #44 (changement de prix) sont **inchangées** et gardent leur
    comportement.

## Ce que cette spec ne fait pas

- **Pas d'encaissement** : aucun paiement n'est traité par l'appli. Elle enregistre qui doit quoi
  et qui a confirmé avoir reçu.
- **Pas d'arbitrage** : une transaction non confirmée reste ouverte, point.
- **Pas de note ni d'avis** : le compteur est factuel, il ne dit pas si l'échange s'est bien passé.
- **Pas de machinerie d'enveloppes** entre membres : `enveloppes` est ancrée sur `collecteurs.alias`.
  Un simple *remis / reçu* suffit, et évite un second chantier de même ampleur.
- **Pas de dépendance à `collection.nb_doubles`** : le lot 2 démarre en saisie manuelle.

## Questions restées ouvertes

| | Question | Quand elle se pose |
|---|---|---|
| **O1** | Une **dette qui traîne** : l'appli relance-t-elle, ou reste-t-elle passive ? Une relance automatique entre deux membres est un message que le groupe envoie en leur nom. | Au dev du lot 1 |
| **O2** | Un membre peut-il **annuler une transaction acceptée** unilatéralement, ou faut-il l'accord des deux ? | Au dev du lot 1 |
| **O3** | Une transaction peut-elle naître **sans annonce** (deux membres qui se sont arrangés sur Facebook) ? Supposé **oui** ici — c'est même le cas courant tant que le lot 2 n'existe pas. | À confirmer |

## Réalisation

*(à compléter après dev : fichiers touchés + commit)*

---

*Analyse reprise le 2026-09-10 après la remarque de Cyril, sur mesures refaites le jour même.
Aucune ligne de code : la règle des L demande l'accord explicite avant dev.*
