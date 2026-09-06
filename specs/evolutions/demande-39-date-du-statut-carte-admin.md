# Demande #39 (prod) — Date du statut courant sur la carte billet (admin)

- **Épic :** Corrections et évolutions
- **Demande :** #39 de la table `demandes` **de production** — Jean-Philippe, 2026-07-27, normale / S.
- **Concerne :** admins
- **Écran :** Gestion Billets
- **Statut :** À tester
- **Commit :** _(voir Réalisation)_

## Contexte (demande)

> dans la gestion des billets, à côté du statut mettre la date de celui-ci, par exemple
> pré collecte 01/05/2026, collecte 02/05/2026, afin que l'admin voie pour un billet sa date pour
> décider si on doit la clôturer ou non

## Analyse / décisions

- **La date du statut courant, pas les trois dates.** Le but énoncé est de décider s'il faut
  clôturer : ce qui compte est « depuis quand ce billet est-il dans cet état ». Afficher
  `date_pre`, `date_coll` et `date_fin` alourdirait une carte déjà dense sans servir la décision.
- **Correspondance** : Pré collecte → `date_pre`, Collecte → `date_coll`, Terminé → `date_fin`,
  colonnes de `collectes` depuis #16.
- **Billet à plusieurs collectes** : le statut affiché est dérivé de toutes ses collectes. On prend
  la date de la collecte qui porte ce statut ; si aucune ne le porte, on n'affiche **rien** plutôt
  qu'une date arbitraire qui induirait en erreur.
- Rien n'est affiché si la date est vide.

## Critères d'acceptation

1. La carte affiche « depuis le JJ/MM/AAAA » sous la pastille de statut.
2. La date correspond au statut affiché, pas à une autre étape.
3. Un billet sans collecte, ou dont la date du statut est vide, n'affiche rien de plus.
4. Changer le statut depuis la carte met la date à jour au rechargement.

## Réalisation

- **Fichiers :** `admin.js` — `CHAMP_DATE_PAR_STATUT`, `dateDuStatutCollecte()`,
  `dateStatutCarte()`, affichage dans la carte ; `style.css` (`.admin-card-statut-date`).
- **Migration :** aucune.
- **Commit :** _(à compléter)_
