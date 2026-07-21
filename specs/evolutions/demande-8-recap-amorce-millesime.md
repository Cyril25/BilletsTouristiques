# Demande #8 — Amorce + millésime dans le récap individuel

- **Épic :** Corrections et évolutions
- **Demande :** #8 · basse / S · collecteurs · Mes collectes
- **Statut :** À tester · **Commit :** `00ba372`

## Contexte

> Dans le récap individuel, faire apparaître l'amorce et le millésime
> (ex. UEBK 2026-14 NAUSICAA). (Commentaire : « Oui recap identique ».)

## Décisions

- Le récap **global** construisait déjà « Amorce Millésime-Version Nom ». On aligne le
  récap **individuel** (messages de relance) sur ce format via un helper partagé
  `refBilletLabel(billet)` → « Reference Millesime-Version NomBillet ».

## Réalisation

- `mes-collectes.js` (`refBilletLabel` + usage dans la relance individuelle et le récap
  global refactorisé), `sw.js` (`billets-v248`).
- Commit `00ba372`.
