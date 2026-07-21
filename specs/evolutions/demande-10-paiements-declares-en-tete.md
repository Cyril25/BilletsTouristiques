# Demande #10 — Paiements déclarés en tête (Vérification paiement)

- **Épic :** Corrections et évolutions
- **Demande :** #10 · basse / S · collecteurs · Mes Paiements
- **Statut :** À tester · **Commit :** `25ddee1`

## Contexte

> Dans mes paiements, classer en tête les paiements validés (ceux que les membres ont
> déclarés comme payés).

## Décisions

- Dans « Vérification paiement » (groupé par membre), tri modifié : les membres ayant au
  moins un paiement à l'état `declare` (inscription ou frais de port) remontent en tête,
  puis tri alphabétique nom/prénom. Ce sont ceux sur lesquels le collecteur a une action
  (confirmer).

## Réalisation

- `mes-collectes.js` (`renderVerificationPaiement` : helper `groupeADeclare` + tri),
  `sw.js` (`billets-v249`). Commit `25ddee1`.
