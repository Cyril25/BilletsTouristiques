# Demande #54 (prod) — Mode sombre et mode clair

- **Épic :** Corrections et évolutions
- **Demande :** #54 (prod) — jeanphilippe.zizek@gmail.com, 2026-09-09, priorité normale.
- **Complexité :** ~~L~~ → **M** (ré-estimée après mesure, voir ci-dessous)
- **Concerne :** membres, collecteurs, admins
- **Écran :** tous
- **Statut :** À tester
- **Commits :** `68b9394`, `773675e`, `04e2fea`, `1ffb71f`

## Contexte (demande)

> faire un mode sombre et un mode clair pour l'interface graphique

## L'estimation initiale était fausse

Cotée **L** au tri, sur ce raisonnement : « ~580 couleurs écrites en dur, donc le vrai chantier
est la tokenisation ». Cyril a objecté qu'il n'avait pas l'impression d'un gros morceau. Mesure
faite, il avait raison, et l'erreur méritait d'être comprise.

**J'avais compté des occurrences, pas des valeurs, et pas regardé ce qui existait déjà.**

| | Occurrences | Valeurs distinctes |
|---|---|---|
| `style.css` hors `:root` | 300 | 69 |
| Balises `<style>` — **4 pages seulement** | 122 | 41 |
| Fichiers `.js` | 84 | 39 |
| **Total** | 506 | **117** |

Trois faits que le comptage brut masquait :

1. **`style.css` est déjà tokenisé à 77 %** — 1001 appels `var(--color-*)` contre 300 littéraux.
   La fondation que je décrivais comme manquante était largement là.
2. **Sur les 300 littéraux, 161 sont des replis de `var()`** (`var(--jeton, #hex)`). Ils ne sont
   pas de la dette : le jeton l'emporte dès qu'il est défini. Il n'y avait donc que **139**
   littéraux réels, et **61** après l'étape 1.
3. **Les couleurs porteuses de sens sont déjà nommées** : 24 jetons `--color-badge-*`,
   `--color-success`, `--color-danger`, `--color-warning`, `--color-info` existent. Le point que
   je présentais comme le plus délicat — « le vert payé et le rouge dû ne s'inversent pas
   naïvement » — n'est pas un travail de fouille mais un travail de choix, sur une liste déjà
   écrite.

**Leçon à garder :** avant de coter un chantier sur un volume, vérifier ce que ce volume recouvre
réellement. Un comptage d'occurrences additionne des répétitions et gonfle mécaniquement une
estimation.

## Décisions (Cyril, 2026-09-09)

| Question | Décision |
|---|---|
| Déclenchement | **Les deux** : préférence système par défaut, plus une bascule à trois positions Clair / Sombre / Automatique |
| Mémorisation | **Sur l'appareil** (`localStorage`) — pas de migration de base, et le thème s'applique avant le premier rendu |
| Emplacement | **Dans le menu**, près du bloc de compte |

## Architecture retenue

- Attribut `data-theme` sur `<html>` : absent = automatique (`prefers-color-scheme` décide),
  `"light"` ou `"dark"` = choix forcé.
- Trois blocs de jetons : `:root` (clair, complet), `@media (prefers-color-scheme: dark)` guardé
  par `:root:not([data-theme="light"])`, et `:root[data-theme="dark"]`. Le guard est ce qui permet
  à un choix « clair » explicite de l'emporter sur un système en sombre.
- `color-scheme: light dark` sur `:root` pour que les contrôles de formulaire et les barres de
  défilement suivent.
- **Anti-clignotement** : un script en ligne de trois lignes dans le `<head>` des 27 pages, posé
  juste avant `style.css`. `global.js` se charge en fin de corps — l'y mettre ferait clignoter le
  blanc à chaque page sur un appareil en mode sombre. L'ancre est uniforme dans les 27 fichiers.

## Étapes

### Étape 1 — tokenisation, à rendu strictement inchangé ✅ `68b9394`

78 occurrences remplacées dans `style.css`. Aucune couleur ne bouge à l'écran : chaque littéral
vaut exactement le jeton qui le remplace. Deux précautions, chacune trouvée en se trompant d'abord :

- **La propriété CSS décide du jeton.** `#FFFFFF` porte **deux** jetons — `--color-text-inverse`
  et `--color-bg-white`. Identiques aujourd'hui, ils divergeront en sombre : un fond doit devenir
  foncé là où un texte inversé reste clair. Réparti sur la propriété : 23 en texte, 10 en fond.
  Même traitement pour `#E67E22` et `#E0E0E0`.
