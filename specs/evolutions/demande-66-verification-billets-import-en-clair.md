# Demande #66 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `a097f86` (14/09/2026, après la deuxième série de réponses de Cyril).
> La section « Ce qui est livré » reflète le développement du 15/09 (commits `186492a` et `d0e941d`).

## Ce qui est livré *(15/09)*

**L'écran existe** : menu **Administration → Qualité des billets**, onglet **« Vérification des
billets »**, à côté des incohérences de #69. La mise à jour de la base est installée depuis le 15/09 à
16 h 07 et la demande est « À tester ». **L'onglet restera vide jusqu'au premier fichier** : la lecture
de la première source se fera avec Cyril, quand elle arrivera.

**Une chose change dès maintenant, sans aucun fichier.** Sur la fiche d'un billet déjà collecté, la
variante était figée, même jamais renseignée. Elle peut maintenant être **choisie**, si elle n'a
jamais été saisie. Deux limites, voulues :

- « pas de variante » reste refusé si des variantes de ce billet ont déjà été collectées ;
- une variante **déjà renseignée** reste figée, comme avant.

**Ce qui a été précisé en le construisant :**

- si la fiche a été **modifiée entre l'import et votre décision**, rien n'est écrasé : la ligne vous
  montre les nouvelles valeurs, et c'est seulement au second clic, après relecture, que la correction
  se fait. Si quelqu'un a déjà corrigé la fiche exactement comme le fichier le proposait, la ligne se
  range toute seule dans « rien à faire » ;
- un **nouveau billet** dont le fichier ne dit pas s'il existe en version normale est proposé comme
  existant (c'est le réglage par défaut d'une fiche), et la ligne le signale ;
- un cas **ambigu** (doublon, ligne illisible) ne s'accepte pas : on corrige à la main dans Gestion
  Billets, puis on refuse la ligne en disant ce qui a été fait.

**Ce qu'il faudra regarder** : la variante d'un billet collecté qui se complète dans sa fiche ; et, au
premier fichier, l'écran sur téléphone et en mode sombre.

## Ce qui a changé depuis la première version

Cyril a répondu aux questions le jour même :

- **deux choix seulement : accepter ou refuser** — « ignorer » viendra plus tard si on en a besoin ;
- chaque décision peut porter **un commentaire** qui dit pourquoi ;
- un billet qu'on n'a pas passe par la liste, sous la forme **« nouveau billet à créer »** ;
- un **journal** montrera tout ce que l'import a changé, y compris ce qui a été corrigé d'office ;
- **on ne cherche pas encore les billets qu'on a et que le fichier n'a pas** : ce sera pour plus tard ;
- **pas de champ rendu obligatoire** à la saisie.

## De quoi il s'agit

Chaque billet a une fiche qui dit **s'il existe en version normale**, et **s'il a une variante** :
anniversaire, doré, ou pas de variante. Beaucoup de fiches sont restées sur **« non renseigné »**. Or
depuis que le billet et ses collectes sont séparés, ces informations servent partout — à commencer par
la gestion des collections.

Cyril dispose de temps en temps d'**un fichier venu de l'extérieur**, avec des informations sur
environ 5 000 billets. L'idée : **comparer ce fichier à nos fiches**, corriger ce qui ne fait aucun
doute, et laisser **les admins décider** du reste, dans un écran fait pour ça.

Cette analyse est écrite **sans avoir vu le fichier** : le format pourra changer d'une source à
l'autre. Elle porte sur ce qui ne dépend pas du format ; la lecture de chaque fichier se fera avec
Cyril, source par source.

## Ce qu'on a trouvé en regardant

- **Les fiches savent déjà tout dire.** Il n'y a rien à ajouter : le problème, ce sont les
  informations jamais saisies.
- **Aujourd'hui, un admin ne peut pas les saisir sur un billet déjà collecté.** Dès qu'un billet a des
  inscriptions, l'écran fige son type, et la base refuse de le changer — même quand il n'a jamais été
  renseigné. C'est une protection utile, mais elle explique sans doute une bonne partie des fiches
  incomplètes.
- **Des valeurs anciennes sont suspectes** : un vieux script a rempli la variante de dizaines de
  billets d'après leur seule année (2025 → anniversaire, 2026 → doré). Le fichier permettra de les
  vérifier.

## Comment ça se passera

