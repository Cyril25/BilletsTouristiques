# Demande #66 — Fiabiliser les versions des billets : import et vérification

- **Complexité :** L (tri du 2026-09-14).
- **Demande :** #66, déposée par Cyril le 2026-09-14, priorité normale. Liée à **#67** (comment le
  fichier arrive : son chemin est écrit dans la demande, il reste sur le poste de Cyril).
- **Statut :** analyse écrite le 2026-09-14 **sans exemple d'export**, comme Cyril l'a proposé : elle
  porte sur la table d'import et le module de vérification, qui ne dépendent pas du format. La
  lecture de chaque source sera analysée avec Cyril à chaque nouveau format. Aucun développement
  commencé.
- **Reprise le même jour (15 h 44)** avec les réponses de Cyril : deux décisions seulement,
  **accepter ou refuser** (« ignorer » attendra) ; **pas de vérification inverse** pour l'instant ;
  un **commentaire** sur chaque décision ; la création d'un billet passe par la liste ; et un
  **journal** de ce que l'import a changé. Q1, Q2, Q5 et Q6 tranchées, Q4 reformulée avec un exemple.
  Voir « Les réponses de Cyril ».
- Version en clair pour les relecteurs : `demande-66-verification-billets-import-en-clair.md`.

## Les réponses de Cyril *(14/09, 15 h 44)*

| Question | Sa réponse | Ce que ça change |
|---|---|---|
| Le fonctionnement | « oui c'est bien ça, peut-être un journal des modifs […] qui permet de voir ce qui a été importé d'office et qu'on n'aurait pas vu sinon, plus ce qui a été refusé ou accepté » | Ajout d'une vue **Journal** dans le module (voir « Le journal ») |
| **Q1** — ignoré et refusé | « accepter / refuser c'est le plus pertinent, on n'a pas spécialement besoin d'ignorer ; si on en a besoin on l'ajoutera » | Le statut `ignore` **tombe** |
| **Q2** — billets de notre base absents du fichier | « il faut faire la vérification inverse et ça me paraît plus lourd ; à voir dans un second temps » | L'écart `absent_fichier` **tombe** de ce lot. Le calcul serait simple, mais il remplirait la liste de milliers de lignes à examiner : c'est la charge des admins qui décide, et Cyril a raison de la reporter |
| **Q4** — « une case vide » | « je ne comprends pas ce que tu appelles une case vide, sois plus précis ou donne-moi un exemple » | Question **reformulée**, avec un exemple, dans les deux documents |
| **Q5** — champ obligatoire | « non pas spécialement […] par contre on pourrait créer un écran “incohérences des billets” qui remonterait ces cas, ainsi que des billets sans photo, et autres cas problématiques » | Pas de champ obligatoire. L'écran d'incohérences est une **idée à part** : question Q7 |
| **Q6** — créer un billet absent | « ça doit passer par l'écran de vérification, ça dira “nouveau billet à créer” et on acceptera ou refusera ; pense aussi qu'on pourra mettre un commentaire pour dire pourquoi » | Confirme la ligne `absent_base`. **Un commentaire** accompagne toute décision |

Q3 (comparer d'autres champs) n'a pas reçu de réponse : elle reste ouverte, sans bloquer.

## Contexte (demande)

> Maintenant que le « billet » est séparé de la ou les « collectes », on a besoin d'avoir des données
> fiables pour la gestion de la collection […], surtout le type de billet, c'est-à-dire si le billet
> existe ou non en version normale, et s'il y a une variante (pour le moment on a beaucoup de billets
> qui sont en non renseigné, ce qui est très problématique) […]. Si un billet n'existe pas en version
> normale il doit forcément exister en doré ou en anniversaire. […] L'idée c'est que je te donne des
> listes, et qu'on puisse analyser ce qu'on a en base par rapport aux données des fichiers […], que
> tu puisses en ressortir les incohérences. Pour les incohérences sur lesquelles on n'a pas de doute
> […], on peut modifier. Pour les billets qui ressortent d'un côté et pas de l'autre, il faut un
> nouveau module qui permette de dire « ignorer » cette diff, ou « appliquer » (créer un nouveau billet
> par exemple) ; ce sont des vérifs manuelles car elles auront un gros impact, ce sont les admins qui
> gèreront ça.
>
> Pour l'instant je n'ai pas d'exemple de l'export ; il pourra avoir différents formats qu'on
> analysera à chaque fois ensemble. En attendant, tu peux déjà analyser le besoin de ce nouveau module
> et la création de cette nouvelle table d'import.

