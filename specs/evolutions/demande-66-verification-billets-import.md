# Demande #66 — Fiabiliser les versions des billets : import et vérification

- **Complexité :** L (tri du 2026-09-14).
- **Demande :** #66, déposée par Cyril le 2026-09-14, priorité normale. Liée à **#67** (comment le
  fichier arrive : son chemin est écrit dans la demande, il reste sur le poste de Cyril).
- **Statut :** analyse écrite le 2026-09-14 **sans exemple d'export**, comme Cyril l'a proposé : elle
  porte sur la table d'import et le module de vérification, qui ne dépendent pas du format. La
  lecture de chaque source sera analysée avec Cyril à chaque nouveau format. Aucun développement
  commencé.
- Version en clair pour les relecteurs : `demande-66-verification-billets-import-en-clair.md`.

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
   verse le résultat dans la table d'import — une ligne par billet du fichier, **plus une ligne par
   billet de notre base absent du fichier**.
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

**Pourquoi un instantané de nos valeurs** : entre l'import et la décision, quelqu'un peut avoir modifié
le billet. Au moment d'appliquer, si le billet ne correspond plus à `valeurs_base`, la ligne redevient
« à valider » au lieu d'écraser une modification plus récente.

### Les types d'écart

| `ecart` | Sens |
|---|---|
| `identique` | Rien à faire |
| `a_completer` | Chez nous « non renseigné », le fichier donne une valeur |
| `contradiction` | Les deux sont renseignés et diffèrent |
| `absent_base` | Billet du fichier inconnu chez nous |
| `absent_fichier` | Billet de notre base absent du fichier |
| `ambigu` | La clé correspond à plusieurs billets chez nous, ou la ligne du fichier est illisible |

### Les statuts, tels que Cyril les a nommés

| `statut` | Sens proposé | Posé par |
|---|---|---|
| `traite` | Rien à faire, ou correction sûre appliquée d'office | l'assistant, à l'import |
| `a_valider` | Un admin doit décider | l'assistant |
| `valide` | Un admin a choisi « appliquer », et le changement est fait | un admin |
| `ignore` | Un admin a choisi « ignorer » | un admin — ou l'assistant, si la même différence a déjà été ignorée (voir « Réimports ») |
| `refuse` | **À confirmer (Q1)** : un admin juge que **le fichier se trompe** et garde notre valeur | un admin |

La différence entre `ignore` et `refuse` n'est pas écrite dans la demande. Lecture proposée :
« ignorer », c'est « on ne s'en occupe pas » ; « refuser », c'est « on a vérifié, c'est nous qui avons
raison ». Les deux sont reconduits aux imports suivants. Si Cyril n'y voit pas de différence, un seul
suffit.

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

**Pourquoi pas un drapeau de transaction, comme pour #62** : il laisserait passer n'importe quel
changement pendant l'import, contradictions comprises. Ici la règle métier juste existe et s'écrit en
quelques lignes — et elle profite aussi à l'écran admin, qui pourra compléter un non renseigné au
lieu de figer le champ. **C'est la question Q4.**

## Appliquer, selon l'écart

| Écart | « Appliquer » fait | Remarque |
|---|---|---|
| `a_completer`, `contradiction` | Met à jour les champs de version du billet | Une contradiction sur un billet protégé reste bloquée par D12 : le module l'affiche **avant** que l'admin clique, et ne propose alors qu'« ignorer » ou « refuser » |
| `absent_base` | **Crée le billet** avec ce que donne le fichier ; le reste (photo, thème…) se complète à la main | Catégorie « Pas de collecte », le défaut de #16 pour un billet sans collecte. Champs minimum : Q6 |
| `absent_fichier` | **Rien** : on ne supprime jamais un billet depuis un import | Seulement « ignorer » ou « refuser » — Q2 |
| `ambigu` | Rien : un doublon se règle à la main dans Gestion Billets | Puis « ignorer » |

Chaque décision passe par une **fonction** qui vérifie que l'appelant est admin, applique le
changement et marque la ligne **dans la même opération** : jamais un billet modifié sans trace, ni une
ligne « validée » dont le changement n'aurait pas eu lieu.