1. Cyril indique dans une demande **où se trouve le fichier** sur son ordinateur (voir #67).
2. La première fois qu'arrive une source, l'assistant et Cyril regardent ensemble **comment la lire** :
   quelles colonnes correspondent aux nôtres, et comment reconnaître un même billet des deux côtés.
3. Cyril demande à l'assistant de **traiter le fichier**. L'assistant compare chaque billet du fichier
   à nos fiches, et range chaque différence dans **une liste de vérification**, à part des fiches.
4. **Ce qui ne fait aucun doute est corrigé tout de suite** (voir l'exemple plus bas).
5. **Tout le reste attend un admin**, dans un nouvel écran **« Vérification des billets »**.

### Dans l'écran de vérification

Pour chaque différence, Marie, admin, voit **nos valeurs et celles du fichier côte à côte**, et ce qui
est proposé. Elle **accepte** — la fiche est corrigée, ou le nouveau billet est créé, et il restera à
compléter sa photo et son thème — ou elle **refuse**. Dans les deux cas, elle peut écrire **pourquoi**.

Chaque décision garde qui l'a prise et quand. Si quelqu'un a modifié la fiche entre-temps,
l'application ne l'écrase pas : elle redemande. Et au prochain fichier, **une différence déjà refusée
ne revient pas**, sauf si le fichier a changé d'avis.

### Le journal

Un onglet de l'écran montre, pour chaque fichier traité, **tout ce qui a changé** : ce qui a été
**corrigé d'office** — la partie que personne n'a vue passer —, ce qui a été **accepté**, ce qui a été
**refusé**. Pour chaque billet : la valeur avant, la valeur après, qui, quand, et le commentaire.

## « Sans aucun doute », avec un exemple

Prenons un billet collecté l'an dernier, avec 12 inscriptions payées.

| Sur la fiche, variante | Le fichier dit | Ce qui se passe |
|---|---|---|
| **non renseigné** | doré | **Corrigé d'office** : l'information n'avait jamais été saisie, et rien ne s'y oppose |
| **non renseigné** | pas de variante | **Corrigé d'office** aussi *(corrigé le 14/09, voir ci-dessous)* |
| **anniversaire** | doré | **Un admin décide** : ce n'est plus une information manquante, c'est une contradiction |

~~Deuxième ligne : un admin décide, 3 inscriptions portent un doré.~~ **Cyril a relevé que cet exemple
ne tenait pas** : un billet dont la variante n'est pas renseignée ne peut pas avoir d'inscriptions
pour un doré — une collecte ne s'ouvre aux variantes que si le billet en déclare une. Il n'a que des
inscriptions pour le billet normal, et « pas de variante » ne contredit rien. La vérification reste
faite quand même, pour quelques très anciennes inscriptions d'avant la refonte des collectes.

Aujourd'hui, même ces cas simples seraient refusés par la base, parce que le billet a des
inscriptions. **Cyril a validé qu'on autorise ce cas-là seulement** — remplir une information jamais
saisie, quand aucune inscription ne la contredit. Changer une information déjà remplie reste protégé.

## Comment on reconnaît un billet *(précisé par Cyril le 14/09)*

Un billet se reconnaît à **sa référence, son millésime et sa version** — et à rien d'autre : ni le nom,
ni le pays, ni l'année. C'est avec ces trois informations qu'on retrouve, dans le fichier, la fiche
qui lui correspond.

Ce qu'on compare ensuite, ce sont **deux informations seulement** : le billet existe-t-il en version
normale ? A-t-il une variante, et laquelle ?

Une fiche peut correspondre à **deux billets en main** — le normal et le doré, par exemple. Si le
fichier les liste sur deux lignes, l'assistant les **regroupe** avant de comparer.

## Ce qui a été décidé, et pourquoi

| Décision | La raison |
|---|---|
| **Les différences sont rangées à part**, pas écrites directement dans les fiches | Chaque ligne garde ce qu'a dit le fichier, ce qu'on avait, et ce qui a été décidé : on peut toujours comprendre une correction |
| **Accepter ou refuser, avec un commentaire** | Le choix de Cyril : deux gestes clairs, et la raison notée pour qui relira |
| **Une contradiction n'est jamais corrigée d'office** | C'est là que le fichier peut se tromper, et c'est un admin qui connaît le billet |
| **Un nouveau billet n'est créé que s'il est accepté** | Créer une fiche a un gros impact : c'est une vérification manuelle |
| **On ne supprime jamais un billet** à cause d'un fichier | Qu'un billet manque dans une source ne prouve pas qu'il n'existe pas |

## Ce que l'application ne fera PAS

- **Elle ne lira pas le fichier elle-même** : c'est l'assistant qui le lit, sur l'ordinateur de Cyril.
- **Elle ne supprimera aucun billet**, et ne tranchera aucune contradiction.
- **Elle ne cherchera pas, pour l'instant, les billets qu'on a et que le fichier n'a pas.**
- **Elle ne proposera pas « ignorer »** : accepter ou refuser.
- **Elle ne comparera que la version normale et la variante** — ni le nom, ni le pays, ni l'année.

## Ce sur quoi on vous demande de vous prononcer

Cyril a répondu à toutes les questions posées jusqu'ici :

- ~~Autoriser la saisie d'une information jamais renseignée sur un billet déjà collecté ?~~ **Oui.**
- ~~L'écran « Incohérences des billets » : une demande à part ?~~ **Oui : c'est la demande #69.**
- ~~Comparer d'autres informations que le type de billet ?~~ **Non** — et c'était la question qui
  comptait le plus : elle fixe comment on reconnaît un billet (voir plus haut).

**L'analyse est complète et peut être validée.** Si tout vous va, cochez « J'ai lu et je valide
l'analyse » sur la fiche. Sinon, laissez un commentaire : vous aurez une réponse disant ce qui en a
été fait.
