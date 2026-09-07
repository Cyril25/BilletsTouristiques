# Demande #48 (prod) — Seul le demandeur clôt sa demande

- **Épic :** Corrections et évolutions
- **Demande :** #48 (prod) — Jean-Philippe, 2026-09-07, priorité normale, complexité S.
- **Concerne :** admins
- **Écran :** Gestion Demandes
- **Statut :** À tester
- **Commit :** _(voir Réalisation)_

## Contexte (demande)

> dans la gestion des demandes demandées par les admins, peux-tu faire en sorte que le test ne
> soit passé en terminé que par le membre qui en a demandé l'évolution, afin qu'il voie que le
> développement a été fait et qu'il doit tester et valider si cela correspond à ses attentes

## Analyse / décisions

- **« Terminé » est la conclusion du demandeur.** C'est lui qui a exprimé le besoin, à lui de dire
  qu'il est satisfait. Le reste du cycle — nouvelle, à cadrer, prêt à dev, en cours, à tester —
  ne change pas : n'importe quel admin continue de faire avancer le travail.
- **Le superadmin garde la main.** Sans ce filet, les demandes importées du Google Sheet, dont le
  demandeur n'est pas une personne, n'auraient plus personne pour les clore.
- **Garde d'écran, pas de RLS.** C'est une convention de travail entre six administrateurs, pas
  une frontière de sécurité : ajouter une policy à maintenir pour empêcher un abus que personne ne
  cherche à commettre serait un mauvais échange. Si un jour la table s'ouvre à d'autres profils,
  la question se reposera.
- **S'articule avec #33** : le demandeur est déjà prévenu par notification privée quand sa demande
  passe « À tester ». C'est exactement le moment où on lui demande de conclure — la boucle est
  fermée.
- Les deux chemins qui changent l'état sont couverts : le sélecteur rapide de la carte et la
  modale d'édition.

## Critères d'acceptation

1. Un admin qui n'est pas le demandeur ne peut pas passer une demande à « Terminé », et un message
   le lui dit en nommant la personne qui le peut.
2. Le demandeur le peut, depuis le sélecteur comme depuis la modale.
3. Le superadmin le peut sur n'importe quelle demande.
4. Tous les autres changements d'état restent ouverts à tous les admins.
5. Un refus laisse la demande dans son état réel, sans faux affichage.

## Réalisation

- **Fichiers :** `admin-demandes.js` (`peutTerminer()`, `refuserCloture()`, gardes dans
  `changerEtat()` et `sauverDemande()`).
- **Migration :** aucune.
- **Commit :** _(à compléter)_
