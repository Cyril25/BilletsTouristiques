# Demande #36 (prod) — Amorce + millésime-version + nom dans l'entête des inscriptions

- **Épic :** Corrections et évolutions
- **Demande :** #36 de la table `demandes` **de production** — Jean-Philippe, 2026-07-25, normale / S.
- **Concerne :** admins
- **Écran :** Gestion Billets → modale Inscriptions
- **Statut :** À tester
- **Commit :** _(voir Réalisation)_

## Contexte (demande)

> lorsque l'on clique sur les inscriptions d'un billet, peux-tu mettre dans l'entête du billet :
> Amorce, Année-version, et le nom du billet

L'entête de la modale n'affichait que le nom du billet. Or plusieurs billets portent le même nom
(millésimes ou versions différents) : impossible de vérifier d'un coup d'œil qu'on regarde les
inscriptions du bon.

## Analyse / décisions

- **Même forme que partout ailleurs** : `UEBK 2026-14 NAUSICAA` — l'amorce, puis
  `millésime-version`, puis le nom. C'est déjà la forme de l'entête du détail de collecte et des
  récapitulatifs (#8) ; on ne crée pas une variante de plus.
- **Un helper `libelleBilletComplet()`** plutôt qu'une concaténation en ligne : la même forme
  resservira ailleurs dans `admin.js`.
- Chaque élément est **omis s'il est vide** (billet sans version, sans millésime), pour éviter les
  tirets orphelins.

## Critères d'acceptation

1. L'entête de la modale affiche `Inscriptions — <amorce> <millésime>-<version> <nom>`.
2. Un billet sans version affiche `<amorce> <millésime> <nom>`, sans tiret pendant.
3. Un billet sans amorce ni millésime affiche le nom seul, comme avant.

## Réalisation

- **Fichiers :** `admin.js` — `libelleBilletComplet()`, utilisé dans `openInscriptionsModal()`.
- **Migration :** aucune.
- **Commit :** _(à compléter)_
