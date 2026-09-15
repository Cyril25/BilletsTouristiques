# Demande #69 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `6362673` (15/09/2026, après les réponses de Cyril).
> La section « Ce qui est livré » reflète le développement du 15/09 (commit `d0e941d`).

## Ce qui est livré *(15/09)*

L'écran existe : menu **Administration → Qualité des billets**, onglet **« Incohérences »**. Il
n'est pas encore utilisable : Cyril doit d'abord installer la mise à jour de la base de données.

**Ce que vous y verrez.** En haut, chaque contrôle avec son nombre de cas, rangés par famille (le type
de billet, la photo, les dates, les collectes, le reste). Un clic sur un contrôle affiche ses cas, 50
par 50. L'écran ouvre d'abord les erreurs franches (« faux ») avant les informations manquantes : sans
ça, les milliers de variantes non renseignées cacheraient les six dates dans le désordre.

**Les chiffres au premier passage**, sur les données du 15/09 :

| Contrôle | Cas |
|---|---|
| Variante non renseignée | 5 143 |
| Collecte sans prix | 1 152 |
| Collecte sans collecteur | 423 |
| Même référence, millésime et version sur plusieurs fiches | 242 |
| Billet sans image | 76 |
| Statut de collecte sans la date qui va avec | 59 |
| Pays vide ou absent de la liste (dont 26 « Angleterre ») | 28 |
| Référence, millésime ou version manquant | 25 |
| Collecte encore ouverte plus d'un an après sa date | 19 |
| Dates d'une collecte dans le désordre | 6 |
| Collecte à plus de deux ans du millésime | 1 |
| Les cinq autres contrôles | 0 |

**Trois précisions apportées en le construisant :**

- **« Ce n'est pas une erreur » demande un commentaire.** C'est lui qui répondra au prochain admin qui
  se posera la question. Un cas accepté par erreur peut être **rouvert**.
- **Les doublons sont 242, pas 258.** Seize fiches en double n'ont pas de version, ou pas de
  millésime : elles sont déjà comptées dans « référence, millésime ou version manquant ».
- **« Collecte sans prix »** ne compte pas une collecte réservée aux variantes qui a un prix variante.

**Ce qu'il faudra regarder**, une fois la base à jour : que la liste s'affiche bien sur téléphone et en
mode sombre ; qu'une fiche corrigée disparaisse après « Relancer la vérification » ; et si les 1 152
collectes sans prix sont bien des anciennes collectes — si oui, ce contrôle est à ajuster, comme
Cyril l'avait prévu.

## Ce qui a changé depuis la première version

Cyril a répondu aux quatre questions le 15/09 :

- **les vérifications tournent dans la base**, par un bouton que n'importe quel admin peut utiliser.
  Il demandait comment, concrètement, une incohérence est trouvée : c'est maintenant expliqué plus
  bas, dans « Comment une incohérence est trouvée » ;
- **un seul écran pour #66 et #69**, mais sans jamais mélanger ce qu'un import propose de changer et
  ce qui cloche dans nos données : c'est précisé dans « Et la demande #66 ? » ;
- **on garde tous les contrôles**, y compris les deux « à discuter », et on ajustera ensuite ;
- **pas d'autre contrôle pour l'instant** ; la liste pourra grandir.

## De quoi il s'agit

Les fiches des billets contiennent des erreurs et des trous : des variantes jamais renseignées, des
billets sans photo, des dates qui ne tiennent pas debout. Personne ne les voit, parce qu'il faudrait
ouvrir 5 000 fiches une par une.

L'idée : **un écran qui liste tout ce qui cloche**, avec pour chaque cas **un lien vers la fiche** pour
la corriger.

## Ce qu'on vérifierait

Voici ce qu'on surveillera. Chaque ligne est un **contrôle**. Cyril les garde **tous** : un contrôle
qui signale trop de cas, ou des cas qui n'en sont pas, sera ajusté ensuite.

**Le type de billet**
- la variante n'est pas renseignée ;
- la variante porte une valeur bizarre, laissée par un ancien script ;
- le billet n'existe ni en version normale ni en variante — c'est impossible ;
- deux fiches ont la même référence, le même millésime et la même version — un doublon ;
- il manque la référence, le millésime ou la version.

**La photo**
- le billet n'a pas d'image ;
- *plus tard* : l'image existe mais son lien ne marche plus.

**Les dates** — elles sont sur les collectes du billet, depuis la refonte des collectes
- les dates sont dans le désordre (la pré-collecte après la collecte, par exemple) ;
- une collecte « Terminée » n'a pas de date de fin, ou une « Collecte » pas de date de collecte ;
- une date est avant 2000, ou dans plus d'un an : sans doute une faute de frappe ;
- une collecte est encore ouverte plus d'un an après sa date : sans doute oubliée ;
- une collecte a lieu plus de deux ans après le millésime du billet — ça peut être un vrai
  rattrapage : dans ce cas, on l'« accepte » (voir plus bas).

**Les collectes**
- une collecte n'a pas de collecteur ;
- une collecte accepte des variantes alors que le billet n'en a pas ;
- une collecte n'a pas de prix — les plus anciennes n'en ont peut-être jamais eu ; si ce contrôle
  noie l'écran, on l'ajustera.

