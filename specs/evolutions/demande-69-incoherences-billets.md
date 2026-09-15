# Demande #69 — L'écran « Incohérences des billets »

- **Complexité :** L (tri du 2026-09-14).
- **Demande :** #69, déposée par Cyril le 2026-09-14, priorité normale. Née de #66 (question Q7).
- **Statut :** analyse écrite le 2026-09-14, reprise le 2026-09-15 après les réponses de Cyril. Plus
  aucune question ouverte. **Validée par Cyril le 15/09, développée le même jour** avec #66
  (commit `d0e941d`) : voir « Réalisation ». Migration jouée le 15/09 à 16 h 07 (7 176 constats),
  contrôle 13/13, **À tester** le même jour.
- Version en clair pour les relecteurs : `demande-69-incoherences-billets-en-clair.md`.

## Les réponses de Cyril *(15/09, 10 h 50)*

| Question | Réponse | Ce qui change |
|---|---|---|
| **Q1** — dans la base ou par l'assistant | « on peut oui, mais comment on détecte les incohérence au final ? Par une requête ? ou par l'IA ? Car si c'est pas l'ia j'ai l'impression qu'on a pas le choix de passer par l'assistant » | **Retenu : dans la base.** La question montrait un manque : l'analyse ne disait pas qui exécute les requêtes, ni comment un admin sans SQL peut les lancer. Nouvelle section « Comment une incohérence est détectée » |
| **Q2** — un seul écran | « ok pour un seul écran, mais il faudra quand même faire la diff entre des billets qu'on veut modifier suite à l'import de données extérieures et des problèmes sur les data de notre bdd je pense ? » | **Retenu**, et la séparation est précisée : deux onglets qui ne se mélangent jamais, et une mention quand un même billet apparaît dans les deux. Voir « Ce qui rapproche #66 et #69 » |
| **Q3** — quels contrôles | « on peut tout mettre et on ajustera les règles ensuite ? » | **Tous gardés**, C3 et D3 compris. B2 reste pour plus tard : ce n'est pas une requête |
| **Q4** — d'autres contrôles | « non ça me semble bien pour le moment mais ça pourra être évolutif » | Rien à ajouter ; le catalogue est déjà extensible |

## Contexte (demande)

