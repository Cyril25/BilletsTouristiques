# Demande #65 — La copie d'un billet perd son pays (et son département)

- **Épic :** corrections et évolutions (complexité **S**)
- **Demande :** #65 de la table `demandes` de production — Jean-Philippe, 2026-09-11, priorité *normale*.
- **Concerne :** les admins, écran Gestion Billets.
- **Statut :** **À tester.** Spec et développement du 2026-09-11.
- **Régression de #16 (#35)**, commit `0d7ef84` : la copie s'ouvre depuis sur la page dédiée.

## Contexte (demande)

> lors de la copie du billet, garder toutes les informations, pays, code postal ville

## Diagnostic

### Ce que fait la copie

`copyBillet()` (`admin.js`) recopie **tout** le billet sauf ce qui est propre à une émission :
identifiant, dates, liens Google, lien Facebook, commentaire, collecteur, image. `Pays`, `Ville`,
`Cp`, `Dep` et `Theme` **partent bien** dans la copie, qui est déposée en `sessionStorage` avant la
navigation vers `admin-billet.html?dup=1`.

### Où le pays se perd : une course au chargement

Sur la page dédiée, `onAuthStateChanged` lance **dans cet ordre** :

```
loadPays()          → requête asynchrone ; au retour : populatePaysSelect()
...
initBilletPage()    → ?dup=1 : openBilletPanel(null) puis prefillForm(copie)   (synchrone)
```

1. `prefillForm()` s'exécute **avant** le retour de `loadPays()`. Le `<select id="field-pays">`
   n'a encore que son option vide ; le code prévu pour les pays hors référentiel ajoute donc une
   option `France (ancien)` et la sélectionne.
2. La liste arrive. `populatePaysSelect()` fait `select.length = 1` — **toutes les options sauf la
   première sont supprimées**, celle qu'on venait de sélectionner comprise — puis ajoute les pays.
   Le sélecteur retombe sur « — Sélectionner un pays — ».

Avant #16, la copie s'ouvrait dans le panneau latéral de la liste, où les pays étaient chargés
depuis longtemps : la course n'existait pas.

### Comment le département se perd ensuite

Le pays est **obligatoire à la création** (demande #41). L'admin le re-choisit donc. Or l'écouteur
`change` du sélecteur (`initPanel()`) écrit **inconditionnellement** `Dep = <ISO>-` : « FR-50 »
devient « FR- ». C'est le second dégât, conséquence du premier.

### Ville et code postal : conservés

Le code ne les touche pas après le pré-remplissage, et les données le confirment. Sur les billets
récents qui partagent la référence d'un billet plus ancien (signature d'une copie), ville et code
postal sont **identiques** — ex. `#5597` UEWD 2026-7, copie de `#4897` UEWD 2025-6. Les billets
récents à ville et code postal vides (`#5536`–`#5544`, série italienne) ont aussi un **thème vide**
alors que leur aîné en avait un : ce sont des saisies de zéro, pas des copies — la copie recopie le
thème, que rien n'efface.

La demande liste « pays, code postal, ville » : lu comme l'énumération de ce qu'il faut garder, le
défaut réel étant le pays et, par ricochet, le département. **Question laissée ouverte au
demandeur** : s'il a vu un billet précis perdre sa ville ou son code postal, le citer.

### Même course, côté modification — plus grave

