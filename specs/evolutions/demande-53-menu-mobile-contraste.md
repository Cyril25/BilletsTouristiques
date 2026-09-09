# Demande #53 (prod) — Menu sur téléphone : titres invisibles et hiérarchie illisible

- **Épic :** Corrections et évolutions
- **Demande :** #53 (prod) — sebleniglo54@gmail.com, 2026-09-09, priorité normale, complexité M.
- **Concerne :** membres, collecteurs, admins
- **Écran :** Menu (toutes les pages)
- **Statut :** À tester
- **Commit :** `8d4899b`, puis correctif du survol

## Contexte (demande)

> Modifier le visuel du menu sur téléphone ou tablette pour que sa soit plus jolie/lisible, régler
> le problème d'affichage quand on clique sur une option le titre devient invisible.

La demande porte deux choses de nature différente : un **bug précis** (« le titre devient
invisible ») et un **souhait esthétique** sans direction (« plus jolie »). Arbitrage demandé à
Cyril au tri : périmètre retenu = **contraste + retouche sobre du menu mobile**, sans refonte ni
nouvelle palette. D'où la complexité M plutôt que S.

## Analyse / décisions

### Le titre invisible : le texte et son fond sont la même variable

`.dropdown-header` — « Infos pratiques », « Communauté » — est en `color: var(--color-secondary)`.
Sur mobile, la règle `.dropdown-content { background: var(--color-secondary); }` donne au sous-menu
**exactement cette couleur**. Contraste **1,0:1** : ces titres ne sont pas pâles, ils n'existent
pas. C'est la lecture littérale de la demande, et c'est le défaut le plus grave du lot.

Sur le bureau, le même titre s'affiche sur le panneau blanc (5,5:1) : le défaut est **mobile
uniquement**, ce qui explique qu'il ait survécu si longtemps.

### L'état « page courante » : un lilas posé sur des fonds clairs

`--color-accent` (`#B19CD9`) est un lilas conçu pour se poser sur le violet foncé. Il sert
pourtant de couleur de texte à l'état actif, y compris là où le fond est clair :

| Règle | Avant | Contraste |
|---|---|---|
| `.dropdown-content a.active` | `#B19CD9` sur `#F5F5F5` | **2,2:1** |
| `.nav-links a.active` | `#B19CD9` sur `#7F58A0` | **2,3:1** |
| `.dropbtn.active` | `#B19CD9` sur `#5D3A7E` | **3,7:1** |
| `.dropdown-content a` | `#DDDDDD` sur `#7F58A0` | **4,1:1** |

Les quatre sont sous le seuil AA (4,5:1). Le pire est le premier : sur le menu mobile violet,
l'entrée de la page où l'on se trouve devient un **pavé gris clair** portant un texte lilas — soit
précisément l'option qu'on vient de choisir. « Quand on clique sur une option, le titre devient
invisible » décrit les deux défauts à la fois, et les deux sont réels.

