# Demande #56 (prod) — Sous-menus repliables sur téléphone

- **Épic :** Corrections et évolutions
- **Demande :** #56 (prod) — sebleniglo54@gmail.com, 2026-09-09, priorité normale, complexité M.
- **Concerne :** membres, collecteurs, admins
- **Écran :** Menu (téléphone)
- **Statut :** À tester
- **Commit :** _(voir Réalisation)_

## Contexte (demande)

> Simplifier le menus sur téléphone en créant des menus et sous menus pour plus de lisibilité et
> que sa soit plus intuitif

## Analyse / décisions

### Le problème : tout était déplié en permanence

Sur téléphone, une règle héritée masquait le chevron avec ce commentaire : « le menu est toujours
déplié sur mobile, le chevron n'a pas de sens ». C'était le constat, pas une décision — et il
produisait une liste à plat. Pour un admin : 2 liens principaux, puis Ressources (7 entrées,
2 en-têtes, 1 séparateur), Mon espace (6), Administration (10), plus le bloc de compte.
**Une trentaine de lignes d'affilée**, à faire défiler pour atteindre quoi que ce soit.

C'est ce que veut dire « simplifier » ici : il n'y avait aucune hiérarchie navigable, seulement
une hiérarchie typographique.

### Ce qui a été fait

- Les sous-menus sont **repliés par défaut** ; on touche un titre de rubrique pour l'ouvrir.
- **Un seul groupe ouvert à la fois.** C'est ce qui raccourcit réellement la liste : avec trois
  groupes ouvrables indépendamment, on retomberait sur la liste à plat au bout de trois gestes.
- **Le groupe contenant la page courante s'ouvre d'emblée** : on ouvre le menu là où l'on se
  trouve, et non sur un mur fermé. L'état de départ se déduit de l'URL et non de la classe
  `.active`, que `highlightActiveLink()` ne pose que 100 ms plus tard — dépendre de ce délai
  aurait été fragile.
- **Le chevron réapparaît** et pivote à l'ouverture.
- `aria-expanded` est tenu à jour sur chaque titre de rubrique.

### Deux pièges traités

**Le survol du bureau aurait tout ouvert.** La règle `.dropdown:hover .dropdown-content { display: block }`
se déclenche au toucher sur un écran tactile : les sous-menus se seraient ouverts sans qu'on le
demande, et seraient restés ouverts. Elle est explicitement neutralisée sous 768 px, et c'est la
classe `.open` — posée par un clic délibéré — qui gouverne seule.

**`menu.html` n'est pas modifié.** Le repliage est câblé en délégation d'événement depuis
`global.js`, après l'injection du menu. Conséquence pratique : pas de cache-buster `?v=` à bumper
dans `global.js`, seulement `CACHE_NAME` dans `sw.js`.

### Ce qu'on ne fait pas

Sur ordinateur, rien ne change : le survol continue de gouverner les sous-menus, et le
gestionnaire de clic sort immédiatement au-dessus de 768 px.

## Critères d'acceptation

1. Sur téléphone, le menu ouvert tient sur beaucoup moins de lignes qu'avant : les rubriques sont
   fermées.
2. Toucher un titre de rubrique l'ouvre ; en toucher un autre ferme le premier.
3. La rubrique contenant la page courante est déjà ouverte à l'ouverture du menu.
4. Le chevron pivote selon l'état.
5. Toucher une entrée de sous-menu navigue normalement — le repliage ne bloque pas les liens.
6. Sur ordinateur, les sous-menus s'ouvrent toujours au survol, comme avant.

## Réalisation

- **Fichiers :** `global.js` (`setupMobileDropdowns()`, appelée dans `loadMenu()`), `style.css`
  (bloc `@media (max-width: 768px)` : chevron, `.dropdown-content` replié, `.dropdown.open`),
  `sw.js` (`CACHE_NAME`).
- **Migration :** aucune.
- **Commit :** _(à compléter)_