- **Les replis de `var()` ne se touchent pas.** Remplacer le `#ddd` de `var(--color-border, #ddd)`
  par un autre jeton viderait le repli de son sens. Vérifié : 161 avant, 161 après.

### Étape 2 — nommer les 60 littéraux restants de `style.css`

Ils ne forment pas 60 décisions mais une dizaine de **familles de teintes**, chacune un fond pâle
avec son texte et sa bordure : vert d'export (`#f0faf0` / `#0f9d58`), orange d'avertissement
(`#fff7ed` / `#b3560f` / `#f0b27a`), rouge d'erreur (`#FFE6E6` / `#B71C1C`), violet, bleu, or.
Environ 25 jetons à ajouter, par paires fond/texte — ce sont précisément les paires qui doivent
s'inverser proprement en mode sombre.

### Étape 3 — les 4 pages à `<style>` et les styles en ligne des `.js`

`admin-notifications.html` (49), `mes-contacts.html` (31), `admin-stats.html` (25),
`notifications.html` (16). Côté `.js`, 84 occurrences dont une table de couleurs de statut dans
`admin-demandes.js` et des `style="color:#666"` glissés dans des `innerHTML`.

**Cette étape n'est pas optionnelle** : deux de ces pages sont vues par tous les membres. Un mode
sombre qui laisse des plaques blanches est pire que pas de mode sombre.

### Étape 4 — palette sombre, plomberie et bascule

Valeurs sombres pour l'ensemble des jetons, script anti-clignotement dans les 27 pages, bascule à
trois positions dans `menu.html`.

⚠ `menu.html` étant modifié, il faudra bumper **le `?v=` du fetch dans `global.js`** en plus de
`CACHE_NAME` dans `sw.js`.

## Critères d'acceptation

1. Sur un appareil réglé en sombre, le site s'ouvre en sombre sans rien avoir à régler.
2. La bascule permet de forcer Clair ou Sombre, et le choix survit au rechargement.
3. Aucun éclair blanc au chargement d'une page en mode sombre.
4. Aucune plaque claire résiduelle : les 4 pages à `<style>` et les vues générées par les `.js`
   suivent le thème.
5. Les couleurs qui portent un sens gardent leur sens : vert = payé, orange = déclaré, rouge = dû,
   avec un contraste au moins équivalent en sombre.
6. Tous les textes restent au-dessus de 4,5:1 dans les deux thèmes.
7. Sur un appareil réglé en clair, rien ne change par rapport à aujourd'hui.

## Réalisation

- **Étape 1** — tokenisation de `style.css` : `68b9394`
- **Étape 2** — 60 littéraux nommés par rôle, 38 jetons : `773675e`
- **Étape 3** — 5 pages à `<style>` (100 occurrences) et 30 styles en ligne des `.js` : `04e2fea`
- **Étape 4** — palette sombre (91 jetons), bascule, anti-clignotement dans 27 pages : `1ffb71f`
- **Cache :** `sw.js` v297 et `?v=201` sur `menu.html` dans `global.js` (menu modifié)

### Trouvé en chemin

**11 jetons étaient invoqués partout sans jamais être définis** — 35 appels pour
`--color-text-light` à lui seul. Leur repli s'appliquait donc toujours, et serait resté clair en
mode sombre. Deux d'entre eux (`--color-text-primary`, `--color-card-bg`) n'avaient même aucun
repli et ne produisaient rien du tout. Tous définis en alias vers un jeton réel, donc ils suivent
désormais le thème.

Et les replis de `--color-primary-rgb` trouvés dans le code étaient **tous faux** — `0,0,0`,
`44,62,80`, `59,130,246` : les `rgba()` bâtis dessus n'affichaient pas la couleur du site.

### Contrastes mesurés

23 couples texte/fond vérifiés dans les deux thèmes. **Aucun sous 4,5:1 en sombre**, qui est même
plus contrasté que le clair. Deux couples sont sous AA **en mode clair depuis toujours** —
« indication sur une carte » à 3,5:1 et « avoir sur son fond » à 4,4:1. Défauts préexistants,
laissés tels quels pour ne rien changer au rendu clair ; à traiter par une demande dédiée.
- **Migration :** aucune (choix mémorisé sur l'appareil).
