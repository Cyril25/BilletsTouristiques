# Demandes #22 et #1 — Cadrage commun « doubles, vente et échange »

- **Épic :** chantier structurant (deux demandes de complexité **L**)
- **Demandes :** **#22** (Cyril, 2026-07-16, priorité *normale*) et **#1** (import Google Sheet,
  2026-07-16, priorité *basse*) de la table `demandes` de production.
- **Statut :** **cadrage CLOS le 2026-09-09** — les 7 questions sont tranchées (voir
  « Les décisions » en fin de document). Les deux demandes se poursuivent séparément, chacune
  avec sa propre spec :
  **[#1 — vente du rab](demande-1-vente-du-rab.md)** et
  **[#22 — tableau des doubles et recherches](demande-22-tableau-doubles-recherches.md)**.
  Ce document reste la trace du cadrage commun et de la raison pour laquelle les deux se séparent.
  **Aucun développement** à ce stade, conformément à la règle des demandes L.
- **Pourquoi un seul document :** les commentaires posés le 2026-07-21 sur les deux fiches disent
  « à cadrer **ENSEMBLE** », sur l'hypothèse « **#1 = première tranche de #22** ».
  **Ce document teste cette hypothèse. Il conclut qu'elle ne tient pas** — et c'est le premier
  point à trancher ensemble.

## Ce que demandent les deux fiches

> **#22** — « Gestion des doubles avec possibilité de vendre et échanger. Attention car ça doit
> fonctionner autant pour un collecteur (reliquat de collecte), qu'un membre qui a des billets en
> double. »

> **#1** — « Vente du rab / numéros spéciaux : permettre au collecteur d'affecter un billet à un
> membre avec un prix personnalisé (revente Facebook), pour que chacun n'oublie pas de payer et
> d'envoyer. »
> *Commentaire :* « prix libre par billet, visible dans mes-inscriptions du membre avec le
> **numéro du billet** mis par le collecteur et son prix associé. »

Le besoin est réel et ancien : les commentaires importés des anciennes collectes en portent la
trace (« voir JP pour le rab », « 50 commandés, pas de rab », « inscriptions closes, voir René
pour le rab »). Ça se traite aujourd'hui **entièrement sur Facebook**, hors de l'application.

## L'état du terrain, mesuré le 2026-09-07

| Mesure | Valeur |
|---|---|
| Billets au catalogue | **5 507** (dont 5 256 « Terminé », 105 collectes actives) |
| Membres | **109** — 108 actifs, **52 connectés dans les 30 derniers jours**, 39 jamais connectés |
| Collecteurs déclarés | **85** — dont **14** non masqués et rattachés à un compte membre |
| Collecteurs portant réellement une collecte active | **6** |
| Lignes dans `collection` | **873**, sur 17 membres |
| … dont `pas_interesse = true` | **772** |
| … dont `owned_normal = true` | **97** — **toutes du même compte (Cyril)** |
| … dont `owned_variante = true` | **1** |
| … dont **`nb_doubles > 0`** | **0** |

Trois constats en sortent.

### 1. Le registre de possession sur lequel #22 devrait s'appuyer n'existe pas en pratique

`ma-collection.html` porte `data-require-admin="true"` et son lien de menu est en `admin-only` :
**la page n'a jamais été ouverte aux 102 membres.** Ce qui vit dans la table `collection`
aujourd'hui, ce sont à 88 % des `pas_interesse` posés par le moteur de pré-inscription de #16 —
pas des déclarations de collectionneur. La seule possession déclarée dans toute la base est celle
d'un compte de test.

Et surtout : **`nb_doubles` vaut 0 partout, depuis la création de la colonne en mars.**

Le cadrage de #16 notait « `nb_doubles` existe déjà — hook naturel pour la demande #22 ». C'est
exact au niveau du schéma, et **faux au niveau du produit** : la colonne existe, la donnée
n'existe pas, et l'écran qui la produirait n'est pas ouvert. Faire reposer #22 sur ce registre,
c'est faire dépendre la demande d'un **projet préalable non chiffré** : ouvrir « Ma collection »
aux membres, puis obtenir qu'ils la remplissent — sur 5 507 billets.

### 2. Les deux demandes ne servent pas la même population, et pas dans le sens attendu

- **#1** concerne **6 collecteurs** (14 au maximum). Portée étroite, mais sur des rails qui
  existent déjà : collecte, inscription, enveloppe, paiement.
- **#22** concerne potentiellement **52 membres actifs**. Portée dix fois plus large, mais
  **aucun rail** : ni registre alimenté, ni relation d'argent entre membres, ni logistique entre
  membres.

L'inversion est nette : la petite demande est celle qui est prête, la grosse est celle qui a de
l'audience.

### 3. Le prix n'a pas de logement — et #16 avait explicitement reporté la décision ici

Le prix vit sur `collectes(prix, prix_variante)`. **`inscriptions` ne porte aucun montant** : ce
qui est dû est toujours recalculé depuis la collecte (constat déjà établi et vérifié par #44 sur
les 19 tables du schéma).

La question Q4 de #16 était : faut-il ajouter dès la migration un `type` de collecte et un prix
par inscription pour #1/#22 ? Réponse retenue le 2026-07-22 : **non, « on statuera au cadrage de
#1 »**. C'est ce document. La décision est due.

## Le premier constat : ce ne sont pas deux tranches du même chantier

L'hypothèse de juillet — « le sous-cas collecteur/reliquat de #22 = #1 » — repose sur le fait que
les deux phrases contiennent le mot « vendre ». Structurellement, elles ne partagent presque rien.

| | **#1 — vente du rab** | **#22 — doubles entre membres** |
|---|---|---|
| **Vendeur** | un collecteur — rôle qui existe, est vérifié, et porte déjà des responsabilités | un membre quelconque — n'existe pas comme rôle vendeur |
| **Stock vendu** | le reliquat d'une collecte connue de l'appli | une possession déclarée — **registre vide** |
| **Prix** | fixé par le collecteur | fixé par le vendeur, voire négocié |
| **L'argent** | s'ajoute à un solde membre ↔ collecteur **qui existe déjà** (frais de port, et bientôt #44) | crée un solde **membre ↔ membre**, qui n'existe nulle part |
| **La livraison** | l'enveloppe collecteur↔membre existe déjà, le billet la rejoint | **aucun casier membre ↔ membre** |
| **La confiance** | le collecteur est déjà un tiers de confiance du groupe | deux pairs — l'appli devient l'arbitre |
| **L'échange (troc)** | sans objet | **cœur de la demande**, et ne se modélise pas en argent |

**Conclusion : #1 est une petite fonctionnalité posée sur des rails existants ; #22 est un
produit nouveau.** Les appeler « tranche 1 » et « tranche 2 » du même chantier fait paraître #1
plus gros qu'elle n'est, et #22 beaucoup plus petite qu'elle n'est.

## Ce qui casse si on modélise la vente comme une collecte

C'était la piste évoquée en juillet (« offre portée par une collecte-reliquat ou par un membre »).
Deux points d'ancrage l'interdisent côté #22 :

1. **La RLS collecteur est ancrée sur `billets."Collecteur"`**, pas sur la collecte
   (`migration-5-5-inscriptions-collecteur-policy.sql`). #16 a laissé cette dette explicitement
   tracée : *« aucune bascule du scoping collecteur vers `collectes.collecteur` — obligatoire
   avant d'autoriser deux collecteurs différents sur deux collectes d'un même billet »*.
2. **Les enveloppes sont ancrées sur `collecteurs.alias`** (`enveloppes.collecteur_alias`, index
   d'unicité `(collecteur_alias, membre_email)`).

Autrement dit : la machinerie de collecte suppose partout qu'en face d'un membre il y a un
**collecteur déclaré**. Pour #1, c'est vrai — le vendeur est le collecteur du billet, tout tombe
juste. Pour #22, le vendeur est un membre lambda : **il n'a pas d'alias, pas d'enveloppe, et la
RLS ne sait pas le voir.** Modéliser #22 comme une collecte, c'est promettre à n'importe quel
membre les droits d'un collecteur sur un billet qui ne lui appartient pas.

⚠ Corollaire pour #1 : même en restant dans le cas favorable, créer une collecte de vente sur un
billet **déclenche la dérivation de `billets.Categorie`** (trigger de #16). Une vente de rab sur
un billet « Terminé » le **rebasculerait en « Collecte » dans le catalogue**, rouvrant les
inscriptions à tout le monde. C'est précisément le `type` de collecte que la Q4 de #16 avait
anticipé, et qu'il faudrait alors créer.

## #1 — les trois modèles possibles

Contrainte non négociable : **le billet vendu doit pouvoir partir dans l'enveloppe**, et
l'expédition est pilotée par `inscriptions.enveloppe_id`. Le billet vendu doit donc **exister comme
inscription**, quel que soit le modèle. La vraie question est donc : *où vit le prix personnalisé ?*

| | Modèle | Ce que ça coûte | Ce que ça risque |
|---|---|---|---|
| **A** | **Une collecte « vente de reliquat »** par opération, avec son prix | Une colonne `collectes.type` + l'exclure de la dérivation de `Categorie` | Une collecte par prix pratiqué ; pollution du catalogue si le `type` est oublié quelque part |
| **B** | **Prix de surcharge sur l'inscription** (`inscriptions.prix_unitaire`, NULL = prix de la collecte) | Une colonne — mais **tous** les calculs de montant doivent apprendre le repli : mes-inscriptions, mes-collectes, admin, export CSV, somme du menu (#4), trigger de #44 | Changement transverse sur du code où le prix est lu à beaucoup d'endroits ; un oubli = un montant faux et silencieux |
| **C** | **Une ligne de `dettes`** (#44) avec `motif = 'vente_rab'`, l'inscription restant sans prix propre | Presque rien : la table, le parcours déclarer/valider, la notification, la somme du menu et l'écran de validation du collecteur **existent déjà** (une fois #44 en prod) | Le membre voit le billet à 0 € **plus** une ligne « Vente du rab — … : 8,00 € ». Lecture en deux morceaux |

**L'observation qui pousse vers C** : #44 vient de créer exactement la primitive qui manque —
*« un montant arbitraire dû entre un membre et un collecteur, avec un libellé, réglé par le
parcours habituel »* — et sa colonne `motif` a été introduite avec la mention explicite
« *laisse la porte ouverte à d'autres origines* ». #1 est cette autre origine. C'est le modèle qui
ajoute le moins de règles nouvelles au système.

⚠ **Interaction à ne pas rater, quel que soit le choix** : si un membre a une inscription à prix
personnalisé (modèle B) et que le prix de la collecte bouge, **le trigger de #44 lui créera une
ligne de dette calculée sur l'écart de la collecte** — un montant qui n'a rien à voir avec ce
qu'il a payé. Le modèle B oblige donc à amender #44 avant même qu'elle soit en production. Les
modèles A et C n'ont pas ce problème.

### Un point du besoin qui n'est peut-être pas ce qu'on croit

Le titre dit « vente du rab / **numéros spéciaux** », et le commentaire précise « visible dans
mes-inscriptions du membre avec **le numéro du billet** mis par le collecteur ». Lu ensemble, ça ne
décrit pas seulement « vendre les restes » : ça décrit **vendre un billet portant un numéro de
série précis** (un joli numéro), à un prix négocié pour ce numéro-là.

Si c'est bien ça, le modèle doit transporter **un numéro de série**, et `inscriptions` n'en a pas
non plus. Le seul endroit du schéma qui sache stocker un numéro de série est
`collection.serial_normal` — côté acheteur. **À confirmer avant de choisir un modèle** (question
Q3 ci-dessous) : c'est le genre de détail qui, découvert après le dev, oblige à tout reprendre.

## #22 — la question n'est pas technique

La demande empile en réalité trois problèmes de nature différente :

1. **Savoir ce qu'on a en double.** Suppose le registre de collection ouvert **et adopté**.
   Aujourd'hui : page fermée aux membres, 0 double déclaré. C'est un projet en soi.
2. **Trouver un preneur.** 52 membres actifs, 5 507 billets. La probabilité que le double de A
   soit dans la liste de recherche de B est faible, et le groupe Facebook — qui est plus grand que
   les 109 membres whitelistés — assure déjà cette fonction. **L'application n'a pas d'avantage sur
   Facebook pour la mise en relation.** Son avantage est ailleurs : elle sait qui doit quoi à qui,
   et ce qui part dans quelle enveloppe.
3. **Faire la transaction.** Là, tout manque : pas de solde membre ↔ membre, pas de casier
   membre ↔ membre, et surtout **pas de tiers de confiance**. Tout le modèle de paiement de
   l'appli repose sur une relation asymétrique : *le membre déclare, le collecteur valide*. Entre
   deux pairs, il n'y a personne pour valider. Si un membre paie et ne reçoit rien, l'application
   n'a aucun mécanisme de litige — et les **6 admins bénévoles deviennent arbitres de fait**.

Et « échanger » n'est pas « vendre en moins cher » : un troc n'a pas de montant, il est
bilatéral, simultané, et les deux parties doivent expédier. Rien de ce que l'appli sait faire ne
s'y applique.

### L'alternative à mettre sur la table : le tableau d'affichage

Il existe une version de #22 qui livre sans doute 80 % de la valeur pour une fraction du coût :

> Chaque membre publie **« ce que j'ai en double »** et **« ce que je recherche »**. Les autres le
> voient et le contactent. **L'application ne gère ni l'argent, ni l'envoi, ni le litige** — la
> transaction se fait comme aujourd'hui, de gré à gré.

Ce que ça change par rapport à la bourse complète :

- pas besoin du registre de collection : une liste de références saisies à la main suffit à
  démarrer, et le registre viendra l'alimenter plus tard s'il s'ouvre un jour ;
- pas de solde membre ↔ membre, pas de casier, pas d'arbitrage, pas de responsabilité nouvelle
  pour le groupe ;
- un chantier nettement plus court — même s'il reste un **L** : la conclusion « complexité M »
  écrite ici le 09/09 a été corrigée le 10/09, elle mesurait ce que ce périmètre *enlevait*
  plutôt que ce qu'il *laissait*.

À noter, la porte est déjà entrebâillée dans le schéma : `contacts_collecteur.visibilite` existe
avec un `CHECK (visibilite IN ('prive'))` — une colonne posée pour un jour accepter autre chose
que « privé » (c'est aussi le sujet de la demande B6 du backlog admin).

**C'est le vrai arbitrage de #22 : une place de marché, ou un tableau d'affichage ?** La demande
dit « vendre et échanger », ce qui sonne place de marché ; mais l'essentiel de la valeur est
peut-être dans la seule visibilité.

## Ce que ça change sur l'ordre des travaux

L'ordre acté le 2026-07-21 était **#16 → #1 → #22**. La consigne du 2026-09-07 est **#22 puis #1**.
Après analyse, ni l'un ni l'autre exactement :

- **Cadrer #22 d'abord** — parce que c'est la décision « place de marché ou tableau d'affichage »
  qui détermine si le modèle de #1 doit être générique (utilisable par un membre) ou peut rester
  spécifique au collecteur. Décider #1 avant, c'est risquer de le refaire.
- **Développer #1 d'abord** — parce que c'est petit, que les rails existent, que ça sert
  immédiatement 6 collecteurs, et que ça sortira du chantier bien avant #22.

Autrement dit : **cadrage #22 → décision de modèle → dev #1 → dev #22**, et non « tout #22 puis
tout #1 ».

Une réserve de calendrier : **#1 dans son modèle C dépend de `dettes`, qui n'est pas encore en
production** (migration #44 vérifiée absente le 2026-09-07 — la table répond 404). Si le modèle C
est retenu, #1 attend la mise en prod de #44.

## Questions ouvertes pour Cyril

| | Question | Pourquoi elle bloque |
|---|---|---|
| **Q1** | **#22 : place de marché ou tableau d'affichage ?** L'appli gère-t-elle l'argent et l'envoi entre deux membres, ou seulement la publication des listes « j'ai en double / je recherche » ? | C'est la question qui fait passer #22 de M à L, et qui décide si le groupe endosse un rôle d'arbitre. Tout le reste en découle. |
| **Q2** | **Si place de marché : qui arbitre un litige ?** Un membre paie, ne reçoit rien — que fait l'application, et que font les 6 admins ? | Aujourd'hui la validation d'un paiement est faite par un collecteur, rôle vérifié. Entre pairs, il n'y a personne. Sans réponse, on livre une promesse qu'on ne peut pas tenir. |
| **Q3** | **#1 : « numéros spéciaux » = numéro de série précis, oui ou non ?** Le collecteur vend-il « 2 billets du rab » ou « le billet n° 00042 » ? | Change le modèle de données : ni `inscriptions` ni `collectes` ne savent stocker un numéro de série. Découvert après le dev, c'est à refaire. |
| **Q4** | **#1 : quel modèle de prix — A, B ou C ?** (voir le tableau) | C'est la décision que la Q4 de #16 avait explicitement renvoyée à ce cadrage. Recommandation : **C**, sauf si Q3 ou la lisibilité côté membre l'interdit. |
| **Q5** | **#1 : un membre peut-il refuser une vente qu'on lui affecte ?** Le collecteur « affecte un billet à un membre » — le membre reçoit donc une dette qu'il n'a pas demandée. | Aujourd'hui aucun montant n'apparaît chez un membre sans qu'il se soit inscrit lui-même. C'est un précédent. Une confirmation côté membre ? Un simple droit d'annuler ? |
| **Q6** | **#22 : ouvrir « Ma collection » aux membres est-il dans le périmètre, ou un projet à part ?** | La page est fermée par `data-require-admin`, 0 double déclaré. Sans elle, une bourse alimentée par le registre n'a aucun carburant. |
| **Q7** | **Le troc est-il vraiment demandé, ou est-ce « vendre » qui compte ?** | Un échange n'a pas de montant, il est bilatéral et simultané. C'est un mécanisme entièrement neuf, sans réemploi possible. S'il n'est pas essentiel, le retirer allège fortement #22. |

## Les décisions — séance du 2026-09-09

Les 7 questions ont été tranchées avec Cyril. Q2 tombe d'elle-même avec la réponse à Q1.

| | Question | Décision |
|---|---|---|
| **Q1** | #22 : place de marché ou tableau d'affichage ? | **Tableau d'affichage.** L'application publie les listes, elle ne gère ni l'argent, ni l'envoi, ni le litige entre deux membres. |
| **Q2** | Si place de marché : qui arbitre un litige ? | **Sans objet.** Pas de transaction, donc pas d'arbitrage — les 6 admins bénévoles ne deviennent pas arbitres de fait. |
| **Q3** | #1 : « numéros spéciaux » = numéro de série précis ? | **Les deux cas existent.** Le modèle doit porter un **numéro de série optionnel** : tantôt « 2 billets du rab », tantôt « le billet n° 00042 ». |
| **Q4** | #1 : quel modèle de prix, A, B ou C ? | **C** — une ligne de `dettes` avec `motif = 'vente_rab'`. |
| **Q5** | #1 : un membre peut-il refuser une vente qu'on lui affecte ? | **Confirmation préalable.** La vente ne compte dans le solde du membre qu'**après acceptation** — le précédent « aucun montant sans inscription volontaire » est préservé. |
| **Q6** | #22 : ouvrir « Ma collection » aux membres — périmètre ou projet à part ? | **Deux lots.** L'ouverture de « Ma collection » est un lot séparé ; #22 démarre en saisie manuelle et ne l'attend pas. |
| **Q7** | Le troc est-il vraiment demandé ? | **Non — « vendre » est ce qui compte.** Le troc sort du périmètre. |

### Ce que ces décisions changent

**#22 s'allège nettement — mais reste un L.** Elle était L parce qu'elle supposait un solde membre ↔ membre, un casier
membre ↔ membre et un mécanisme de litige — trois choses absentes du système. Q1 et Q7 les
retirent toutes les trois : il ne reste que de la publication et de la mise en relation.

**#1 s'allège aussi, et son unique réserve de calendrier est levée.** Le cadrage notait que le modèle C
dépendait de `dettes`, alors absente de la production. **Vérifié le 2026-09-09 : la table est en
production depuis le 07/09** (elle répond, et elle est vide). #1 est développable.

**Quatre points durs de #1 sont apparus à la relecture de la migration #44**, et font le vrai
contenu de son dev : l'INSERT sur `dettes` est réservé aux admins ; le trigger R4 supprimerait la
vente à la première annulation de paiement ; la somme du menu compterait une vente non acceptée ;
et `collecte_id` est `NOT NULL`. Détail dans la spec de #1.

**L'ordre de travail reste celui que le cadrage recommandait** : la décision produit de #22 étant
prise, **#1 se développe en premier** — c'est la plus petite, ses rails existent, elle sert
6 collecteurs immédiatement.

## Prochaines étapes

1. ~~Séance de cadrage à deux sur Q1 à Q7~~ → **faite le 2026-09-09**, voir « Les décisions ».
2. ~~Deux specs séparées~~ → **rédigées le 2026-09-09** :
   [demande-1-vente-du-rab.md](demande-1-vente-du-rab.md) et
   [demande-22-tableau-doubles-recherches.md](demande-22-tableau-doubles-recherches.md).
3. **Reste : la validation explicite de Cyril sur ces deux specs.** La règle des demandes L
   demande que l'analyse soit jugée complète **d'un commun accord** avant tout dev — c'est à
   l'assistant de dire « l'analyse me semble complète » et d'attendre le feu vert. C'est dit.
4. Ensuite, dans l'ordre : **dev #1**, puis le lot « ouvrir Ma collection », puis **dev #22**.

---

*Analyse du 2026-09-07. Mesures faites sur la base de production via `supabase-admin-proxy`.
Aucune écriture en base hors le passage des deux demandes en `en_cours`.*
