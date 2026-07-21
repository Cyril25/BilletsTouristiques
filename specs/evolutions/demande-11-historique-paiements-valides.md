# Demande #11 — Historique des paiements validés (date de validation)

- **Épic :** Corrections et évolutions
- **Demande :** #11 · basse / M · collecteurs · Mes collectes
- **Statut :** À tester · **Commit :** `25ddee1`

## Contexte

> Historique des paiements validés pour le collecteur, pour vérifier en cas d'erreur de
> validation. (Aucune date/auteur de validation stocké aujourd'hui : migration nécessaire.)

## Décisions

- **Migration** : `inscriptions.date_validation` + `enveloppes.date_validation_port`
  (`scripts/migration-demande-11-date-validation.sql`). `valide_par` non ajouté : le
  collecteur valide ses propres collectes (info peu utile).
- La date de validation est posée à chaque confirmation (`validerPaiementVue`,
  `validerPaiementPort`, `validerTousPaiementsVue`) et **effacée** à l'annulation.
- La section « Paiements confirmés » (créée pour la demande #20) devient
  **« Historique des paiements validés »** : chaque ligne affiche « validé le JJ/MM/AAAA »,
  et garde le bouton « Annuler » pour corriger une erreur de validation.

## Réalisation

- `mes-collectes.js` (dates dans les confirmations/annulations, `labelDateValidation`,
  titres), `style.css` (`.paiement-valide-date`), `sw.js` (`billets-v249`),
  `scripts/migration-demande-11-date-validation.sql`. Commit `25ddee1`.
- **Lié :** [#20](demande-20-annuler-paiement-confirme.md) (même section).