> Créer un écran « Incohérences des billets » (types de variante non renseignés, billets sans photo,
> autres cas à définir, tels que des dates bizarres, d'autres données à vérifier ?). Au final l'écran
> affichera les incohérences avec un lien sur le billet, et ça permettra de les corriger. C'est l'IA
> qui aura une tâche et qui ira vérifier la cohérence de l'ensemble des données.

Trois choses à établir : **quels contrôles**, **qui les fait tourner**, et **ce qu'on fait d'un
constat** une fois qu'il est affiché.

## Ce que contient la base, vérifié le 2026-09-14

| Où | Ce qui peut être incohérent |
|---|---|
| `billets` | `HasVariante` (`N`, `A`, `D`, non renseigné — sous deux formes, `NULL` et chaîne vide, et parfois des libellés longs, voir #66) ; `VersionNormaleExiste` ; la clé `Reference` + `Millesime` + `Version` (#66) ; `ImageUrl` / `ImageId` ; `NomBillet`, `Pays`, `Ville`, `Dep`, `Cp`, `Theme` |
| `collectes` (depuis #16) | `date_pre`, `date_coll`, `date_fin`, `categorie` (statut), `scope`, `collecteur`, `prix`, `prix_variante` |
| `pays` | La liste de référence des pays |
| `inscriptions` | #62 a compté, le 10/09, **142 inscriptions hors de l'invariant D4** (antérieures à #16) |

Les dates ne sont plus sur le billet mais **sur ses collectes** : « des dates bizarres », ce sont des
dates de collectes.

## Le catalogue des contrôles proposés

Chaque contrôle a un **code**, un **libellé** lisible par un admin, et une **gravité** : ce qui est
**faux** (une donnée impossible), ce qui est **manquant**, ce qui est **suspect** (probablement une
erreur, peut-être voulu). Le nombre de billets concernés sortira du constat
`scripts/migration-demande-69-1-constat.sql` (lecture seule, poste de Cyril) : ~~c'est lui qui dira
lesquels garder — un contrôle qui remonte 3 000 lignes noie l'écran.~~ *(15/09, Q3 : Cyril garde
tout et ajustera ensuite.)* Le constat ne sert plus à choisir ; il reste utile avant le développement,
pour savoir à quel volume s'attendre dans chaque compteur.

| Code | Contrôle | Gravité | Recommandation |
|---|---|---|---|
| **A1** | Variante non renseignée | manquant | **Garder** — c'est le cas cité dans la demande ; #66 le comblera en partie |
| **A2** | Variante portant une valeur autre que `N`, `A`, `D` (libellés longs d'un ancien script) | faux | **Garder** |
| **A3** | Ni version normale ni variante | faux | **Garder** : un billet qui n'existe sous aucune forme |
| **A4** | Même référence, millésime et version sur plusieurs fiches (doublon) | faux | **Garder** — bloque aussi le rapprochement de #66 |
| **A5** | Référence, millésime ou version manquant | manquant | **Garder** — même raison |
| **B1** | Billet sans image | manquant | **Garder** — cité dans la demande |
| **B2** | Image dont le lien ne répond plus | suspect | **Plus tard** : demande d'aller chercher 5 000 images sur le réseau, voir « Qui fait tourner les contrôles » |
| **C1** | Dates d'une collecte dans le mauvais ordre (pré-collecte après collecte, collecte après fin) | faux | **Garder** |
| **C2** | Statut sans la date qui va avec (« Terminé » sans date de fin…) | manquant | **Garder** |
| **C3** | Collecte à plus de deux ans du millésime du billet | suspect | ~~À décider : rattrapages tardifs légitimes possibles~~ **Garder** (15/09, Q3) — un rattrapage légitime s'« accepte » |
| **C4** | Date avant 2000 ou plus d'un an dans le futur | faux | **Garder** : faute de frappe presque certaine |
| **C5** | Collecte encore « Pré collecte » ou « Collecte » plus d'un an après sa date | suspect | **Garder** — oubli de clôture probable |
| **D1** | Collecte sans collecteur | manquant | **Garder** — *ajusté le 15/09 : hors pré-collecte, et seulement si la collecte a des inscriptions* |
| **D2** | Collecte ouverte aux variantes sur un billet sans variante déclarée | faux | **Garder** |
| **D3** | Collecte sans prix | manquant | ~~À décider : les collectes anciennes importées n'en ont peut-être jamais eu~~ **Garder** (15/09, Q3) — s'il noie l'écran, on l'ajustera — *ajusté le 15/09 : hors pré-collecte, et seulement si la collecte a des inscriptions* |
| **E1** | Pays vide ou absent de la liste des pays | manquant | **Garder** |
| **E2** | Nom du billet vide | manquant | **Garder** |

**Hors catalogue, volontairement** : les 142 inscriptions hors invariant — ce sont des inscriptions,
pas des billets, et leur correction relève d'un autre écran. Signalé ici pour qu'on ne les oublie pas.

Le catalogue est **extensible** : un contrôle, c'est un code, un libellé, une gravité et une requête.
En ajouter un plus tard ne touche ni la table ni l'écran.

## Qui fait tourner les contrôles

La demande dit : « c'est l'IA qui aura une tâche ». En regardant le catalogue, **presque tous les
contrôles sont des requêtes simples** sur la base — A1 à E2, sauf B2. Ils n'ont besoin d'aucune
intelligence pour tourner, seulement pour être **écrits**.

| | Principe | Pour | Contre |
|---|---|---|---|
| **A — une fonction en base** *(recommandée)* | Les contrôles vivent dans une fonction `verifier_billets()`, que l'écran appelle par un bouton **« Relancer la vérification »** | N'importe quel admin la relance, quand il veut, sans assistant ni poste de Cyril. Le résultat est toujours à jour après une correction | Les contrôles « intelligents » (B2) n'y entrent pas |
| **B — une tâche de l'assistant** | Sur demande de Cyril, l'assistant lance les requêtes et écrit les constats | Peut faire B2 (aller vérifier les images) | Dépend d'une session sur le poste de Cyril ; les admins ne peuvent pas relancer eux-mêmes |

**Recommandé : A pour le catalogue, B en complément** pour ce qu'une requête ne sait pas faire — B2
aujourd'hui, et **l'écriture de nouveaux contrôles** : c'est là que l'assistant est utile, en lisant
les données pour proposer ce qui mérite d'être vérifié. ~~Question Q1, puisque la demande disait
l'inverse.~~ **Tranché le 15/09 par Cyril : A.**

### Comment une incohérence est détectée *(ajouté le 15/09, question de Cyril)*

**Par des requêtes, pas par l'IA.** Chaque contrôle est une condition sur les données. A1, par
exemple, se lit : `COALESCE(btrim("HasVariante"), '') = ''` sur `billets`. Le constat
`scripts/migration-demande-69-1-constat.sql` contient déjà les seize requêtes (tout le catalogue sauf B2), sous forme de comptage.

**La crainte de Cyril** : si ce n'est pas l'IA, il faudrait l'assistant pour exécuter les requêtes,
puisque aucun admin ne joue de SQL. Ce n'est pas le cas, et c'était à écrire :

1. **Écrire** les requêtes, c'est le travail de l'assistant, **une fois**, au développement du lot 1.
   Elles sont rangées dans la base, dans la fonction `verifier_billets()`.
2. **Exécuter**, c'est l'écran : le bouton « Relancer la vérification » appelle
   `/rest/v1/rpc/verifier_billets`, comme l'application appelle déjà `compteurs_inscriptions`
   (`admin.js`) ou `marquer_signalement_vu` (`global.js`). L'admin ne voit ni SQL ni assistant.
3. La fonction **refuse tout appelant qui n'est pas admin**. Attention : `is_admin_ou_superadmin()`
   ne regarde pas le statut du membre (constaté pour #62). La vérification des droits en tient compte.

**Là où il faudrait l'IA**, et donc l'assistant lancé depuis le poste de Cyril :

- juger ce qu'aucune condition simple n'exprime, comme un nom de billet mal orthographié ou une ville
  qui ne correspond pas au département ;
- aller chercher les images sur le réseau (B2).

Aucun contrôle du catalogue n'en a besoin aujourd'hui. Un contrôle de ce genre, s'il vient un jour,
écrira ses constats dans la même table, avec son propre code : l'écran ne change pas.

**Ajuster une règle ensuite** (Q3), c'est réécrire une condition dans `verifier_billets()` : une
petite demande, sans toucher ni à la table ni à l'écran. Retirer un contrôle efface ses constats en
même temps : sinon, la vérification suivante ne les trouvant plus, ils passeraient à tort en
« corrigé ».

## Le modèle

### `controles_billets` — un constat

| Colonne | Rôle |
|---|---|
| `id`, `trouve_le` | |
| `code` | le code du contrôle (`A1`…) |
| `billet_id` | le billet concerné — toujours renseigné : c'est le lien vers la fiche |
| `collecte_id` | la collecte concernée, pour les contrôles C et D |
| `detail` | ce qui a été vu, en clair (« pré-collecte le 12/05/2024, collecte le 03/03/2024 ») |
| `statut` | `a_corriger`, `corrige`, `accepte` |
| `vu_la_derniere_fois_le` | la dernière vérification qui l'a encore trouvé |
| `decide_par`, `decide_le`, `commentaire` | pour un constat accepté : qui, quand, pourquoi |

**Un constat est unique** par `code`, `billet_id` et `collecte_id` : relancer la vérification ne
duplique rien.

### Le cycle d'un constat

1. **Trouvé** par une vérification → `a_corriger`.
2. L'admin clique sur le lien, **corrige la fiche**. À la vérification suivante, le contrôle ne le
   trouve plus → `corrige`, **d'office**.
3. Ou l'admin juge que **ce n'est pas une erreur** (un rattrapage tardif légitime, par exemple) → il
   **accepte**, avec un commentaire → `accepte`. Les vérifications suivantes ne le remontent plus.
4. Un constat `corrige` qui réapparaît (la fiche a été remodifiée) redevient `a_corriger`.

Pas de « refusé » ici, contrairement à #66 : un constat n'est pas une proposition qu'on applique ou
non, c'est un problème qu'on corrige ou qu'on accepte.

## L'écran

- Une page **« Incohérences des billets »** dans le menu admin.
- En tête : **les compteurs par contrôle** (« A1 — Variante non renseignée : 1 204 »), cliquables
  pour filtrer ; la date de la dernière vérification ; le bouton **« Relancer la vérification »**.
- La liste : billet (nom, référence, image miniature), contrôle, détail, et **le lien vers la fiche**
  (`admin-billet.html?id=…`), qui s'ouvre dans un nouvel onglet pour garder sa place dans la liste.
- Filtres par gravité et par statut (« à corriger » par défaut), et le bouton **« Accepter »** avec
  un commentaire.
- Mode sombre et téléphone réel (#53).

## Ce qui rapproche #66 et #69

Les deux demandes rangent des constats dans une liste que les admins traitent, avec un statut, un
commentaire et un lien vers le billet. **Mais leurs lignes ne vivent pas pareil** : #66 propose une
valeur venue d'un fichier, à accepter ou refuser, et l'applique ; #69 signale un problème qu'on
corrige soi-même dans la fiche. Une seule table forcerait des colonnes vides d'un côté ou de l'autre.

**Recommandé : deux tables, un seul écran à deux onglets** — « Vérification des billets » (#66) et
« Incohérences » (#69) —, sous un même titre, **« Qualité des billets »**. Les admins n'ont qu'un
endroit où aller, et les règles de cohérence des versions (A1 à A5) sont écrites une fois et servent
aux deux. ~~Question Q2.~~ **Tranché le 15/09 par Cyril : oui**, avec une condition.

### Deux onglets qui ne se mélangent pas *(ajouté le 15/09, remarque de Cyril sur Q2)*

Cyril : « il faudra quand même faire la diff entre des billets qu'on veut modifier suite à l'import
de données extérieures et des problèmes sur les data de notre bdd ». C'est ce que font les deux
onglets, et la spec le dit maintenant :

| Onglet | Ce qu'il montre | D'où ça vient | Ce qu'on en fait |
|---|---|---|---|
| **Vérification des billets** (#66) | Ce qu'un **fichier extérieur** propose de changer | Un import lancé par l'assistant | Accepter ou refuser ; l'application applique |
| **Incohérences** (#69) | Ce qui cloche **dans nos données**, sans aucun fichier | `verifier_billets()` | Corriger la fiche soi-même, ou accepter le cas |

Jamais une ligne dans les deux listes à la fois, jamais un compteur commun.

**Un même billet peut en revanche apparaître dans les deux.** Exemple : sa variante n'est pas
renseignée (A1), et le dernier import propose « doré ». Le corriger à la main pendant qu'une
proposition attend dans l'autre onglet, ce serait faire deux fois le travail, ou le contredire.
**Proposé** : un constat A1, A2 ou A3 dont le billet a une ligne `a_valider` dans
`imports_billets_lignes` porte la mention « Un import propose une valeur », avec un lien vers la
ligne dans l'autre onglet. Ce sont les seuls contrôles qui portent sur les champs que #66 compare.
Une fois la proposition acceptée et appliquée, la vérification suivante passe le constat en
« corrigé », d'office. L'onglet de #66, lui, ne change pas.

## Découpage

| Lot | Contenu | Dépend de |
|---|---|---|
| **1** | Table `controles_billets`, règles d'accès (admins, sans `TO authenticated`), fonction `verifier_billets()` avec les seize contrôles (tout le catalogue sauf B2) | ~~constat joué, Q1 et le choix des contrôles~~ rien (15/09 : Q1 et Q3 tranchées) |
| **2** | L'écran : compteurs, liste, lien, accepter, relancer ; la mention « Un import propose une valeur » | lot 1 ; la mention, de #66 — si #69 est développée d'abord, la mention arrivera avec #66 |
| **3** *(plus tard)* | B2, les images qui ne répondent plus, par l'assistant | lot 1 |

## Critères d'acceptation

1. Relancer la vérification remplit ou met à jour la liste, sans doublon.
2. Chaque constat mène à la fiche du billet en un clic.
3. Une fiche corrigée fait passer ses constats en « corrigé » à la vérification suivante.
4. Un constat accepté, avec son commentaire, ne revient pas aux vérifications suivantes.
5. Les compteurs par contrôle sont justes et filtrent la liste.
6. Un non-admin ne lit ni n'écrit dans la table, y compris par appel direct à l'API ; *(15/09)* il ne
   peut pas non plus lancer `verifier_billets()`, y compris un admin dont le compte n'est plus actif.
7. Mode sombre et téléphone réel.
8. *(15/09)* Un constat A1, A2 ou A3 dont le billet attend une décision d'import porte la mention « Un
   import propose une valeur » et mène à la ligne dans l'autre onglet.

## Ce que cette spec ne fait pas

- **Pas de correction automatique** : l'écran signale, l'admin corrige dans la fiche.
- **Pas de contrôle des inscriptions**, dont les 142 hors invariant — un autre sujet.
- **Pas de vérification des images sur le réseau** dans ce lot (B2).
- **Pas de rapprochement avec un fichier externe** : c'est #66.

## Questions ouvertes

| | Question | Pour qui | Recommandation |
|---|---|---|---|
| ~~Q1~~ *(tranchée le 15/09 : dans la base)* | Les contrôles tournent-ils **dans la base** (un bouton relance, n'importe quel admin) plutôt que par une tâche de l'assistant ? | Cyril | Oui pour le catalogue ; l'assistant pour B2 et pour écrire de nouveaux contrôles |
| ~~Q2~~ *(tranchée le 15/09 : oui, deux onglets distincts)* | Un seul écran « Qualité des billets » avec deux onglets, #66 et #69 ? | Cyril | Oui |
| ~~Q3~~ *(tranchée le 15/09 : tous)* | Quels contrôles garder ? En particulier C3 (collecte loin du millésime) et D3 (collecte sans prix) | Cyril, avec le constat | Tous les « Garder » du catalogue ; C3 et D3 selon les chiffres |
| ~~Q4~~ *(close le 15/09 : rien pour l'instant)* | D'autres contrôles à ajouter ? | Tous | — |

**Plus aucune question ouverte : l'analyse est validable.** Seule la mention « Un import propose une
valeur » est une proposition nouvelle du 15/09 ; un relecteur qui n'en veut pas peut le dire.

## Réalisation

Développée le 2026-09-15, avec #66 (écran commun) — commit `d0e941d`. **Migration jouée en production
le 15/09 à 16 h 07** par l'assistant (psql, VPN coupé par Cyril) : première vérification **7 176
constats en 1,3 s** (dans la transaction de création ; 2 de plus qu'au banc du matin : D1 424, D3 1 153).
Contrôle en lecture seule 13/13 et passage « À tester » : voir la réalisation de #66, mêmes scripts.

| Où | Ce qui est fait |
|---|---|
| `scripts/migration-demande-69-2-incoherences-billets.sql` *(gitignoré, poste de Cyril)* | `controles_billets_catalogue` (les 16 contrôles, libellé, famille, gravité, ordre), `controles_billets`, `controles_billets_verifications` (qui a lancé, quand, combien) ; RLS lecture admins actifs, aucune écriture directe ; `verifier_billets()`, `compteurs_controles_billets()`, `decider_controle_billet()` ; **une première vérification** en fin de script, pour que l'écran ne s'ouvre pas vide |
| `admin-qualite-billets.html` / `.js`, `style.css`, `menu.html` | L'écran « Qualité des billets », onglet « Incohérences » ; entrée de menu sous « Gestion Billets » |
| `sw.js`, `global.js` | Cache `billets-v310`, menu `v202` |

### Ce que le développement a précisé

- **Le catalogue est une table**, pas seulement des requêtes : l'écran y lit libellés, familles et
  gravités. Ajouter un contrôle = une ligne + sa requête ; **retirer un contrôle = supprimer sa ligne**,
  ce qui efface ses constats (clé étrangère) et le fait ignorer par la vérification suivante, même si sa
  requête est restée.
- **A4 porte sur la clé normalisée et complète** (même règle que le rapprochement de #66) : **242**
  fiches le 15/09, et non 258 — les 16 autres doublons ont une clé incomplète et relèvent de A5.
- **C4** suit la spec (« plus d'un an dans le futur ») ; le constat 69-1 comptait deux ans.
- **D3** : « sans prix » = pas de prix, sauf sur une collecte ouverte aux variantes seules qui a un prix
  variante (un prix variante vide veut dire « même prix que le normal »).
- **D1 et D3, ajustés le 15/09 pendant le test, sur deux remarques de Cyril** : « si c'est
  pré-collecte c'est normal, et si c'est des collectes qui datent d'avant la mise en place du site, on
  ne remonte pas l'info » (prix) ; « beaucoup sont aussi des pré-collectes […] c'est même le principe de
  la pré-collecte » (collecteur). Les chiffres lui ont donné raison : les 70 pré-collectes n'ont ni prix
  ni collecteur, et sur les collectes terminées sans prix (1 082) ou sans collecteur (353), **3 et 1
  seulement ont des inscriptions**. Pour « avant le site », aucune date ne concordait (premier commit du
  site en décembre 2025, premières inscriptions en base en février 2024) : Cyril a retenu **« a au moins
  une inscription »**, sans date à tenir à jour — sans inscription, personne à faire payer. Le détail
  dit désormais combien d'inscriptions sont rattachées. Script `migration-demande-69-3-regles-d1-d3.sql`
  (éditeur SQL) : remplace `verifier_billets()`, **efface** les constats D1/D3 que la règle ne produit
  plus (sauf acceptés) — sans quoi ils passeraient à tort en « corrigés » —, relance et se contrôle.
  Éprouvé sur banc (vraies données, état d'avant recréé, un constat accepté conservé).
- **Accepter demande un commentaire** — c'est lui qui répond au prochain admin. Et **« Rouvrir »**
  existe, pour revenir sur un clic malheureux. Un constat accepté reste accepté, retrouvé ou non.
- **L'écran montre un contrôle à la fois**, les « faux » d'abord, par pages de 50 : A1 compte à lui seul
  ~5 100 cas et enterrerait les 6 dates dans le désordre. Les compteurs servent de navigation.
- **La mention « Un import propose une valeur »** est cherchée page par page (50 billets), et disparaît
  sans bruit tant que les tables de #66 n'existent pas.

### Les chiffres de la première vérification (données du 15/09, banc)

| A1 | A4 | A5 | B1 | C1 | C2 | C3 | C5 | D1 | D3 | E1 | A2, A3, C4, D2, E2 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 143 | 242 | 25 | 76 | 6 | 59 | 1 | 19 | 423 | 1 152 | 28 | 0 |

Soit **7 174 constats en 0,2 s**. Recoupés un à un avec un décompte fait à part (script Node sur les
mêmes données). E1 : 26 billets en « Angleterre », absent de la liste des pays.
**Après l'ajustement de D1 et D3** (15/09) : D1 = 1, D3 = 3, soit ~5 600 constats.

### Vérifié

- **45/45 essais SQL** sur le banc : les chiffres ci-dessus, relance sans doublon, fiche corrigée →
  « corrigé » d'office, fiche remodifiée → rouvert, le détail suit la fiche, accepter (commentaire
  obligatoire) / rouvrir, droits (anonyme, membre, admin inactif ; écriture et insertion directes),
  vérification par l'API sous le plafond de 3 s du rôle anon (≈ 0,2 s), retrait d'un contrôle ;
- **banc navigateur, 59/59** : la vraie page, le vrai `global.js` et le vrai script dans jsdom,
  branchés sur un **vrai PostgREST** devant ce Postgres (vraie RLS, vraies requêtes) — base sans
  migration, compteurs et gravités, pages, lien vers la fiche, mention d'import et arrivée par ce lien,
  accepter / rouvrir, relance, décisions et journal de #66, membre qui force l'adresse, nom de billet
  piégé en HTML affiché comme du texte ; aucune erreur de script.

**Non vérifié** : vrai navigateur, téléphone, mode sombre à l'œil ; le temps d'une relance depuis
l'écran en production (1,3 s pour la première, qui créait tout ; le plafond du rôle anon est de 3 s).