**Le reste**
- le pays est vide, ou absent de la liste des pays ;
- le billet n'a pas de nom.

Cyril peut lancer un **comptage** qui dit combien de billets chaque contrôle remonterait. Il ne sert
plus à choisir, puisqu'on garde tout ; il dira seulement à quoi s'attendre en ouvrant l'écran.

## Comment ça marchera, pour Marie

Marie ouvre **« Incohérences des billets »**. En haut, un résumé : « Variante non renseignée : 1 204 —
Billet sans image : 87 — Dates dans le désordre : 12… ». Elle clique sur « Dates dans le désordre » :
la liste montre les 12 billets, avec leur photo et ce qui cloche. Elle ouvre la fiche du premier, corrige
la date, revient.

À la prochaine vérification, ce billet **disparaît de la liste tout seul** : il est corrigé.

Et si un cas signalé n'est pas une erreur — un rattrapage organisé des années plus tard, par exemple —,
Marie clique **« Accepter »** et écrit pourquoi. On ne le lui signalera plus.

## Qui lance la vérification

La demande disait « c'est l'IA qui aura une tâche ». En regardant de près, **presque toutes ces
vérifications sont simples** : la base de données sait les faire toute seule. Il y aura donc un
bouton **« Relancer la vérification »** sur l'écran : **n'importe quel admin** peut l'utiliser, quand il
veut, sans attendre l'assistant ni l'ordinateur de Cyril. *(Retenu par Cyril le 15/09.)*

L'assistant reste utile pour ce que la base ne sait pas faire — aller vérifier que les images
s'affichent encore — et surtout pour **proposer de nouveaux contrôles** en lisant les données.

## Comment une incohérence est trouvée *(expliqué le 15/09, à la demande de Cyril)*

**Par des règles, pas par l'IA.** Chaque contrôle est une règle simple. Pour « la variante n'est pas
renseignée », elle dit : *cherche les billets dont la case « variante » est vide*. Pour « les dates
sont dans le désordre » : *cherche les collectes dont la pré-collecte tombe après la collecte*.

Cyril se demandait : si ce n'est pas l'IA, qui fait tourner ces règles, puisque aucun admin ne sait
interroger la base ? Personne n'a à le faire à la main :

- **les règles sont écrites une fois**, par l'assistant, au moment du développement, et **rangées
  dans la base** ;
- **le bouton les fait tourner** : quand Marie clique sur « Relancer la vérification », la base
  applique toutes les règles à tous les billets. L'application fonctionne déjà comme ça pour
  d'autres choses, les compteurs d'inscriptions par exemple ;
- seul un admin peut lancer la vérification.

**Là où il faudrait vraiment l'IA** : juger ce qu'aucune règle simple ne sait dire — un nom de billet
mal orthographié, une ville qui ne va pas avec le département — ou aller voir les images sur
internet. Il faudrait alors l'assistant, lancé depuis l'ordinateur de Cyril. Aucun des contrôles
retenus n'en a besoin.

**Ajuster une règle ensuite**, c'est une petite demande : on réécrit la règle, l'écran ne change pas.

## Et la demande #66 ?

Les deux se ressemblent : une liste de cas à traiter, avec un lien vers le billet. Elles seront
réunies dans **un seul écran, « Qualité des billets »**, avec deux onglets. Un seul endroit où aller.
*(Retenu par Cyril le 15/09.)*

**Mais les deux onglets ne se mélangent jamais** — c'était la condition de Cyril :

- **« Vérification des billets »** (#66) : ce qu'**un fichier venu de l'extérieur** propose de changer
  dans nos fiches. On accepte ou on refuse, l'application fait le changement.
- **« Incohérences »** (#69) : ce qui cloche **dans nos propres données**, sans aucun fichier. On
  corrige la fiche soi-même, ou on accepte le cas.

Chaque onglet a sa liste et ses compteurs.

**Un même billet peut quand même apparaître des deux côtés.** Par exemple : sa variante n'est pas
renseignée, et le dernier import propose « doré ». Le corriger à la main pendant que la proposition
attend dans l'autre onglet, ce serait faire deux fois le travail. **Nous proposons** que l'incohérence
affiche alors **« Un import propose une valeur »**, avec un lien vers la proposition. Une fois celle-ci
acceptée, l'incohérence disparaît à la vérification suivante.

## Ce que l'application ne fera PAS

- **Elle ne corrigera rien toute seule** : elle signale, vous corrigez dans la fiche.
- **Elle ne vérifiera pas les inscriptions**, seulement les billets et leurs collectes.
- **Elle ne vérifiera pas les images sur internet** dans un premier temps.

## Ce sur quoi on vous demande de vous prononcer

**Plus aucune question ouverte** : Cyril a répondu aux quatre le 15/09 (voir « Ce qui a changé »).

Une seule nouveauté à regarder : la mention **« Un import propose une valeur »** quand un billet
apparaît dans les deux onglets. Si vous n'en voulez pas, dites-le.

Et si une autre chose à vérifier vous vient, maintenant ou plus tard, elle a sa place : la liste des
contrôles pourra grandir.

Vos remarques sont bienvenues : laissez un commentaire, vous aurez une réponse disant ce qui en a été
fait. Si tout vous va, cochez « J'ai lu et je valide l'analyse » sur la fiche.
