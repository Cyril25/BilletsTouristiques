# Demande #12 — Bug : date pré-collecte en sortant de « Masqué »

- **Épic :** Corrections et évolutions
- **Demande :** #12 · basse / S · admins · Gestion Billets
- **Statut :** À tester · **Commit :** `25ddee1`

## Contexte

> Bug : lorsqu'un billet est masqué et qu'on le passe en pré-collecte, il garde la date
> d'ajout du billet au lieu de la date du jour.

## Analyse / décisions

- Dans `getDateUpdatesForStatusChange`, l'auto-remplissage de `DatePre` ne se faisait que
  si la date était **vide** (`!existingDates.DatePre`). Un billet masqué garde souvent une
  `DatePre` (sa date d'ajout), donc l'auto-remplissage était sauté.
- Fix : si `oldStatus === 'Masqué'` et `newStatus === 'Pré collecte'`, forcer
  `DatePre = aujourd'hui` (écrasement), conformément au comportement attendu.

## Réalisation

- `admin.js` (`getDateUpdatesForStatusChange`). Commit `25ddee1`.
