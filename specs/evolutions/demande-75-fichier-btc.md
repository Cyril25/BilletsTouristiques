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
| btc connaît deux Anniversary (filtre V.I.P. : « 2020 » et « 10 years ») ; **aucune mention du doré** n'a été vue | Voir Q1 et Q2 |
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
| Billet | Amorce ; Millésime ; Titre ; Sous-titre ; Statut (Disponible / Épuisé) ; Tirage ; Tirage (nombre) ; Anniversary (oui / vide) ; Série Anniversary ; Séries / numérotation ; Représente |
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
| `variante` | `A` si la fiche porte une ligne « Série Anniversary » ; **sinon** `null` | **Q1** : l'absence d'Anniversary vaut-elle « pas de variante » (`N`) ? **Q2** : le doré |
| `normale` | `null` | btc ne dit pas explicitement qu'un billet n'existe pas en normal ; une numérotation Anniversary *incluse* dans la série principale (`004001 à 005000` dans `000001 à 005000`) laisse penser que le normal existe, mais ce n'est pas écrit. `null` ne propose rien ; à revoir avec les chiffres du lot 2 |
| `champs` | Titre → `NomBillet`, Pays, Ville | seulement pour un billet absent chez nous (« nouveau billet à créer ») |
| `origine` | la ligne btc complète | preuve de ce qu'a dit la source |

**Rien d'autre n'est comparé** : c'est la règle de #66 (Q3 du 14/09 — la clé, puis la version normale
et la variante). Tirage, GPS, cote, images, éditeur **sont dans le fichier, pas dans l'import**. Leur
usage éventuel sur notre site est une autre question (Q5).

## Découpage

| Lot | Contenu | Dépend de |
|---|---|---|
| **0** *(fait, 24/09)* | L'outil, l'essai sur 10 billets | — |
| **1** | Extraction complète (liste, carte, fiches, images, Excel) | validation de cette analyse ; Cyril prévenu du lancement |
| **2** | Conversion en fichier normalisé, **aperçu** #66 (ne modifie rien) : combien d'identiques, de « à compléter », de contradictions, de nouveaux, d'ambigus | lot 1, Q1 à Q3 |
| **3** | Import réel par #66 ; les admins arbitrent dans « Vérification des billets » | lot 2 relu par Cyril |
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
| **Q1** | Un billet btc **sans** série Anniversary : peut-on en conclure « pas de variante » (`N`) ? | Cyril | **Non, pas au premier import** : `null`, qui ne propose rien. btc ne note peut-être pas le doré (Q2) ; conclure `N` fermerait les variantes de billets qui en ont une. À revoir avec les chiffres du lot 2 |
| **Q2** | Comment btc signale-t-il un **doré** ? Rien vu sur 10 billets ni dans ses filtres | Cyril | Chercher « doré » / « gold » dans les ~5 500 fiches gardées après le lot 1, sans retourner sur le site |
| **Q3** | « Anniversary 2020 » et « Anniversary 10 years » : les deux sont-ils notre `A` ? | Cyril | Oui, tous deux `A`, le libellé exact reste dans `origine` |
| **Q4** | Garder l'**ID btc** sur nos fiches billets (nouvelle colonne), pour un lien direct et un rapprochement qui survit à un changement de clé ? | Cyril | Oui, mais **en demande à part** : c'est un changement de notre modèle, que #66 ne sait pas faire |
| **Q5** | Tirage, GPS, cote, où acheter, **images** : les utiliser sur notre site ? | Cyril | Demande à part, avec une vraie question de droits pour les images (propriété de btc ou des éditeurs). En attendant, elles servent à Cyril |
| **Q6** | Le **réimport de la collection** de Cyril depuis btc | Cyril | Demande à part : autre fichier (la page « Gérer » de btc, pas encore étudiée), autre table (`collection`) |

## Réalisation

**Lot 0, 24/09** : `aspirer.py` et l'essai de 10 billets, dans
`C:\Users\csamson\Documents\Perso\GitHub\btc-export\` (hors dépôt). Rapprochement de l'essai avec notre
base : 10/10, en lecture seule.
