# Demande #7 — Export CSV : nom de fichier + ligne de totaux

- **Épic :** Corrections et évolutions
- **Demande :** #7 · basse / S · collecteurs · Mes collectes
- **Statut :** À tester · **Commit :** `00ba372`

## Contexte

> Export CSV : mettre l'amorce et le millésime du billet dans le nom du fichier
> (ex. Collecte UEBU_2026-7_PARIS) et ajouter une ligne de totaux en bas des colonnes.
> (Amorce = champ Reference. Nom actuel : Collecte_<Nom>_<date>.csv.)

## Décisions

- Nom de fichier : `Collecte_{Reference}_{Millesime}-{Version}_{NomBillet}.csv` (parties
  omises si vides). Remplace `Collecte_<Nom>_<date>.csv`.
- Ligne « TOTAL » ajoutée en bas, avec la somme des colonnes « Nb billets normaux » et
  « Nb billets variantes » (alignée sur les bonnes colonnes selon versions du billet).

## Réalisation

- `mes-collectes.js` (`exporterCSV` : ligne totaux + nom de fichier), `sw.js` (`billets-v248`).
- Commit `00ba372`.
