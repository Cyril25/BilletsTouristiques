# Demande #69 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `0a7adc5` (14/09/2026).

## De quoi il s'agit

Les fiches des billets contiennent des erreurs et des trous : des variantes jamais renseignées, des
billets sans photo, des dates qui ne tiennent pas debout. Personne ne les voit, parce qu'il faudrait
ouvrir 5 000 fiches une par une.

L'idée : **un écran qui liste tout ce qui cloche**, avec pour chaque cas **un lien vers la fiche** pour
la corriger.

## Ce qu'on vérifierait

Voici ce qu'on propose de surveiller. Chaque ligne est un **contrôle** ; on vous demande lesquels
garder.

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
- *à discuter* : une collecte a lieu plus de deux ans après le millésime du billet — ça peut être un
  vrai rattrapage.

**Les collectes**
- une collecte n'a pas de collecteur ;
- une collecte accepte des variantes alors que le billet n'en a pas ;
- *à discuter* : une collecte n'a pas de prix — les plus anciennes n'en ont peut-être jamais eu.

**Le reste**
- le pays est vide, ou absent de la liste des pays ;
- le billet n'a pas de nom.

Avant de choisir, Cyril pourra lancer un **comptage** qui dit combien de billets chaque contrôle
remonterait : un contrôle qui signale 3 000 billets noierait l'écran.

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
vérifications sont simples** : la base de données sait les faire toute seule. On propose donc un
bouton **« Relancer la vérification »** sur l'écran : **n'importe quel admin** peut l'utiliser, quand il
veut, sans attendre l'assistant ni l'ordinateur de Cyril.

L'assistant resterait utile pour ce que la base ne sait pas faire — aller vérifier que les images
s'affichent encore — et surtout pour **proposer de nouveaux contrôles** en lisant les données.

## Et la demande #66 ?

Les deux se ressemblent : une liste de cas à traiter, avec un lien vers le billet. On propose de les
réunir dans **un seul écran, « Qualité des billets »**, avec deux onglets : les différences avec le
fichier externe (#66), et les incohérences (#69). Un seul endroit où aller.

## Ce que l'application ne fera PAS

- **Elle ne corrigera rien toute seule** : elle signale, vous corrigez dans la fiche.
- **Elle ne vérifiera pas les inscriptions**, seulement les billets et leurs collectes.
- **Elle ne vérifiera pas les images sur internet** dans un premier temps.

## Ce sur quoi on vous demande de vous prononcer

1. **Un bouton que n'importe quel admin peut utiliser**, plutôt qu'une tâche lancée par l'assistant ?
   On le recommande.
2. **Un seul écran « Qualité des billets »** pour #66 et #69 ? On le recommande.
3. **Quels contrôles garder ?** Surtout les deux « à discuter » : la collecte loin du millésime, et la
   collecte sans prix. Le comptage aidera.
4. **Pensez-vous à d'autres choses à vérifier ?**

Vos remarques sont bienvenues : laissez un commentaire, vous aurez une réponse disant ce qui en a été
fait. Si tout vous va, cochez « J'ai lu et je valide l'analyse » sur la fiche.