Et, dans le commentaire de Cyril sur #67 (14/09) : l'assistant, quand on lui demande « traite le
fichier des billets de telle source », lit les données, les verse dans **une table d'import distincte
de la table des billets**, pose un **statut** par ligne — traité, ignoré, à valider, validé, refusé —,
et la suite se fait dans **le module dédié**.

## Le terrain, vérifié le 2026-09-14

| Constat | Conséquence |
|---|---|
| La fiche d'un billet porte déjà l'information : `VersionNormaleExiste` et `HasVariante` (`N` pas de variante, `A` anniversaire, `D` doré, ou non renseigné) | Rien à ajouter au modèle des billets |
| « Non renseigné » a **deux formes possibles** : `NULL`, et la chaîne vide, valeur par défaut de la colonne depuis `migration-4-5-has-variante.sql` ; le code de l'écran ne teste que `null` | L'import doit traiter les deux ; le constat dira ce qui est réellement en base |
| Un ancien script, `update-billets-hasvariante.sql`, a écrit des **libellés longs** (« Pas de variante », « Anniversaire », « Doré ») au lieu des codes, et les a choisis **d'après l'année** du billet | Valeurs suspectes : à confronter à l'export plutôt qu'à croire |
| Le garde-fou D12 de #16, `check_billet_immutability_vs_inscriptions()`, refuse tout changement de ces deux champs sur un billet qui a une inscription à valeur métier — **y compris le passage de non renseigné à une valeur** (la condition est un `IS DISTINCT FROM`) | La plupart des corrections « sans doute » seraient refusées par la base |
| L'écran admin **fige** les mêmes champs dès qu'un billet a des inscriptions ([admin.js:1553](../../admin.js#L1553), « Type figé ») | Un admin ne peut pas, aujourd'hui, compléter un non renseigné sur un billet déjà collecté. **C'est une raison probable du nombre de non renseignés** |
| Aucune table d'import n'existe. Sur le poste de Cyril, l'assistant a accès à la base par le Worker `supabase-admin-proxy` avec la clé d'administration | L'import se fait **dans une session de l'assistant sur ce poste**, pas par le rituel des demandes, qui n'écrit que dans `demandes` |
| Constat en lecture seule préparé : `scripts/migration-demande-66-1-constat.sql` (poste de Cyril, non versionné) | Ses chiffres seront reportés ici quand il aura été joué ; ils ne changent pas le modèle |

## Le parcours

1. **Cyril écrit dans une demande le chemin d'un fichier** (CSV ou JSON, #67) et sa source.
2. **Première fois pour une source** : l'assistant et Cyril analysent le format ensemble et notent,
   pour cette source, la **correspondance des colonnes** et la **clé de rapprochement**.
3. **« Traite le fichier des billets de telle source »** : l'assistant lit, normalise, rapproche, et
   verse le résultat dans la table d'import — une ligne par billet du fichier. ~~Plus une ligne par
   billet de notre base absent du fichier.~~ *Reportée à un second temps (Q2, 14/09).*
4. Chaque ligne reçoit un **type d'écart** et un **statut**. Les corrections sûres sont appliquées
   d'office.
5. **Les admins examinent les lignes « à valider »** dans le module, et décident.

## Le modèle : deux tables

### `imports_billets` — un import

| Colonne | Rôle |
|---|---|
| `id`, `importe_le`, `importe_par` | |
| `source` | le nom de la source, en clair |
| `fichier` | le chemin du fichier sur le poste de Cyril, pour mémoire — jamais le fichier lui-même |
| `cle_rapprochement`, `correspondance` | ce qui a servi à lire cette source (colonnes, clé), pour pouvoir rejouer ou comprendre un import ancien |
| `nb_lignes`, `resume` | compteurs par type d'écart et par statut, calculés à la fin de l'import |

### `imports_billets_lignes` — une différence à examiner

| Colonne | Rôle |
|---|---|
| `id`, `import_id` | |
| `cle` | la clé de rapprochement normalisée — par exemple référence, millésime et version, si la source les porte |
| `billet_id` | le billet de notre base correspondant, `NULL` s'il n'y en a pas |
| `ligne_fichier` | la ligne d'origine, **telle quelle** (`jsonb`) — la preuve de ce qu'a dit le fichier |
| `valeurs_fichier`, `valeurs_base` | les valeurs comparées, normalisées : les deux champs de version, et ce qui sert à reconnaître le billet (nom, pays). `valeurs_base` est un **instantané** au moment de l'import |
| `ecart` | le type d'écart (ci-dessous) |
| `proposition` | le changement proposé, s'il y en a un |
| `statut`, `motif` | le statut, et **pourquoi** — en clair, lisible par un admin |
| `decide_par`, `decide_le`, `applique_le` | qui a décidé, quand, et quand le changement a été fait |
| `commentaire` | *(ajouté le 14/09, Q6)* pourquoi l'admin accepte ou refuse — facultatif, en texte libre |

**Pourquoi un instantané de nos valeurs** : entre l'import et la décision, quelqu'un peut avoir modifié
le billet. Au moment d'appliquer, si le billet ne correspond plus à `valeurs_base`, la ligne redevient
« à valider » au lieu d'écraser une modification plus récente.

### Les types d'écart

| `ecart` | Sens |
|---|---|
| `identique` | Rien à faire |
| `a_completer` | Chez nous « non renseigné », le fichier donne une valeur |
| `contradiction` | Les deux sont renseignés et diffèrent |
| `absent_base` | Billet du fichier inconnu chez nous — affiché « **nouveau billet à créer** » (Q6) |
| ~~absent_fichier~~ | ~~Billet de notre base absent du fichier~~ — **reporté à un second temps** (Q2, 14/09) |
| `ambigu` | La clé correspond à plusieurs billets chez nous, ou la ligne du fichier est illisible |

### Les statuts, tels que Cyril les a nommés

| `statut` | Sens proposé | Posé par |
|---|---|---|
| `traite` | Rien à faire, ou correction sûre appliquée d'office | l'assistant, à l'import |
| `a_valider` | Un admin doit décider | l'assistant |
| `valide` | Un admin a **accepté**, et le changement est fait | un admin |
| ~~ignore~~ | ~~Un admin a choisi « ignorer »~~ — **tombé le 14/09** (Q1) : « si on en a besoin, on l'ajoutera dans un second temps » | — |
| `refuse` | Un admin a **refusé** le changement proposé : notre fiche reste telle quelle, ou le billet n'est pas créé | un admin — ou l'assistant, si la même différence a déjà été refusée (voir « Réimports ») |

~~La différence entre ignore et refuse n'est pas écrite dans la demande. Lecture proposée : ignorer,
c'est on ne s'en occupe pas ; refuser, c'est on a vérifié, c'est nous qui avons raison.~~ **Tranché
par Cyril le 14/09 : accepter ou refuser**, et c'est tout.

## Ce qui est « sans doute » — appliqué d'office

Règle stricte, dans cet ordre :

1. **seulement** un écart `a_completer`, **jamais** une `contradiction` ;
2. la valeur du fichier est l'un des codes attendus ;
3. la clé est unique des deux côtés (pas `ambigu`) ;
4. le billet reste cohérent après correction : un billet sans version normale doit avoir une
   variante ;
5. et la correction est compatible avec les inscriptions existantes (voir le point dur).

Tout ce qui échoue à une seule de ces conditions passe « à valider », avec le `motif` qui dit
laquelle.

## Le point dur : traverser D12 sans l'affaiblir

D12 existe pour une raison écrite dans son code : **« modifier la déclaration des versions d'un
billet ne doit jamais altérer une inscription à valeur métier »**. Or passer de « non renseigné » à
une valeur que les inscriptions existantes **ne contredisent pas** n'altère aucune inscription : c'est
une première déclaration, pas un changement.

**Proposition : assouplir D12 pour ce seul cas** — une valeur non renseignée peut recevoir une valeur,
même sur un billet protégé, si aucune inscription ne la contredit :

- « pas de variante » : seulement si aucune inscription du billet ne porte de variante ;
- « anniversaire » ou « doré » : ne contredit aucune inscription ;
- « pas de version normale » : seulement si aucune inscription du billet ne porte de billet normal.

Tout **changement** d'une valeur déjà renseignée reste bloqué comme aujourd'hui.

**Exemples** *(ajoutés le 14/09 : Cyril demandait ce que « case vide » voulait dire)* — un billet,
collecté l'an dernier, avec 12 inscriptions payées, dont 3 portent un billet doré :

| Chez nous, variante | Le fichier dit | Aujourd'hui | Avec l'assouplissement |
|---|---|---|---|
| non renseigné | doré | refusé (billet protégé) | **accepté** : aucune inscription ne le contredit |
| non renseigné | pas de variante | refusé | **toujours refusé** : 3 inscriptions portent un doré |
| anniversaire | doré | refusé | **toujours refusé** : ce n'est plus une case vide, c'est un changement |

La « case vide », c'est la première ligne : une information **jamais saisie**, et non une information
**fausse**.

**Pourquoi pas un drapeau de transaction, comme pour #62** : il laisserait passer n'importe quel
changement pendant l'import, contradictions comprises. Ici la règle métier juste existe et s'écrit en
quelques lignes — et elle profite aussi à l'écran admin, qui pourra compléter un non renseigné au
lieu de figer le champ. **C'est la question Q4.**

## Appliquer, selon l'écart

| Écart | « Appliquer » fait | Remarque |
|---|---|---|
| `a_completer`, `contradiction` | Met à jour les champs de version du billet | Une contradiction sur un billet protégé reste bloquée par D12 : le module l'affiche **avant** que l'admin clique, et ne propose alors que « refuser » |
| `absent_base` | **Crée le billet** avec ce que donne le fichier ; le reste (photo, thème…) se complète à la main | Affiché « nouveau billet à créer » (Q6). Catégorie « Pas de collecte », le défaut de #16 pour un billet sans collecte |
| ~~absent_fichier~~ | ~~Rien : on ne supprime jamais un billet depuis un import~~ | Reporté à un second temps (Q2) |
| `ambigu` | Rien : un doublon se règle à la main dans Gestion Billets | Puis « refuser », avec un commentaire |

Chaque décision passe par une **fonction** qui vérifie que l'appelant est admin, applique le
changement et marque la ligne **dans la même opération** : jamais un billet modifié sans trace, ni une
ligne « validée » dont le changement n'aurait pas eu lieu.

## Réimports

« De temps en temps », dit la demande : le même fichier, ou sa version suivante, reviendra.

- Une ligne dont **la même différence** a déjà été ~~ignorée ou~~ refusée — même source, même clé,
  même valeur du fichier — passe d'office au même statut, avec le motif « déjà refusé le … par … » et
  le commentaire d'origine.
- Si la valeur du fichier a changé depuis, la ligne redevient « à valider ».
- Les imports précédents restent consultables : on sait ce qui a été décidé, par qui, et d'après quel
  fichier.

## Le module (écran admin)

- Une page **« Vérification des billets »** dans le menu admin.
- La liste des imports, avec leurs compteurs ; pour un import, un filtre par statut et par type
  d'écart, « à valider » par défaut.
- Pour chaque ligne : **nos valeurs et celles du fichier côte à côte**, le changement proposé, la
  protection éventuelle, ~~et les boutons Appliquer, Ignorer, et Refuser si Q1 le garde~~ et les
  boutons **Accepter** et **Refuser**, avec un champ **commentaire** (14/09).
- Mode sombre et téléphone réel, comme pour tout écran (#53).

### Le journal *(ajouté le 14/09, demande de Cyril)*

Une vue du module, **pas une table de plus** : les lignes d'import qui ont **changé quelque chose**
ou **reçu une décision**. Elle répond à la question de Cyril — « voir ce qui a été importé d'office et
qu'on n'aurait pas vu sinon, plus ce qui a été refusé ou accepté » :

- **appliqué d'office** : les corrections sûres faites à l'import — c'est la partie qu'aucun admin n'a
  vue passer, et la plus utile à relire ;
- **accepté** et **refusé** : avec qui, quand, et le commentaire.

Pour chaque ligne : le billet, la valeur avant, la valeur après (ou « billet créé »), la source et la
date de l'import. Les lignes « identiques » n'y figurent pas.

Tout y est déjà dans `imports_billets_lignes` : la valeur avant est l'instantané `valeurs_base`, et
`applique_le` distingue ce qui a été fait de ce qui a seulement été proposé. D'où la vue plutôt
qu'une table : deux endroits qui racontent la même chose finiraient par ne plus dire la même chose.

## Qui fait quoi

| Étape | Qui | Comment |
|---|---|---|
| Lire le fichier, normaliser, rapprocher, écrire les lignes, appliquer les corrections sûres | l'assistant, **en session** sur le poste de Cyril | clé d'administration du Worker — pas le rituel en boucle |
| Décider des lignes « à valider » | les admins | le module |
| Accès aux deux tables | admins seulement | `is_admin_ou_superadmin()`, sans clause `TO authenticated` (rôle anon pour Firebase) |

## Découpage

| Lot | Contenu | Dépend de |
|---|---|---|
| **1** | Les deux tables, leurs règles d'accès, les fonctions de décision, l'assouplissement de D12 (Q4) | constat joué |
| **2** | Le module admin | lot 1 |
| **Par source** | Analyse du format avec Cyril, correspondance et clé, premier import | lot 1 ; lot 2 pour arbitrer |
| ~~Séparé~~ | ~~Rendre le champ variante obligatoire à la saisie (Q5)~~ — **tombé le 14/09** : Cyril ne le souhaite pas | — |
| **Plus tard** | La vérification inverse — billets de notre base absents du fichier (Q2) | lot 1 |

## Critères d'acceptation

1. Un import crée un enregistrement d'import et une ligne par billet du fichier. ~~Plus une par
   billet de la base absent du fichier.~~ *(Reporté, Q2.)*
2. Chaque ligne garde la ligne d'origine du fichier, les valeurs comparées, un type d'écart, un statut
   et un motif lisible.
3. Seuls les écarts « à compléter » qui passent les cinq conditions sont appliqués d'office ; tout le
   reste est « à valider ».
4. « Non renseigné » est reconnu sous ses deux formes, `NULL` et chaîne vide.
5. Un admin **accepte ou refuse** une ligne, avec un commentaire facultatif ; la décision note qui et
   quand, et le changement se fait dans la même opération. *(14/09 : « ignorer » n'existe pas.)*
6. Appliquer sur un billet modifié depuis l'import ne l'écrase pas : la ligne redevient « à valider ».
7. Aucun billet n'est jamais supprimé par l'import ni par le module.
8. Compléter un non renseigné compatible avec les inscriptions passe, même sur un billet protégé ;
   changer une valeur déjà renseignée sur un billet protégé reste refusé.
9. Au réimport, une différence déjà refusée ne revient pas, sauf si la valeur du fichier a changé.
10. Un non-admin ne lit ni n'écrit dans les tables d'import, y compris par appel direct à l'API.
11. *(14/09)* Un billet du fichier inconnu chez nous apparaît comme « nouveau billet à créer » ; il
    n'est créé que s'il est accepté.
12. *(14/09)* Le **journal** montre, pour un import, ce qui a été appliqué d'office, accepté ou
    refusé — avec la valeur avant, la valeur après, qui, quand et le commentaire.

## Ce que cette spec ne fait pas

- **Pas d'analyse d'un format précis** : chaque source se lit avec Cyril, le moment venu.
- **Pas de lecture du fichier dans le site** : c'est l'assistant qui le lit, sur le poste (#67).
- **Pas de suppression de billet**, jamais.
- **Pas de correction d'office d'une contradiction.**
- **Pas de comparaison des autres champs** (nom, pays, millésime…) au-delà de ce qui sert à reconnaître
  un billet — Q3.
- **Pas de vérification inverse** *(14/09, Q2)* : les billets de notre base absents du fichier ne sont
  pas recherchés dans ce lot.
- **Pas de statut « ignoré »** *(14/09, Q1)* : accepter ou refuser.
- **Pas d'écran « Incohérences des billets »** *(14/09, Q7)* : idée de Cyril, plus large que cette
  demande.

## Questions ouvertes

| | Question | Pour qui | Recommandation |
|---|---|---|---|
| ~~Q1~~ | ~~« Ignoré » et « refusé » : quelle différence ?~~ | Cyril | **Tranchée le 14/09 : accepter ou refuser**, pas d'« ignorer » |
| ~~Q2~~ | ~~Un billet de notre base absent du fichier : seulement « ignorer » ?~~ | Cyril | **Tranchée : vérification inverse reportée** à un second temps |
| **Q3** | Faut-il aussi comparer d'autres champs que les versions ? | Cyril | Pas dans ce premier temps ; le modèle le permettra. *Sans réponse le 14/09, ne bloque pas* |
| **Q4** | Assouplir D12 pour une **première déclaration** — une information jamais saisie — que les inscriptions ne contredisent pas ? *(reformulée le 14/09 avec des exemples : voir « Le point dur »)* | Cyril | Oui — c'est la règle métier juste, et elle débloque aussi l'écran admin |
| ~~Q5~~ | ~~Après le nettoyage, rendre le champ variante obligatoire à la saisie ?~~ | Cyril | **Tranchée : non** |
| ~~Q6~~ | ~~Créer un billet absent : quels champs minimum ?~~ | Cyril | **Tranchée** : par la liste, « nouveau billet à créer », accepté ou refusé avec commentaire. Champs : ceux du fichier qui correspondent aux nôtres |
| **Q7** *(ajoutée le 14/09)* | L'écran « **Incohérences des billets** » proposé par Cyril — versions incohérentes ou non renseignées, billets sans photo, autres cas : une demande à part ? | Cyril | **Oui, une demande à part** : il couvre bien plus que les versions, et n'a pas besoin d'un fichier externe. Il pourra réutiliser les règles de cohérence écrites ici. L'assistant ne peut pas créer de demande : à déposer par Cyril |

## Réalisation

*(à compléter après le développement : fichiers touchés, commits)*
