# Demande #23 — Mode « vacances / absent » sur le profil

- **Épic :** Corrections et évolutions
- **Demande :** #23 (table `demandes`)
- **Priorité / Complexité :** normale / M
- **Concerne :** membres, collecteurs, admins
- **Écran :** Profil (membre) + Mes collectes (collecteur)
- **Statut :** À tester
- **Commit :** `e4dde41`

## Contexte (demande)

> Mettre un système vacances sur le profil pour indiquer aux collecteurs que les
> paiements seront faits plus tard et qu'il ne faut pas faire d'envoi.

## Analyse / décisions

- **Migration nécessaire** : nouvelle colonne `membres.en_vacances boolean NOT NULL
  DEFAULT false` (`scripts/migration-demande-23-en-vacances.sql`, exécutée dans Supabase
  avant déploiement — le REST ne fait pas de DDL). **RLS inchangée** : le membre met
  déjà à jour sa propre ligne `membres` (profil), les collecteurs lisent déjà les lignes
  membres.
- **Champ minimal** : un booléen (pas de date de retour ni de message libre) — colle à la
  demande et reste simple. Le membre coche/décoche. Extension possible plus tard (date de
  retour) si besoin.
- **Surfaçage côté collecteur** aux deux endroits qui correspondent aux deux préoccupations
  de la demande :
  - **Préparation des envois** (« ne pas envoyer ») — badge dans l'en-tête de chaque carte
    membre.
  - **Vérification paiement** (« paiement plus tard ») — badge dans l'en-tête du groupe
    membre.
  - `en_vacances` ajouté aux `select` membres et à l'enrichissement `adresse_snapshot` déjà
    en place ; un seul helper `badgeVacances()`.
- **Non couvert volontairement** : le badge n'est pas ajouté partout (détail d'enveloppe
  passée, historique…) pour rester ciblé sur les deux vues d'action du collecteur.

## Critères d'acceptation

1. Le membre voit une case « Mode vacances / absent » sur son profil, avec une explication.
2. La case reflète l'état stocké (`en_vacances`) et se sauvegarde avec le reste du profil.
3. Quand un membre est en vacances, un badge « En vacances » apparaît côté collecteur dans
   la Préparation des envois et la Vérification paiement, pour ce membre.
4. Aucune régression si `en_vacances` est absent/false (comportement identique à avant).

## Réalisation

- **Migration :** `scripts/migration-demande-23-en-vacances.sql` (colonne
  `membres.en_vacances`).
- **Fichiers :** `profil.html` (case), `profil.js` (select + prefill + save),
  `mes-collectes.js` (`badgeVacances`, `en_vacances` dans les 2 select/enrichissements +
  badge dans `renderEnveloppeCard` et l'en-tête groupe de `renderVerificationPaiement`),
  `style.css` (`.badge-vacances`, `.profil-vacances-*`), `sw.js` (cache `billets-v236`).
- **Commit :** `e4dde41` — feat(membre): mode vacances sur le profil + badge cote collecteur.
