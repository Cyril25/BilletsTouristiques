# Demande #70 — Rappeler le billet dans la fenêtre d'une collecte

- **Complexité :** S — Prêt à dev au tri du 2026-09-14.
- **Demande :** #70, déposée par Jean-Antoine le 2026-09-14, priorité normale.
- **Concerne :** collecteurs et admins, fiche billet (`admin-billet.html`, `admin.js`, `style.css`).
- Version en clair : `demande-70-billet-dans-modale-collecte-en-clair.md`.

## Contexte (demande)

> Lors de la modification d'une fiche billet de pré collecte à collecte, serait-il possible d'ajouter
> le nom du billet ou bat sur la fiche qu'on modifie. Dans la popup de modification on aura « Modifier
> la collecte « Collecte 2026 » du billet "titre du billet" UEXX 2XXX-Y ». Attention si on ajoute le
> bat à que ça ne prenne pas trop de place car le formulaire est déjà grand

## Constat

- Depuis #41, l'ajout et la modification d'une collecte se font dans une modale
  (`#collecte-modal-overlay`) qui **recouvre la fiche**. Son seul repère est le titre posé par
  `editerCollecte()` : « Modifier la collecte « Collecte initiale » », ou « Ajouter une collecte ».
  Le nom de la collecte ne distingue pas les billets — après #16, **chaque** billet a sa « Collecte
  initiale ».
- La modale n'existe que sur la page dédiée, et seulement en modification d'un billet (la section
  Collectes est masquée à la création).
- `libelleBilletComplet()` (#36) produit déjà le libellé « UEBK 2026-14 NAUSICAA » utilisé par le
  détail de collecte et les récapitulatifs (#8).

## Décisions

### D1 — Une ligne sous le titre, pas un titre allongé

La demande propose d'allonger le titre. Sur téléphone, « Modifier la collecte « Collecte initiale »
du billet UEBK 2026-14 NAUSICAA » ferait trois ou quatre lignes, et c'est la place que la demande
demande d'épargner. Retenu : le titre ne change pas, et **une ligne en dessous** porte la miniature
et le libellé complet.

### D2 — Nom **et** image

Le tri du 14/09 l'a annoncé au demandeur : les deux, puisque la demande propose l'un ou l'autre. La
miniature est bornée à **72 × 40 px** (`object-fit: contain`, les billets sont en paysage) : elle
tient dans la hauteur d'une ligne de texte et demie, et n'allonge pas le formulaire.

### D3 — Lire la fiche telle qu'elle est affichée

Le libellé est construit depuis les champs du formulaire (`field-reference`, `field-millesime`,
`field-version`, `field-nom-billet`), et l'image depuis l'aperçu `#image-preview` s'il est visible.
C'est ce que l'admin a sous les yeux juste avant d'ouvrir la fenêtre — y compris une image qu'il
vient de téléverser sans avoir encore enregistré. Pas de requête : tout est déjà sur la page.

Sans image, la miniature disparaît et seul le libellé reste. Sans libellé ni image (cas théorique),
la ligne entière disparaît.

### D4 — Même rappel à l'ajout

`ouvrirCollecteModalUI()` est le passage commun de l'ajout et de la modification : la ligne y est
remplie, les deux cas en profitent.

## Critères d'acceptation

1. Modifier une collecte : sous « Modifier la collecte « … » », la miniature du billet et
   « AMORCE MILLÉSIME-VERSION NOM ».
2. Ajouter une collecte : même ligne sous « Ajouter une collecte ».
3. Billet sans image : le libellé seul, sans cadre vide.
4. Le formulaire de la fenêtre ne s'allonge que d'une ligne ; sur téléphone, la ligne passe à la
   ligne proprement sans déborder.
5. Lisible en mode sombre.

## Ce que cette spec ne fait pas

- **Le changement de statut rapide depuis la liste des billets** — hors demande, annoncé au tri.
- **Pas de changement du titre** de la fenêtre (D1).

## Réalisation

*À compléter.*
