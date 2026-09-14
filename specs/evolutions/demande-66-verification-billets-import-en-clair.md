# Demande #66 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `9a3a618` (14/09/2026, après les réponses de Cyril).

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

Prenons un billet collecté l'an dernier : 12 inscriptions payées, dont 3 pour un billet doré.

| Sur la fiche, variante | Le fichier dit | Ce qui se passe |
|---|---|---|
| **non renseigné** | doré | **Corrigé d'office** : l'information n'avait jamais été saisie, et rien ne s'y oppose |
| **non renseigné** | pas de variante | **Un admin décide** : 3 inscriptions portent un doré, le fichier se trompe peut-être |
| **anniversaire** | doré | **Un admin décide** : ce n'est plus une information manquante, c'est une contradiction |

C'est la première ligne qui pose la question de la protection : aujourd'hui, même elle serait refusée
par la base, parce que le billet a des inscriptions. **On propose d'autoriser ce cas-là seulement** —
remplir une information jamais saisie, quand aucune inscription ne la contredit. Changer une
information déjà remplie resterait protégé.

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
- **Elle ne comparera, pour l'instant, que la version normale et la variante** — pas le nom, le pays
  ou l'année, sauf pour reconnaître un billet.

## Ce sur quoi on vous demande de vous prononcer

1. **Autoriser la saisie d'une information jamais renseignée** sur un billet déjà collecté, quand
   aucune inscription ne la contredit (la première ligne de l'exemple) : d'accord ?
2. **L'écran « Incohérences des billets » proposé par Cyril** — types incohérents ou non renseignés,
   billets sans photo, autres cas problématiques : c'est une bonne idée, mais plus large que cette
   demande, et il n'a pas besoin de fichier externe. On propose d'en faire **une demande à part**, que
   Cyril pourra déposer.
3. **Sans urgence** : faudra-t-il un jour comparer aussi d'autres informations que le type de billet
   (nom, pays, année) ?

Ces réponses peuvent venir pendant la relecture : aucune ne change la façon dont la liste de
vérification est construite. Vos remarques sont bienvenues : laissez un commentaire, vous aurez une
réponse disant ce qui en a été fait.
