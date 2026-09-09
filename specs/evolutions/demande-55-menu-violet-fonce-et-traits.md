# Demande #55 (prod) — Le violet foncé ne voulait plus dire « titre de rubrique »

- **Épic :** Corrections et évolutions
- **Demande :** #55 (prod) — sebleniglo54@gmail.com, 2026-09-09, priorité normale, complexité S.
- **Concerne :** membres, collecteurs, admins
- **Écran :** Menu (téléphone)
- **Statut :** À tester
- **Commit :** `3fa09cb`

## Contexte (demande)

> Peut etre encore les trait de séparation blanc qui sont pas au bon endroit et les menus en
> violet foncé qui sont pas forcément les titres de rubriques

Déposée **trois minutes après la mise en ligne de #53** : c'est un retour direct sur ce que cette
demande venait de changer. Il porte juste.

## Analyse / décisions

### Le violet foncé disait trois choses à la fois

Après #53, `--color-primary` (`#5D3A7E`) servait de fond à :

1. les liens principaux (Accueil, Les billets) ;
2. les titres de rubrique (RESSOURCES, MON ESPACE…) ;
3. **la ligne de la page courante à l'intérieur d'un sous-menu.**

Le troisième usage était une faute de ma part. Dans un sous-menu au violet moyen, une ligne
soudain foncée emprunte exactement le vocabulaire visuel d'un en-tête de section : le lecteur y
lit un titre, alors que c'est une entrée. « Les menus en violet foncé qui ne sont pas forcément
les titres de rubriques » décrit ça très précisément.

**Correction : le violet foncé redevient la langue de la structure, et elle seule.** La page
courante se signale autrement — une barre verticale et du gras, sur le fond du sous-menu
inchangé.

### Pourquoi pas un fond plus clair plutôt que pas de fond

C'était la solution évidente ; elle ne passe pas. Mesuré avant de choisir, texte blanc sur le
fond obtenu :

| Fond de la ligne active | Résultat | Texte blanc | Écart avec la bande foncée |
|---|---|---|---|
| Aucun (fond du sous-menu) | `#7F58A0` | **5,5:1** | 1,60:1 |
| Voile noir 14 % (état après #53) | `#6D4C8A` | 6,9:1 | **1,29:1** — trop proche |
| Voile lilas 25 % | `#8C69AE` | **4,4:1** — sous AA | 2,00:1 |
| Voile blanc 10 % | `#8C69AA` | **4,5:1** — limite | 1,99:1 |

Tout éclaircissement ramène le texte blanc au seuil AA de 4,5:1 ou en dessous. **Ne rien peindre
est donc la seule option qui tienne les deux contraintes** : lisibilité et non-ambiguïté.

Au passage, la barre de la ligne active passe de `--color-accent` (`#B19CD9`, **2,3:1** sur ce
violet — insuffisant pour un élément d'interface, qui demande 3:1) à `--color-surface` (4,6:1).
Un défaut que #53 avait introduit sans que je le mesure.

### Le trait de séparation

Il était posé en `border-top` sur chaque groupe, avec `margin-top: 4px` — donc une bande de fond
de 4 px au-dessus de lui. Le trait ne touchait ni ce qui le précède ni ce qui le suit : il
flottait, et c'est ce qui le faisait paraître mal placé. Marge supprimée, il est collé au titre
qu'il introduit.

Sa place devient d'ailleurs pleinement justifiée avec [#56](demande-56-menu-mobile-repliable.md) :
sous-menus repliés, les titres de rubrique se suivent tous sur le même violet, et le trait est
alors la seule chose qui les sépare.

## Critères d'acceptation

1. Aucune ligne à l'intérieur d'un sous-menu n'a de fond violet foncé.
2. La page courante reste repérable au premier coup d'œil (barre à gauche + gras).
3. Tous les textes du menu restent au-dessus de 4,5:1, la ligne active comprise.
4. Le trait de séparation est collé au titre de rubrique qu'il précède, sans bande flottante.
5. Sur ordinateur, rien ne change.

## Réalisation

- **Fichiers :** `style.css` (`.dropdown-content a.active`, `.dropdown`, ordre du bloc tactile),
  `sw.js` (`CACHE_NAME`).
- **Migration :** aucune.
- **Commit :** `3fa09cb`
