# Épic — Corrections et évolutions

Épic « fourre-tout » qui regroupe les corrections et petites/moyennes évolutions
issues des **demandes d'amélioration** (table `demandes`, écran `admin-demandes.html`),
par opposition aux gros chantiers structurants qui ont leur propre épic/PRD.

## But

Avant de développer une demande passée en **Prêt à dev**, on rédige ici une courte
spec (contexte, analyse/décisions, critères d'acceptation). Une fois développée, on
complète la section **Réalisation** (fichiers touchés + commit). Ça permet de :

- ne pas partir en dev sans avoir un minimum analysé la demande ;
- garder la trace de ce qui a été **spécifié** et **fait**, et de faire le lien
  demande ↔ spec ↔ commit si on doit corriger plus tard.

## Convention

- Un fichier par demande : `demande-<id>-<slug>.md`.
- Le numéro de demande fait le lien avec la table `demandes` (et l'écran admin-demandes).
- Après dev, la demande passe en `a_tester` (voir la convention de traitement des demandes).

## Demandes rattachées

| Demande | Titre | Complexité | Statut | Spec | Commit |
|---|---|---|---|---|---|
| [#19](demande-19-selection-multiple-envois-recus.md) | Sélection multiple « marquer comme reçus » (historique envois) | S | À tester | ✅ | `9d4786e` |
| [#20](demande-20-annuler-paiement-confirme.md) | Annuler un paiement confirmé (+ refus déclaration existant) | S | À tester | ✅ | `f4b5cce` |
| [#25](demande-25-envoi-mode-adresse-prix-auto.md) | Mode d'envoi selon l'adresse + prix auto à l'expédition | M | À tester | ✅ | `eea5267` |