**Règle retenue :** sur fond violet, le texte est blanc ou `--color-surface`. Le lilas n'est pas
supprimé — il redevient ce pour quoi il est lisible : **une barre, pas du texte** (une barre
décorative n'a besoin que de 3:1, et `#B19CD9` sur `#5D3A7E` donne 3,7:1).

Côté bureau, le panneau du dropdown est blanc : l'état actif y devient du violet foncé sur la
teinte mauve `--color-surface` (7,4:1), qui appartient déjà à la palette.

### La retouche sobre : la hiérarchie plutôt que la décoration

Le menu mobile centrait **tout** — liens principaux, titres de groupe, entrées de sous-menu. Une
liste centrée n'offre aucun bord commun où accrocher l'œil, et plus rien ne distingue un titre
d'un lien. Le passage à un **alignement à gauche** avec **retrait des sous-entrées** (36 px)
rétablit la hiérarchie sans rien ajouter à l'écran.

Les titres de groupe (`.dropbtn`) passent en **petites capitales espacées** : ils ressemblaient à
des liens alors qu'ils n'en sont pas — sur mobile le chevron est masqué et les sous-menus sont
toujours dépliés, donc rien ne signalait leur statut. Un filet de séparation entre groupes, et la
hauteur maximale du menu passe en `100dvh` (avec `100vh` conservé en repli) — même raison que
pour la demande #52 : `vh` ignore la barre d'adresse du téléphone.

### Ce qu'on ne fait pas

- **Aucune couleur de la palette n'est modifiée.** Les quatre violets restent ceux du site : le
  correctif change quelle couleur va où, pas les couleurs elles-mêmes.
- **`menu.html` n'est pas touché** — donc pas de cache-buster `?v=` à bumper dans `global.js`,
  seulement `CACHE_NAME` dans `sw.js`. Tout tient dans `style.css`.
- **Pas de refonte** : ni nouvelle mise en page, ni icônes ajoutées, ni animation. La demande
  parle de lisibilité ; la lisibilité est ce qui a été traité.

## Retour de Cyril : le survol, troisième occurrence du même défaut

Premier correctif incomplet. J'avais audité l'état **au repos** et l'état **page courante**, pas
l'état **survol** — et c'est exactement là que le défaut se reproduisait une troisième fois :

```css
.dropdown-content a:hover { color: var(--color-secondary); }   /* sur un fond --color-secondary */
```

**1,0:1 de nouveau.** Sur un écran tactile, `:hover` ne se lève pas : il reste collé au lien
touché jusqu'au tap suivant. Le lien qu'on vient de choisir disparaît donc, et y reste. C'est
littéralement ce que décrit la demande — « quand on clique sur une option » — et ce que le premier
correctif n'avait pas traité.

Le fond de survol du bureau (`--color-bg-hover`, `#F5F5F5`) ne s'appliquait pas, lui, parce que
`.dropdown-content a` porte `background-color: transparent !important` ; seule la **couleur du
texte** passait. D'où un texte invisible plutôt qu'un pavé clair : deux symptômes, une cause.

Corrigé : sur mobile, `:hover`, `:focus` et `:active` gardent le texte blanc et **assombrissent**
le fond de 14 %. Assombrir plutôt qu'éclaircir n'est pas cosmétique — un voile blanc à 12 %
remontait le fond à 4,3:1 sous du texte blanc, soit sous le seuil AA ; l'assombrissement donne
6,9:1. Même piège un cran plus haut : `.dropdown:hover` repeignait **tout le groupe** en
`--color-secondary`, effaçant la séparation entre la bande du titre et son sous-menu — annulé sur
mobile, où le survol n'a pas de sens.

**Leçon :** sur une maquette tactile, auditer les états `:hover` / `:focus` / `:active` au même
titre que l'état au repos. Sur mobile ils ne sont pas transitoires, ils collent. Les dix couples
texte/fond du menu ont ensuite été recalculés d'un bloc — aucun ne descend sous son seuil.

## Critères d'acceptation

1. Sur téléphone, « Infos pratiques » et « Communauté » sont lisibles dans « Ressources ».
2. L'entrée de la page où l'on se trouve est lisible et se distingue du reste au premier coup d'œil.
3. Le titre du groupe contenant la page courante ressort au lieu de pâlir.
4. Tous les textes du menu mobile atteignent au moins 4,5:1 sur leur fond, **y compris juste
   après avoir touché un lien** (l'état de survol reste collé sur un écran tactile).
5. La liste se lit alignée à gauche, les entrées de sous-menu en retrait sous leur groupe.
6. Le bas du menu reste atteignable quand la liste est longue (cas admin), barre d'adresse comprise.
7. Sur ordinateur, le menu garde sa forme : seule la couleur de l'état actif change.

## Réalisation

- **Fichiers :** `style.css` (`.nav-links a.active`, `.dropbtn.active`, `.dropdown-content a.active`,
  et le bloc `@media (max-width: 768px)` du menu réécrit — puis les états `:hover` / `:focus` /
  `:active` du sous-menu et `.dropdown:hover`), `sw.js` (`CACHE_NAME`).
- **Migration :** aucune.
- **Aperçu soumis à Cyril avant mise en ligne :**
  https://claude.ai/code/artifact/142abd7f-c2df-4a18-9140-ad0bb98e9d12
- **Commit :** `8d4899b`
