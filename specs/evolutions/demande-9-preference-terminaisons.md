# Demande #9 — Préférence profil « terminaisons souhaitées »

- **Épic :** Corrections et évolutions
- **Demande :** #9 · basse / M · membres · Mon profil
- **Statut :** À tester · **Commit :** `00ba372`

## Contexte

> Préférence de profil pour les collectes : pré-remplir par défaut le commentaire
> « terminaisons demandées » des pré-inscriptions. (Migration : colonne membres.)

## Décisions

- **Migration** : `membres.terminaisons_pref TEXT` (`scripts/migration-demande-9-terminaisons-pref.sql`).
- Champ « Terminaisons souhaitées par défaut » sur le profil (chargé + sauvegardé).
- Dans le catalogue, à l'inscription à un billet en **Pré collecte**, le commentaire est
  pré-rempli avec cette préférence (label devient « Commentaire (terminaisons souhaitées) »)
  et reste modifiable. Hors pré-collecte, comportement inchangé.

## Réalisation

- `profil.html` + `profil.js` (champ, load/save), `app-new.js`
  (`membreTerminaisonsCatalogue` chargé dans `loadFraisPortCatalogue`, pré-remplissage du
  commentaire pour les pré-collectes), `sw.js` (`billets-v248`).
- Commit `00ba372`.