## Réimports

« De temps en temps », dit la demande : le même fichier, ou sa version suivante, reviendra.

- Une ligne dont **la même différence** a déjà été ignorée ou refusée — même source, même clé, même
  valeur du fichier — passe d'office au même statut, avec le motif « déjà ignoré le … par … ».
- Si la valeur du fichier a changé depuis, la ligne redevient « à valider ».
- Les imports précédents restent consultables : on sait ce qui a été décidé, par qui, et d'après quel
  fichier.

## Le module (écran admin)

- Une page **« Vérification des billets »** dans le menu admin.
- La liste des imports, avec leurs compteurs ; pour un import, un filtre par statut et par type
  d'écart, « à valider » par défaut.
- Pour chaque ligne : **nos valeurs et celles du fichier côte à côte**, le changement proposé, la
  protection éventuelle, et les boutons **Appliquer**, **Ignorer**, et **Refuser** si Q1 le garde.
- Mode sombre et téléphone réel, comme pour tout écran (#53).

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
| **Séparé** | Rendre le champ variante obligatoire à la saisie (Q5) | après le premier nettoyage |

## Critères d'acceptation

1. Un import crée un enregistrement d'import et une ligne par billet du fichier, plus une par billet
   de la base absent du fichier.
2. Chaque ligne garde la ligne d'origine du fichier, les valeurs comparées, un type d'écart, un statut
   et un motif lisible.
3. Seuls les écarts « à compléter » qui passent les cinq conditions sont appliqués d'office ; tout le
   reste est « à valider ».
4. « Non renseigné » est reconnu sous ses deux formes, `NULL` et chaîne vide.
5. Un admin applique, ignore (ou refuse) une ligne ; la décision note qui et quand, et le changement
   se fait dans la même opération.
6. Appliquer sur un billet modifié depuis l'import ne l'écrase pas : la ligne redevient « à valider ».
7. Aucun billet n'est jamais supprimé par l'import ni par le module.
8. Compléter un non renseigné compatible avec les inscriptions passe, même sur un billet protégé ;
   changer une valeur déjà renseignée sur un billet protégé reste refusé.
9. Au réimport, une différence déjà ignorée ou refusée ne revient pas, sauf si la valeur du fichier a
   changé.
10. Un non-admin ne lit ni n'écrit dans les tables d'import, y compris par appel direct à l'API.

## Ce que cette spec ne fait pas

- **Pas d'analyse d'un format précis** : chaque source se lit avec Cyril, le moment venu.
- **Pas de lecture du fichier dans le site** : c'est l'assistant qui le lit, sur le poste (#67).
- **Pas de suppression de billet**, jamais.
- **Pas de correction d'office d'une contradiction.**
- **Pas de comparaison des autres champs** (nom, pays, millésime…) au-delà de ce qui sert à reconnaître
  un billet — Q3.

## Questions ouvertes

| | Question | Pour qui | Recommandation |
|---|---|---|---|
| **Q1** | « Ignoré » et « refusé » : quelle différence ? | Cyril | Ignorer = on ne s'en occupe pas ; refuser = on a vérifié, notre valeur est la bonne. Un seul statut si la nuance ne sert pas |
| **Q2** | Un billet de notre base absent du fichier : seulement « ignorer » ? | Cyril | Oui — l'absence d'un billet dans une source ne prouve rien |
| **Q3** | Faut-il aussi comparer d'autres champs que les versions ? | Cyril | Pas dans ce premier temps ; le modèle le permettra |
| **Q4** | Assouplir D12 pour une première déclaration compatible avec les inscriptions ? | Cyril | Oui — c'est la règle métier juste, et elle débloque aussi l'écran admin |
| **Q5** | Après le nettoyage, rendre le champ variante obligatoire à la saisie ? *(question du tri, toujours ouverte)* | Cyril | Oui, dans un lot séparé |
| **Q6** | Créer un billet absent : quels champs minimum ? | Cyril | Ceux du fichier qui correspondent à nos colonnes ; photo et thème à la main |

## Réalisation

*(à compléter après le développement : fichiers touchés, commits)*