`?id=` lance la requête du billet **en parallèle** de `loadPays()`. Si le billet revient le
premier, le pays est effacé de la même façon. **En modification, le pays n'est pas obligatoire**
(choix de #41, pour ne pas bloquer les anciens billets sans pays) : l'admin peut donc enregistrer
sans rien voir, et **le pays est écrasé par une chaîne vide en base**. Probablement le cas de
`#5591` (UEGV 2026-2, « Tours de Notre-Dame de Paris ») : ville, CP, département et thème recopiés
de `#883`, pays vide.

## Banc d'essai

Pas de tests automatisés sur ce projet. Banc jetable (hors dépôt) : la **vraie** page
`admin-billet.html` et le **vrai** `admin.js` chargés dans jsdom, réseau remplacé par des
promesses que le banc résout dans l'ordre voulu ; la copie passe par le vrai `copyBillet()` puis
le vrai `initBilletPage()`.

Sur le code d'avant correction : **8 échecs sur 23**, dont
`1a copie, pays arrivés après : pays conservé [avant=France après=]` — le défaut est reproduit
tel que décrit, et la modification (cas 3a) le reproduit aussi.

## Décisions

### D1 — Corriger à l'endroit qui détruit, pas à l'endroit qui appelle

`populatePaysSelect()` **mémorise la valeur sélectionnée avant de reconstruire** la liste et la
rétablit après. Si cette valeur n'est pas dans le référentiel, l'option « (ancien) » est recréée
— le comportement de `prefillForm()` est ainsi préservé quel que soit l'ordre d'arrivée.

Écarté : faire attendre `loadPays()` à `initBilletPage()`. Il faudrait le faire pour chaque mode
(`?dup`, `?id`, `?new`), coupler l'ouverture de la page à une requête dont l'échec n'est
aujourd'hui qu'un avertissement, et le prochain appelant devrait y penser. Corriger la fonction qui
efface règle tous les ordres d'un coup.

### D2 — Ne pas écraser un département qui correspond déjà au pays choisi

L'écouteur `change` du pays ne réécrit plus `Dep` s'il vaut déjà le code ISO du pays **ou**
commence par `<ISO>-` (comparaison insensible à la casse). « FR-50 » + France reste « FR-50 » ;
« IT » + Italie reste « IT ». Le format court n'est pas marginal : mesuré le 2026-09-11 sur les
5 514 billets, **4 080** sont en `ISO-code`, **1 335** en ISO seul, 68 en `ISO-` seul, 16 vides.

Inchangé : département vide → le préfixe est posé ; département d'un **autre** pays → il est
remplacé par le nouveau préfixe. L'aide à la saisie reste entière, seul l'écrasement d'une donnée
juste disparaît.

D2 garde son intérêt même avec D1 : un admin qui re-choisit le pays par réflexe ne doit pas perdre
son département.

## Critères d'acceptation

1. Copier un billet : la page de création affiche **le pays du billet source**, sans « (ancien) »,
   sans option en double, **quel que soit l'ordre** d'arrivée de la liste des pays.
2. Ville, code postal, département et thème sont recopiés (déjà le cas, non régressé).
3. Ouvrir un billet en modification : le pays affiché est **toujours** celui du billet.
4. Un billet dont le pays n'est plus au référentiel l'affiche toujours « Pays (ancien) ».
5. Un billet sans pays garde le sélecteur sur « — Sélectionner un pays — ».
6. Re-choisir le pays correspondant au département ne touche pas au département ; choisir un autre
   pays, ou choisir un pays quand le département est vide, pose le préfixe comme avant.

## Ce que cette demande ne fait pas

- **Les exclusions volontaires de la copie restent** : image, lien Facebook, commentaire, dates,
  liens Google, collecteur. Ils décrivent une émission précise, pas le billet.
- **Pas de réparation des données déjà abîmées.** Candidats relevés, à arbitrer par Cyril :
  - `#5591` UEGV 2026-2 — **pays vide** (France, d'après son aîné `#883` et son département FR-75) ;
  - département raccourci par rapport à l'aîné copié : `#5589` (CH-CH → CH), `#5590` (ES-BA → ES),
    `#5593` (IE-BE → IE), `#5594` (BE-BR → BE). Rien ne prouve qu'il ne s'agit pas de corrections
    volontaires : à regarder un par un, pas à rétablir en masse.
- **Pas de pays obligatoire en modification** : la raison de #41 tient toujours.

## Réalisation

Développée le **2026-09-11**, commit `1046fc9`.

| Fichier | Ce qui a changé |
|---|---|
| `admin.js` | `populatePaysSelect()` mémorise la valeur sélectionnée avant de reconstruire la liste et la rétablit (D1). Nouvelle `ajouterPaysAncien()`, partagée avec `prefillForm()` : l'option « (ancien) » n'a plus qu'une seule écriture. Écouteur `change` du pays : sortie anticipée si `Dep` vaut déjà l'ISO ou commence par `ISO-` (D2). |
| `sw.js` | `CACHE_NAME` v304 → v305. |

**Vérifié** : syntaxe (`node --check`) ; banc jsdom sur la vraie page et le vrai `admin.js`,
**25/25** après correction contre **16/25** avant — copie et modification quel que soit l'ordre
d'arrivée des pays, pays hors référentiel (liste avant, après, rechargée), billet sans pays,
double chargement sans option en double, et les cinq cas de l'écouteur du département.

**Non vérifié** : un vrai navigateur, avec le vrai délai réseau. Le banc impose l'ordre d'arrivée ;
il ne reproduit pas un rendu. `menu.html` non touché : pas de bump du `?v=` de `global.js`.

---

*Spec du 2026-09-11.*
