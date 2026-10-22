# Demande #90 — « À cadrer par Jean-Philippe », comme « À tester par Jean-Philippe »

- **Épic :** Corrections et évolutions (complexité **S**)
- **Demande :** #90 de la table `demandes` de production — Cyril, 2026-10-22, priorité *normale*.
  Formulée dans la conversation avec l'assistant (à propos de #85), saisie par l'assistant à sa
  demande. Publics : membres, collecteurs, admins.
- **Statut :** à tester — en ligne le 2026-10-22.
- **Version en clair :** [demande-90-a-cadrer-par-demandeur-en-clair.md](demande-90-a-cadrer-par-demandeur-en-clair.md)

## Contexte (demande)

> le 85 est marqué à cadrer, j'aimerai qu'il soit marqué "a cadrer par Jean-Philippe" car sinon les
> gens ne se sentent pas concernées, comme "A tester par jean-philippe", c'est possible ?

## Constat

- Liste des demandes (`admin-demandes.js`, `renderDemandeRow()`) : depuis #49, sur une demande
  `a_tester`, l'option sélectionnée du sélecteur d'état devient « À tester par <prénom du
  demandeur> » (`nomTesteurParNumero()`), et la ligne se signale quand c'est à moi
  (`demande-row--a-tester-moi`). Rien de tel pour `a_cadrer`, qui attend pourtant aussi le
  demandeur.
- Fiche d'une demande (`demande.js`, `renderFiche()`) : le sélecteur d'état affiche les libellés
  bruts, « À tester » comme « À cadrer ». C'est là que le demandeur arrive par sa notification.

## Décisions

1. **Liste** : la règle de #49 vaut pour `a_cadrer` — « À cadrer par Jean-Philippe » sur la ligne,
   et une ligne mise en évidence quand c'est à moi de préciser (`demande-row--a-cadrer-moi`, teinte
   de l'état À cadrer : `--color-a-cadrer` / `--color-a-cadrer-bg`, en clair et en sombre).
2. **Fiche** : l'option de l'état courant dit « … par <prénom> » pour `a_cadrer` et `a_tester`
   (`nomAfficheParNumero()`). Les autres options et la valeur enregistrée ne changent pas.
3. Aucun nouvel état, aucune donnée : c'est un libellé.

## Critères d'acceptation

1. #85 dans la liste : « À cadrer par Jean-Philippe » ; chez Jean-Philippe, la ligne est mise en
   évidence.
2. Une demande à tester : « À tester par … », inchangé.
3. Sur la fiche de #85 : « À cadrer par Jean-Philippe ». Changer l'état et enregistrer fonctionne
   comme avant.

## Vérification

Banc jsdom `scripts/banc-62/test-90-a-cadrer-par.mjs` (non versionné) : vrai `admin-demandes.js` /
`demande.js` + `global.js`, rendu d'une ligne et de la fiche. **13/13** ; contre-épreuve sur
l'ancien code : 5 KO.

## Réalisation

Commit `e55b646` (2026-10-22), cache `v329` :

- `admin-demandes.js` — `renderDemandeRow()` : « … par » pour `a_cadrer` comme pour `a_tester`,
  `aMoiDeCadrer` → `demande-row--a-cadrer-moi` ;
- `demande.js` — `renderFiche()` : l'option de l'état courant nomme le demandeur ;
- `style.css` — `--color-a-cadrer` / `--color-a-cadrer-bg` (clair et les deux blocs sombres),
  `.demande-row--a-cadrer-moi`.

Vérifié : banc 13/13 (ci-dessus) ; site en ligne contrôlé. Base : demande créée par l'assistant à la
demande de Cyril, à tester + journal + docs, notification à Cyril, nouveauté `admins`.
**Pas vérifié** : vraie page connectée, mode sombre à l'écran, téléphone.
