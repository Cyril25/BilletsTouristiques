# Demande #75 — Construire le fichier de billets-touristiques.com (« btc »)

- **Complexité :** L (tri du 2026-09-24).
- **Demande :** #75, déposée par Cyril le 2026-09-23, priorité normale : « Vérifier et consolider les
  données avec les données de billets-touristiques.com ».
- **Liée à #66**, qui a construit **la mécanique** (table d'import, rapprochement par clé, arbitrage des
  admins, journal) et attendait sa première vraie source. **La 75 construit le fichier** que cette
  mécanique lira. Liée aussi à **#67** : le fichier reste sur le poste de Cyril, jamais dans un dépôt.
- **Statut :** analyse écrite le 2026-09-24 à partir d'une séance de travail **en direct** avec Cyril
  (23-24/09), hors du circuit des demandes — d'où cette spec après coup. L'outil d'extraction existe et
  a tourné sur **10 billets** (essai). **L'extraction complète n'est pas lancée** : elle attend la
  validation de cette analyse.
- Version en clair pour les relecteurs : `demande-75-fichier-btc-en-clair.md`.

## Contexte (demande et séance du 23-24/09)

La demande tient en une ligne. Ce que Cyril en a dit pendant la séance :

> L'idée c'est d'extraire un max d'info, même celle qu'on ne voit pas à l'œil nu (peut-être y a-t-il un
> id pour chaque billet ?). L'idée, c'est de pouvoir ensuite réussir à faire un lien entre un billet sur
> notre site et un billet sur l'autre site. […] Quand je ferai l'export de ma collection sur ce site, je
> voudrais qu'on puisse le réimporter de manière simple dans ma collection sur mon site.

Et : « on arrive à extraire les images aussi ? », puis « la 66 c'est pour la mécanique, la 75 on
construit le fichier ».

## Le terrain, vérifié le 2026-09-23 / 24

| Constat | Conséquence |
|---|---|
| btc est un site d'abonnement (Cyril paie 2 €/mois). Catalogue d'environ **5 475 billets** (219 pages de 25) | Une source large, de loin la plus complète disponible |
| **Aucun export utile** : un lien « pdf » sur la page Liste, 5 colonnes seulement (dép., amorce, millésime, ville, titre) ; rien dans la FAQ | Il faut lire le site page par page |
| Les conditions d'utilisation ne disent rien de l'extraction, ni pour l'autoriser ni pour l'interdire | Usage **personnel** de Cyril, avec son compte, à un rythme qui ne charge pas le site ; rien de btc n'est republié |
| La connexion se fait avec l'**identifiant** (pseudo), pas l'adresse mail. Le site bloque après **3 essais** ratés | Le script s'arrête au premier refus, sans réessayer |
| Chaque billet a un **identifiant btc** stable : `billet-4792`. Rien d'autre de caché dans la fiche (métadonnées vérifiées) | C'est la clé côté btc |
| La clé btc « amorce + millésime » (`HEAE` + `2025-3`) est **notre clé** `Reference` + `Millesime` + `Version` (`HEAE` / `2025` / `3`) écrite autrement | Le rapprochement se fait sans table de correspondance |
| Le **pays** n'est pas sur la fiche : seulement via le filtre de la liste (76 pays) | La liste se lit pays par pays |
| La page carte interroge `carteosm_ajax.php`, qui renvoie **les coordonnées GPS de tout le catalogue en une requête** : 4 740 billets sans connexion, **5 127 connecté**, et plus précises (le monument, pas le centre-ville) | L'information « invisible » la plus intéressante ; une seule requête |
| **Connecté**, la fiche montre en plus : les séries **Anniversary** et leur numérotation, la description complète, l'éditeur, la **cote**, **où acheter** (diffuseur, VPC, prix), l'état dans la collection btc | L'extraction se fait avec le compte de Cyril |
| btc connaît deux Anniversary (filtre V.I.P. : « 2020 » et « 10 years ») ; **aucune mention du doré** n'a été vue | Voir Q1 et Q2, tranchées le 24/09 : btc ne suit pas les dorés |
| Images recto et verso en grand format, environ 100 Ko chacune | Environ **1 Go** pour le catalogue |

## L'outil

