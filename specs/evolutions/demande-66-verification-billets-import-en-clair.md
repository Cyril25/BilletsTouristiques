# Demande #66 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `96812f2` (14/09/2026).

## De quoi il s'agit

Chaque billet a une fiche qui dit **s'il existe en version normale**, et **s'il a une variante** :
anniversaire, doré, ou pas de variante. Beaucoup de fiches sont restées sur **« non renseigné »**. Or
depuis que le billet et ses collectes sont séparés, ces informations servent partout — à commencer par
la gestion des collections.

Cyril dispose de temps en temps d'**un fichier venu de l'extérieur**, avec des informations sur
environ 5 000 billets. L'idée : **comparer ce fichier à nos fiches**, corriger ce qui ne fait aucun
doute, et laisser **les admins décider** du reste, dans un écran fait pour ça.

Cette analyse est écrite **sans avoir vu le fichier** : Cyril n'en a pas encore d'exemple, et le format
pourra changer d'une source à l'autre. Elle porte donc sur ce qui ne dépend pas du format : où l'on
range les différences, et comment les admins les traitent. La lecture de chaque fichier se fera avec
Cyril, source par source.

## Ce qu'on a trouvé en regardant

- **Les fiches savent déjà tout dire.** Il n'y a rien à ajouter : le problème, ce sont les cases
  restées vides.
- **Aujourd'hui, un admin ne peut pas remplir ces cases sur un billet déjà collecté.** Dès qu'un
  billet a des inscriptions, l'écran fige son type, et la base refuse de le changer — même pour passer
  de « non renseigné » à une vraie valeur. C'est une protection utile, posée lors de la refonte des
  collectes, mais elle explique sans doute une bonne partie des cases vides.
- **Des valeurs anciennes sont suspectes** : un vieux script a rempli la variante de dizaines de
  billets d'après leur seule année (2025 → anniversaire, 2026 → doré). Le fichier permettra de les
  vérifier.

## Comment ça se passera

1. Cyril indique dans une demande **où se trouve le fichier** sur son ordinateur (voir #67).
2. La première fois qu'arrive une source, l'assistant et Cyril regardent ensemble **comment la lire** :
   quelles colonnes correspondent aux nôtres, et comment reconnaître un même billet des deux côtés.
3. Cyril demande à l'assistant de **traiter le fichier**. L'assistant compare chaque billet du fichier
   à nos fiches, et range chaque différence dans **une liste de vérification**, à part des fiches
   elles-mêmes. Les billets qu'on a chez nous mais pas dans le fichier y figurent aussi.
4. **Ce qui ne fait aucun doute est corrigé tout de suite.** Exemple : chez nous « non renseigné »,
   dans le fichier « doré », et rien ne s'y oppose.
5. **Tout le reste attend un admin**, dans un nouvel écran **« Vérification des billets »**.

### Ce que « sans aucun doute » veut dire

Une case **vide** chez nous, remplie dans le fichier, avec une valeur valable, pour un billet qu'on
reconnaît sans ambiguïté, et que **rien ne contredit** — ni la logique (un billet sans version normale
doit avoir une variante), ni les inscriptions déjà faites.

**Jamais** quand les deux sont remplis et diffèrent : là, c'est un admin qui tranche.

### Dans l'écran de vérification

Pour chaque différence, Marie, admin, voit **nos valeurs et celles du fichier côte à côte**, et ce qui
est proposé. Elle choisit :

- **Appliquer** : la fiche est corrigée — ou, pour un billet qu'on n'avait pas, **créée**, et il
  restera à la compléter (photo, thème) ;
- **Ignorer** : on laisse comme c'est.

Chaque décision garde **qui l'a prise et quand**. Et si quelqu'un a modifié la fiche entre-temps,
l'application ne l'écrase pas : elle redemande.

Au prochain fichier, **une différence déjà ignorée ne revient pas**, sauf si le fichier a changé
d'avis.

## Ce qui a été décidé, et pourquoi

| Décision | La raison |
|---|---|
| **Les différences sont rangées à part**, pas écrites directement dans les fiches | Chaque ligne garde ce qu'a dit le fichier, ce qu'on avait, et ce qui a été décidé : on peut toujours comprendre une correction |
| **Une contradiction n'est jamais corrigée d'office** | C'est là que le fichier peut se tromper, et c'est un admin qui connaît le billet |
| **On ne supprime jamais un billet** à cause d'un fichier | Qu'un billet manque dans une source ne prouve pas qu'il n'existe pas |
| **Assouplir la protection pour une première déclaration** | Remplir une case vide sans contredire aucune inscription ne casse rien. Ça débloque le nettoyage — et aussi l'écran de saisie habituel. Changer une valeur déjà remplie resterait protégé |

## Ce que l'application ne fera PAS

- **Elle ne lira pas le fichier elle-même** : c'est l'assistant qui le lit, sur l'ordinateur de Cyril.
- **Elle ne supprimera aucun billet.**
- **Elle ne tranchera pas les contradictions.**
- **Elle ne comparera, pour l'instant, que la version normale et la variante** — pas le nom, le pays
  ou l'année, sauf pour reconnaître un billet.

## Ce sur quoi on vous demande de vous prononcer

1. **Est-ce bien le fonctionnement voulu ?** Corrections sûres d'office, tout le reste dans l'écran
   de vérification.
2. **« Ignoré » et « refusé »** — Cyril a cité les deux. On propose : « ignorer », c'est « on ne s'en
   occupe pas » ; « refuser », c'est « on a vérifié, c'est notre fiche qui a raison ». Faut-il les deux,
   ou un seul suffit-il ?
3. **Un billet qu'on a mais que le fichier n'a pas** : seulement « ignorer », d'accord ?
4. **Assouplir la protection** pour qu'on puisse remplir une case vide sur un billet déjà collecté,
   quand aucune inscription ne s'y oppose : d'accord ?
5. **Après le nettoyage**, faut-il obliger à remplir la variante quand on crée un billet ?
6. **Créer un billet absent** : suffit-il de reprendre ce que donne le fichier, le reste (photo,
   thème) étant complété à la main ?

Pour avancer, il manque encore **un exemple de fichier** et le résultat d'une vérification en lecture
seule préparée pour Cyril : ils serviront à la lecture de la première source, pas à valider ce
document. Vos remarques sont bienvenues : laissez un commentaire, vous aurez une réponse disant ce
qui en a été fait.
