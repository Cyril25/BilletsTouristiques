# Demande #4 — Somme due affichée dans la barre de menu (membre)

- **Épic :** Corrections et évolutions
- **Demande :** #4 (table `demandes`)
- **Priorité / Complexité :** basse / M
- **Concerne :** membres
- **Écran :** Menu / Navigation
- **Statut :** À tester
- **Commit :** `7592acc`

## Contexte (demande)

> Afficher la somme que l'on doit en collecte dans la barre de menu, à côté de la cloche.
> Commentaire : tout ce que l'on doit, frais de port et billets tout statut confondus.

## Analyse / décisions

- La cloche est **admin-only** ; la demande vise les **membres** → nouvelle pastille
  « somme due » dans la barre de menu (`menu.html`), affichée seulement si le total > 0.
  (Bump du cache-buster `menu.html?v=160` + `sw.js` — cf. règle projet.)
- **Calcul** (`loadSommeDue` dans `global.js`, appelé au chargement du menu, donc sur toutes
  les pages) — ce que le membre doit **encore payer** :
  - Inscriptions `statut_paiement = 'non_paye'` (hors `pas_interesse`), hors billets en
    `Pré collecte` / `Pas de collecte` (pas de prix) : montant billets (normaux + variantes)
    + frais de port **inline** si `PayerFDP = 'oui'` (via la grille `frais_port`, selon le
    pays du membre et le mode d'envoi).
  - Frais de port **standalone** dus : enveloppes du membre avec `prix_envoi_reel` et
    `statut_paiement_port = 'non_paye'`.
  - **Exclusion bénéficiaire** : si le membre est le collecteur du billet (`billet.Collecteur`
    == son alias), il ne se doit rien (cf. règle collecteur-bénéficiaire).
- **Interprétation retenue** : « ce que l'on doit » = montants **non payés** (`non_paye`).
  Les paiements `declare` (déclarés, en attente de confirmation) sont considérés déjà réglés
  et **non comptés**. À ajuster si Cyril veut les inclure.
- La pastille pointe vers `mes-inscriptions.html` (où le détail du dû est déjà affiché).

## Critères d'acceptation

1. Un membre qui doit de l'argent voit une pastille « X,XX € » dans la barre de menu.
2. Le montant = billets non payés (+ frais de port inline) + frais de port standalone dus.
3. Rien n'est compté pour les collectes dont le membre est bénéficiaire (collecteur).
4. Si le membre ne doit rien, la pastille est masquée.

## Réalisation

- **Fichiers :** `menu.html` (pastille `#somme-due-pill`), `global.js` (`loadSommeDue` +
  appel dans `loadMenu`, bump `menu.html?v=160`), `style.css` (`.somme-due-pill`),
  `sw.js` (cache `billets-v238`).
- **Commit :** `7592acc` — feat: demandes #2, #3, #4.