`aspirer.py`, dans `C:\Users\csamson\Documents\Perso\GitHub\btc-export\` — **hors de tout dépôt**, et
volontairement : ce dépôt est public, et un fichier de données btc n'y entre jamais (#67). Les accès
de Cyril sont lus dans `~/.claude/secrets/billets-touristiques-com.json`.

| Phase | Ce qu'elle fait | Volume, durée estimée |
|---|---|---|
| `liste` | Filtre pays par pays, parcourt les pages (`listerech_filtre.php`, `liste_ajax.php`), puis la liste complète pour repérer un billet sans pays → `liste.json` | ~300 requêtes, 5 min |
| `fiches` | La carte GPS (une requête → `carte.json`), puis chaque fiche `billet-<id>`, **gardée telle quelle** dans `fiches/` | ~5 500 requêtes, 1 h 30 |
| `images` | Recto et verso en grand format → `images/<id>_recto.jpg` | ~11 000 requêtes, 2 h 30, 1 Go |
| `excel` | Lit les fiches gardées, **hors ligne**, et produit le classeur | quelques secondes |
| `annonces` *(24/09)* | Chaque page `objetrecap-<id>` (qui propose, qui cherche) dans `recaps/`, puis trois classeurs — **en attente de Q7** | ~5 500 requêtes, 1 h 30 |
| `essai` | Les mêmes phases sur 10 billets (5 France, 5 Slovénie dont un Anniversary), dans `essai/` | 2 min |

- **0,8 s de pause** entre deux requêtes, reprise avec attente croissante sur erreur.
- **Reprise** : une fiche ou une image déjà là n'est pas redemandée. Une coupure ne coûte rien.
- **Les fiches brutes sont gardées** : une information qu'on découvrirait plus tard se relit sans
  retourner sur le site.
- Une seule session à la fois : ouvrir une seconde connexion avec le même compte pourrait couper la
  première.

## Le fichier produit

Une ligne par billet btc. Les colonnes, dans l'ordre :

| Groupe | Colonnes |
|---|---|
| Clé | ID btc ; Clé (amorce millésime) ; Année ; Version |
| Lieu | Pays ; Code pays ; Dép./Zip ; Ville ; Latitude ; Longitude |
| Billet | Amorce ; Millésime ; Titre ; Sous-titre ; Statut (Disponible / Épuisé) ; Tirage ; Tirage (nombre) ; Variante (`anniv` / vide) ; Série Anniversary ; Séries / numérotation ; Représente |
| Autour | Éditeur ; Éditeur (coordonnées) ; Où acheter le billet touristique ; Remarques ; Cote / Prix ; Catégories |
| Cyril | Ma collection (état btc) ; Visuels (adresses) ; Image recto ; Image verso ; Lien |

Toute rubrique de fiche que le lecteur ne connaît pas devient **une colonne de plus** plutôt que
d'être perdue : c'est ainsi que « Où acheter » a été trouvée pendant l'essai.

## L'essai du 24/09 : 10 billets

- 10 fiches, 20 images, 10 billets géolocalisés sur 10 sauf UEMQ 2018-1 (« Christmas », sans ville).
- **Les 10 existent chez nous, sous la même clé** (lecture seule par le Worker).
- Les deux billets Anniversary de l'essai, **UEKV 2025-2** et **HEAE 2025-3**, ont chez nous
  `HasVariante` **non renseigné** : exactement l'écart `a_completer` que #66 sait traiter.

## Vers la mécanique de #66 : le fichier normalisé

`scripts/import-billets.mjs` attend un élément par ligne : `Reference`, `Millesime`, `Version`,
`normale`, `variante`, `champs`, `origine`. Conversion proposée depuis btc :

| Champ #66 | Depuis btc | Remarque |
|---|---|---|
| `Reference` | Amorce | tel quel ; #66 normalise la casse et les espaces |
| `Millesime`, `Version` | Millésime `2025-3` coupé au tiret | une amorce ou un millésime atypique (`IS--`, pas de tiret…) donne une clé illisible → `ambigu` dans #66, jamais une supposition |
| `variante` | `A` si la fiche porte une ligne « Série Anniversary » ; ~~**sinon** `null`~~ sinon `N` pour un billet de 2015 à 2024, `null` pour 2025-2026 (**revu le 01/10**, voir « Le lot 2 ») | Q1 et Q2 : btc ne suit pas les dorés ; jamais de `D` depuis btc |
| `normale` | `null` | btc ne dit pas explicitement qu'un billet n'existe pas en normal ; une numérotation Anniversary *incluse* dans la série principale (`004001 à 005000` dans `000001 à 005000`) laisse penser que le normal existe, mais ce n'est pas écrit. `null` ne propose rien ; à revoir avec les chiffres du lot 2 |
| `champs` | Titre → `NomBillet`, Pays, Ville | seulement pour un billet absent chez nous (« nouveau billet à créer ») |
| `origine` | la ligne btc complète | preuve de ce qu'a dit la source |

**Rien d'autre n'est comparé** : c'est la règle de #66 (Q3 du 14/09 — la clé, puis la version normale
et la variante). Tirage, GPS, cote, images, éditeur **sont dans le fichier, pas dans l'import**. Leur
usage éventuel sur notre site est une autre question (Q5).

## Les réponses de Cyril *(24/09, commentaire sur la fiche)*

> Chez nous, on ne fait pas la différence entre anniversary 2020 et anniversary 10 years, ce sont pour
> nous des « anniv », et les dorés sur btc, ils ne les prennent pas en compte. Dans tous les cas, un
> billet ne peut être qu'en deux versions maximum : une version normale, et une variante s'il y en a
> une (de type anniv, ou dorée).

Q1, Q2 et Q3 sont tranchées (voir « Questions ouvertes »). Ce que ça change :

- **La colonne « Anniversary » (oui / vide) devient « Variante »** (`anniv` / vide). Elle ne se base
  plus que sur une vraie ligne « Série Anniversary » de la fiche. ~~Une remarque qui citait
  « anniversary » suffisait à mettre « oui »~~ : c'était trop large (« voir aussi le billet
  anniversary… »), et c'est ce qui aurait été proposé en `A` à #66.
- **btc ne produira jamais de doré** (`D`) : un billet doré ne se corrige pas depuis cette source. Et
  l'absence d'Anniversary ne permet pas de conclure « pas de variante » : ce pourrait être un doré.
- La règle « deux versions au plus » est déjà celle de #66 (`VersionNormaleExiste` + `HasVariante`).

## Les annonces des membres btc *(ajouté le 24/09, second commentaire de Cyril)*

> Il y a des pages « objetrecap-xxxx » sur lesquelles on a des infos qui nous intéressent fortement !
> J'aimerais récupérer dans un autre fichier Excel l'ensemble des pseudos des membres […], un fichier
> qui liste « qui propose » quoi, et un autre pour « qui demande » quoi, avec les infos pertinentes :
> quelle version, quel numéro, ou si indifférent.

**Ce que la page contient** (vérifié sur deux billets) : pour chaque membre qui propose le billet, son
pseudo, le numéro exact, vente ou échange, depuis quand, le prix et un commentaire libre ; pour chaque
membre qui le cherche, le nombre d'exemplaires, et pour chacun la version (normale ou Anniversary) et
le numéro — précis, « indifférent » ou « se termine par 60 ». Et, pour tous, la **date de fin de leur
adhésion btc**. Une annonce saisie deux fois sur btc reste en double : le fichier reflète le site.

**Ce qui est prêt** : la phase `annonces` d'`aspirer.py` (une requête `objetrecap-<id>` par billet,
~5 500 requêtes, 1 h 30 de plus), et trois classeurs : `btc-membres.xlsx` (pseudo, fin d'adhésion,
nombre de billets et d'exemplaires proposés et cherchés, liens vers ses listes et sa messagerie btc),
`btc-qui-propose.xlsx` et `btc-qui-cherche.xlsx` (une ligne par annonce, avec la clé du billet).

**Ce qui n'est pas fait, et pourquoi** : ces fichiers ne décrivent plus des billets, mais **des
personnes** — plusieurs milliers de membres de btc qui ne sont pas les nôtres, avec ce qu'ils vendent,
à quel prix, et jusqu'à quand ils sont abonnés. Un pseudo, rattaché à ces informations, est une donnée
personnelle. Ces membres ont publié leurs annonces **pour les membres de btc**, sur btc. Les extraire
en bloc vers un fichier à nous est un autre usage, qu'ils n'ont pas prévu. D'où Q7 : **l'usage
prévu** doit être écrit avant de lancer la phase. Il décide de ce qu'il est raisonnable d'extraire :

| Usage | Ce qui suffirait |
|---|---|
| Savoir **quels billets** circulent, sont recherchés, à quel prix (statistique du marché) | Les annonces **sans pseudo** : des comptes par billet et par version, des prix |
| Trouver un billet qui manque à Cyril, ou à qui proposer ses doubles | Les annonces des seuls billets qui l'intéressent — ce que btc lui offre déjà, billet par billet |
| Constituer une **liste de membres btc à contacter** (inviter dans le groupe, démarcher) | À déconseiller : c'est précisément l'usage que les membres n'ont pas accepté, et la messagerie de btc n'est pas faite pour ça |

La lenteur voulue, l'usage personnel et le fait que rien ne sort du poste de Cyril restent valables,
mais ne répondent pas à la question de l'usage.

### L'usage, précisé par Cyril *(24/09)*

> C'est pour faire une liste des collectionneurs qui proposent des billets que je n'ai pas, et une
> liste des collectionneurs qui cherchent des billets que j'ai. Au final c'est le principe du site,
> c'est juste pas facile à voir.

C'est la deuxième ligne du tableau ci-dessus, **en plus lisible** que billet par billet : l'usage pour
lequel btc publie ces annonces, par un de ses membres.

~~Le fichier le sert directement : une étape `croiser` lit la collection de Cyril sur notre site et
produit `btc-a-acquerir.xlsx` et `btc-a-ceder.xlsx`.~~ **Retiré le 24/09, à la demande de Cyril** :
« les fichiers Excel me permettront de faire le croisement moi-même ». Il le fera à partir des trois
classeurs ; la copie locale de sa collection a été supprimée. La colonne « Ma collection » du
classeur des billets reflète la collection **btc** de Cyril, qu'il dit ne pas tenir à jour : à ne pas
prendre pour sa vraie collection.

Les trois classeurs (membres, qui propose, qui cherche) sont le livrable.
**Rien de ces fichiers n'entre dans notre base** ni ne sert à un envoi groupé : un contact se fait
par la messagerie de btc, un par un, pour un échange.

## Les précisions de Cyril avant l'extraction complète *(24/09)*

**Pas d'images pour le moment.** « On verra juste celles qui manquent sur le site, mais plus tard. »
L'étape `images` n'est plus dans `tout` ; elle reste lançable seule. ~1 Go et 2 h 30 de moins.

**Les Anniversary proposées existent, btc ne les étiquette pas.** Cyril s'étonnait que personne n'en
propose. Dans les propositions, btc n'affiche que le numéro ; l'étiquette « Anniversary 10 years »
n'apparaît que dans les recherches. Or une série Anniversary est **numérotée dans une plage de la série
principale** (UEKV 2025-2 : `004001 à 005000` dans `000001 à 005000`). Sur l'essai, **12 des 24
propositions** des deux billets Anniversary ont un numéro dans cette plage. D'où une colonne
« Anniv d'après le numéro » dans les deux classeurs d'annonces : `oui (étiquetée)` quand btc le dit,
`oui` / `non` d'après la plage lue dans la fiche du billet, vide quand on ne peut pas savoir (numéro
indifférent ou billet sans Anniversary). C'est une **déduction** : un numéro mal saisi sur btc la
trompe. Elle reste dans les fichiers de Cyril, elle ne va pas dans l'import #66.

**Ajouter en route les informations qui n'apparaissent que sur certains billets.** Déjà le cas pour les
fiches : une rubrique inconnue devient une colonne (« Où acheter » est venue ainsi). Pour les annonces,
une étiquette de version inconnue va dans « Particularité ». Le script liste à la fin **ce qu'il a
rencontré** (rubriques en plus, étiquettes, modes de vente) : c'est ce relevé qui dira quoi ajouter,
à relire après l'extraction complète.

**L'adresse mail des membres btc : non.** Cyril demandait si on peut l'obtenir, le formulaire de btc
étant peu pratique. btc ne l'affiche nulle part dans ce qui a été lu (fiches, pages « Gérer ») : le
contact passe par sa messagerie, **c'est un choix du site** pour protéger ses membres. Aller la
chercher ailleurs, ou la déduire, reviendrait à contourner ce choix pour des milliers de personnes qui
ne l'ont donnée qu'à btc. **L'outil ne la cherche pas**, et ce n'est pas une limite technique à lever.
Ce qui est dans les fichiers : le lien « Lui écrire sur btc » de chaque membre, qui ouvre directement
le formulaire. Un membre qui veut échanger par mail donnera son adresse dans sa réponse.

## Le lot 2 : mettre à jour les variantes non renseignées *(30/09 – 01/10)*

**Objectif de Cyril** : corriger les **5 144** billets dont la variante est « non renseigné » (tous en
`NULL` dans la base, aucun en chaîne vide), grâce au fichier btc, **sans rien casser**. Les alertes
(lignes d'information dans « Qualité des billets ») viennent dans un second temps.

### Ce que disent les données (lecture seule, 30/09)

Notre base : 5 543 billets ; variante `NULL` 5 144, `D` 297, `N` 51, `A` 51 ; version normale fausse
pour 6 seulement. Rapprochement par la clé de #66 : 5 060 clés uniques des deux côtés, 94 clés en double
chez nous (les « Revers B »), 7 chez btc.

**Les dorés n'existent chez nous qu'en 2025 (3) et 2026 (294), aucun avant.** Les Anniversary de btc
portent sur 2020-2022 (« Anniversary 2020 ») et 2025 (« 10 years »).

**btc ne range pas les dorés en Anniversary** (hypothèse de Cyril, testée le 01/10) : de nos 284 dorés
connus de btc, 280 n'y ont rien, 4 y ont une Anniversary. **Et btc oublie parfois une Anniversary** : 5
de nos 47 « anniv » connus de btc n'y ont rien (HEAG 2025-1, REAC 2025-1…).

### Les règles, décidées par Cyril le 01/10

| Chez nous | Chez btc | On fait | Nombre (30/09) |
|---|---|---|---|
| non renseigné | Anniversary | **A**, appliqué d'office (`a_completer`) | ≈ 1 530 |
| non renseigné | rien, billet de **2015 à 2024** | **N**, appliqué d'office | ≈ 3 100 |
| non renseigné | rien, billet de 2025-2026 | rien : peut-être un doré (alerte, second temps) | ≈ 170 |
| `N` | Anniversary | **A**, par un admin dans le module (`contradiction`) | 2 (PLBR 2025-2 et 2025-3) |
| `N` | Anniversary, billet protégé | rien : D12 refuse de changer une valeur déclarée (alerte) | 1 (EEEY 2025-3, 11 inscriptions) |
| `D` | Anniversary | **on laisse le doré** (`D`) (consigne de Cyril) | 4 |
| `A` / `D` / `N` | rien | rien : une valeur renseignée n'est jamais retirée | — |
| absent de btc, clé en double, clé illisible | — | rien (alertes, second temps) | ≈ 340 |

Soit **≈ 4 630 des 5 144** non renseignés corrigés. Le reste attend les alertes.

**Le risque assumé de la règle des années** : 2015-2019 et 2023-2024 n'ont eu ni Anniversary ni doré,
« pas de variante » y est certain (≈ 2 550). Pour 2020-2022 (≈ 550), btc a pu oublier une Anniversary 2020
comme il en oublie en 2025 (1 sur 10) : une cinquantaine d'erreurs possibles, sur de vieux billets presque
tous sans inscription, donc corrigeables dans la fiche billet. Cyril l'accepte.

### Le fichier pour #66

**Seulement les lignes qui proposent quelque chose** : les ≈ 3 300 billets où btc ne dit rien en
2025-2026, les absents et les doublons n'y entrent pas — ils ne feraient que du bruit dans le module, et
les 325 billets btc inconnus chez nous arriveraient tous en « nouveau billet à créer », alors que la
plupart sont des versions numérotées autrement (exemples revus avec Cyril le 30/09 : XERU 2018-6-ES,
XEMM 2018-1, LEBG 2020-1A…) — les créer ferait des doublons.

**Deux sources distinctes**, pour que le journal de #66 dise d'où vient chaque correction :
`btc` pour les `A` (dit par btc), `btc + règle des années` pour les `N` (déduit). `normale` reste `null`
partout. `origine` porte la ligne btc et, pour les `N`, la règle appliquée.

### Ce qui est touché, et seulement ça

`importer_billets()` n'écrit que dans `billets`, colonnes `VersionNormaleExiste` et `HasVariante` ; ici
**uniquement la variante** (`HasVariante`). Déclencheurs réveillés par cette mise à jour : D12 (**lit** les
inscriptions), `trg_billets_sync_date_effective` (**lit** les collectes, recalcule `date_effective` du
billet lui-même — à vérifier sur banc qu'aucune date ne bouge), rien d'autre (`trg_billets_categorie_manuelle`
ne part que sur `Categorie`). **Aucune écriture dans les collectes ni les inscriptions** — question de Cyril, 01/10.
Le `scope` d'une collecte existante est figé à sa création : il ne suit pas la variante du billet.

### La sécurité, dans l'ordre *(demande de Cyril, 01/10 : « très important d'éviter les problèmes de données »)*

1. **Analyse validée** sur la fiche (convention, demande L).
2. **Fichier normalisé** produit sur le poste de Cyril, hors dépôt (#67).
3. **Aperçu #66 en production** (`import-billets.mjs apercu`) : ne modifie rien ; ses chiffres doivent
   retomber sur ceux ci-dessus, sinon on s'arrête et on comprend.
4. **Répétition générale sur banc** (Postgres + PostgREST en Docker, données de production du jour) :
   import complet, puis contrôles — nombre de billets modifiés, aucune `date_effective` changée, aucune
   collecte ni inscription touchée, écran « Incohérences » avant/après — puis **test du retour arrière**.
5. **Dump complet** de la base de production (`scripts/backup-supabase.ps1`, Session pooler, **VPN coupé**
   par Cyril), juste avant le premier lot.
6. **Copie ciblée** `id, HasVariante, VersionNormaleExiste, date_effective` de tous les billets, prise
   juste avant chaque lot : c'est elle qui sert au retour arrière précis.
7. **Import par lots** : ~50 billets d'abord, que Cyril regarde sur le site ; puis les `A` ; puis les `N`.
8. **Contrôle après chaque lot** : compte des billets modifiés contre l'aperçu, écran « Incohérences »,
   journal de #66.

**Retour arrière** : pour un import, remettre `HasVariante` à sa valeur d'avant (`valeurs_base` des lignes
appliquées), **seulement** sur les billets qui n'ont pas été modifiés depuis ; script préparé et essayé
sur banc **avant** le premier lot. En dernier recours, le dump.

## Découpage

| Lot | Contenu | Dépend de |
|---|---|---|
| **0** *(fait, 24/09)* | L'outil, l'essai sur 10 billets | — |
| **1** | Extraction complète (liste, carte, fiches, annonces, Excel) — ~~images~~ plus tard (24/09) | validation de cette analyse ; Cyril prévenu du lancement |
| **2** | Conversion en fichier normalisé, **aperçu** #66 (ne modifie rien) : combien d'identiques, de « à compléter », de contradictions, de nouveaux, d'ambigus | lot 1 ; ~~Q1 à Q3~~ tranchées le 24/09 |
| **3** | Import réel par #66, par lots, avec dump et copie ciblée avant (voir « Le lot 2 ») ; les admins arbitrent les 2 contradictions dans « Vérification des billets » | lot 2 relu par Cyril, répétition sur banc réussie |
| **5** *(second temps)* | Les **alertes** : une ligne d'information dans « Qualité des billets » (« quelque chose cloche », la raison, le lien vers btc), sans accepter ni refuser. Cas déjà nommés par Cyril le 30/09 : version à corriger (XERU), billets à fusionner (XEMM), billet à créer (VEAB 2026-1), séries spéciales et amorces atypiques à vérifier, 2025-2026 peut-être dorés, EEEY 2025-3, dorés que btc dit Anniversary | lot 3 ; nouveau type de ligne à développer |
| **4** *(24/09)* | Les annonces des membres btc : phase `annonces`, trois classeurs ; ~~le croisement avec la collection de Cyril~~, retiré : il le fait lui-même | ~~Q7~~ tranchée ; **lancé par Cyril lui-même** (l'outil de sécurité de l'assistant bloque la collecte de données de tiers) |
| *Hors 75* | L'ID btc sur nos fiches (Q4), l'usage des images et du reste (Q5), le réimport de la collection (Q6) | décisions de Cyril |

## Critères d'acceptation

1. L'extraction complète couvre tout le catalogue btc : le nombre de billets du fichier égale celui de
   la liste complète du site, et chacun a un pays ou est signalé sans pays.
2. Chaque ligne porte l'ID btc et la clé amorce + millésime.
3. Une coupure en cours d'extraction se reprend sans redemander ce qui est déjà là.
4. Un refus de connexion arrête le script au premier essai.
5. Aucun fichier btc (fiches, liste, images, classeur) n'entre dans un dépôt git.
6. Le fichier normalisé passe l'**aperçu** de #66 sans erreur, et ses chiffres sont reportés ici avant
   l'import réel.
7. Une Anniversary btc sur un billet « non renseigné » chez nous arrive en « à compléter → A » dans
   #66 ; une clé btc illisible arrive en « ambigu ».

## Ce que cette spec ne fait pas

- **Pas de nouvelle mécanique d'import** : c'est #66.
- **Pas de comparaison** d'autres champs que la version normale et la variante (#66, Q3).
- **Pas de republication** de données ou d'images btc sur notre site : Q5.
- **Pas de réimport de la collection** de Cyril : Q6.
- **Pas d'extraction automatique récurrente** : chaque extraction est lancée par Cyril.

## Sécurité et courtoisie

- Le mot de passe btc de Cyril est passé en clair dans la conversation du 23/09 : **à changer** une fois
  l'extraction faite (puis mettre à jour le fichier de `~/.claude/secrets`).
- Rythme lent, une seule session, identification honnête du client (`User-Agent` « export-perso »).
- Si btc proposait un jour un export, ou si son webmaster préférait qu'on le lui demande, cette
  extraction n'aurait plus lieu d'être.

## Questions ouvertes

| | Question | Pour qui | Recommandation |
|---|---|---|---|
| ~~Q1~~ | ~~Un billet btc sans série Anniversary : peut-on en conclure « pas de variante » ?~~ | Cyril | ~~**Tranchée le 24/09 : non.**~~ **Revue le 01/10 : oui pour 2015-2024, non pour 2025-2026.** Le « non » du 24/09 venait de ce que btc ignore les dorés ; mais nos données montrent qu'aucun doré n'existe avant 2025 (voir « Le lot 2 ») |
| ~~Q2~~ | ~~Comment btc signale-t-il un doré ?~~ | Cyril | **Tranchée le 24/09 : il ne le signale pas** — « les dorés sur btc, ils ne les prennent pas en compte ». Aucun `D` ne viendra de btc |
| ~~Q3~~ | ~~« Anniversary 2020 » et « Anniversary 10 years » : les deux sont-ils notre `A` ?~~ | Cyril | **Tranchée le 24/09 : oui**, « ce sont pour nous des anniv ». Le libellé exact reste dans `origine` et dans la colonne « Série Anniversary » |
| **Q4** | Garder l'**ID btc** sur nos fiches billets (nouvelle colonne), pour un lien direct et un rapprochement qui survit à un changement de clé ? | Cyril | Oui, mais **en demande à part** : c'est un changement de notre modèle, que #66 ne sait pas faire |
| **Q5** | Tirage, GPS, cote, où acheter, **images** : les utiliser sur notre site ? | Cyril | Demande à part, avec une vraie question de droits pour les images (propriété de btc ou des éditeurs). En attendant, elles servent à Cyril |
| **Q6** | Le **réimport de la collection** de Cyril depuis btc | Cyril | Demande à part : autre fichier (la page « Gérer » de btc, étudiée le 24/09 pour les annonces, voir plus haut), autre table (`collection`) |
| ~~Q7~~ *(24/09)* | ~~Les annonces des membres btc : pour quoi faire ?~~ | Cyril | **Tranchée le 24/09** : trouver avec qui échanger — ce pour quoi btc publie ces annonces. Cyril fera lui-même le croisement avec sa collection (voir « L'usage, précisé par Cyril ») |

## Réalisation

**Lot 0, 24/09** : `aspirer.py` et l'essai de 10 billets, dans
`C:\Users\csamson\Documents\Perso\GitHub\btc-export\` (hors dépôt). Rapprochement de l'essai avec notre
base : 10/10, en lecture seule.

**24/09, après les commentaires de Cyril** : colonne « Variante » (`anniv` / vide) à la place de
« Anniversary » ; phase `annonces` et ses trois classeurs écrits et vérifiés sur les pages de deux
billets (UEGF 2022-1 : 19 propositions, 10 recherches ; HEAE 2025-3), **pas lancés** (Q7).

**Essai des annonces, 24/09, lancé à la demande de Cyril** (10 billets) : 123 propositions,
173 recherches, 78 membres, aucune colonne à trous. L'essai a révélé une troisième étiquette de
version, à côté des deux Anniversary : **« PARTICULARITÉ »** (un billet cherché pour un défaut ou une
singularité), rangée dans une colonne « Particularité » ; toute étiquette inconnue y irait aussi. Les
modes « Vente / Échange / Autre » sont repris tels que btc les affiche.

**Extraction complète, 24/09** — liste à 11 h 11 : **5 461 billets, 0 sans pays** (le passage pays par
pays et la liste complète donnent le même total) ; GPS : 5 127. **Le site est lent** : ~3,5 s par page
publique, ~6 s connecté, mesuré sans VPN comme avec (connexion 0,025 s : c'est le serveur qui
calcule). L'estimation de 3 h ignorait ce temps, que l'essai montrait déjà : ~20 h pour fiches et
pages « Gérer ».

**Option 1, choisie par Cyril le 24/09 à 19 h** : ne plus télécharger les fiches (2 451 gardées), seulement
les pages « Gérer », dont le bloc « Fiche technique » a la même structure. Comparaison champ par champ
sur les 10 billets de l'essai (fiche contre page « Gérer ») : **seules les catégories et l'état « Ma
collection » btc diffèrent** ; tirage, séries, variante, description, éditeur, remarques, cote, où
acheter, statut et visuels sont identiques. Les catégories viennent alors du filtre de la liste (66
catégories, étape `categories`) ; l'état « Ma collection » n'est pas fiable de l'aveu de Cyril. Colonne
« Lu dans » (fiche / page Gérer). Gain : ~3 000 pages et ~6 h de moins.

### Lots 2 et 3 : les variantes mises à jour en production *(04/10)*

**Fait le 04/10, sur le feu vert de Cyril à chaque étape.** Données relues le jour même (5 544 billets).

| Étape | Résultat |
|---|---|
| Fichiers normalisés (`btc-export/normaliser_pour_66.py`, hors dépôt) | 4 535 lignes : pilote 25 + 25, puis `anniv` 1 507 (dont les 2 PLBR) et `pas-de-variante` 2 978 ; 393 clés écartées (absentes ou en double), 525 sans proposition |
| Aperçu #66 en production | 4 533 corrections d'office + 2 contradictions, 0 ambigu, 0 absent, 0 empêchement — exactement le plan |
| **Dump** (Cyril hors VPN) | `pg_dump` du schéma `public` par Docker, mot de passe dans un fichier d'environnement temporaire supprimé aussitôt (jamais en argument : alertes Elastic du 15/09). Vérifié relisible : 28 tables avec données, 96 fonctions, 18 triggers, 101 policies. Rangé hors dépôt avec les photos ci-dessous |
| **Répétition générale** sur une copie (dump restauré dans `supabase/postgres:17.6.1.165`, comme la prod) | Collectes, inscriptions et billets hors variante identiques ; 4 533 changements `NULL>A` 1 530 / `NULL>N` 3 003 ; contrôles #69 : seul A1 bouge (5 144 → 611), aucune nouvelle incohérence ; les 2 PLBR acceptés ; **retour arrière** : 4 535 billets remis, billets identiques à la photo avant, toutes colonnes |
| Lot pilote (imports n° 1 et 2) | 50 billets modifiés, exactement ceux du pilote, seule la variante ; 0 collecte, 0 inscription |
| Lot anniv (import n° 3) | 1 505 `NULL>A` appliqués, 2 contradictions PLBR en « à valider » |
| Lot « pas de variante » (import n° 4) | 2 978 `NULL>N` appliqués |

**Bilan global**, photo complète des trois tables avant le pilote contre après le dernier lot : **4 533
billets modifiés, seulement `HasVariante`, tous depuis `NULL`** (A 1 530, N 3 003) ; **0 collecte, 0
inscription, 0 billet ajouté ou retiré**. Variantes : `NULL` 5 144 → **611**, `A` 51 → 1 581, `N` 51 → 3 054,
`D` 298 inchangé.

**Ce que la répétition a appris** : retirer une variante déclarée (retour arrière) sur un billet qui a des
inscriptions est refusé par D12 ; le script de retour arrière la suspend le temps de son bloc, se contrôle
lui-même et annule tout si le compte diffère. Prêt, non utilisé.

**Comment les imports ont été lancés** : par le Worker (`import-billets.mjs importer`, clé de service),
jamais par une connexion directe à la base. Le classifieur de Claude Code a d'abord refusé l'écriture en
production ; Cyril a ajouté une autorisation limitée à cette seule commande
(`.claude/settings.local.json`, non versionné).

**Reste** : les 2 PLBR (2025-2 et 2025-3) à accepter par un admin dans « Vérification des billets » ; les
611 non renseignés et les alertes (lot 5) ; l'image des billets plus tard.
