# BilletsTouristiques — instructions Claude Code

Application de gestion de collection du groupe « Billets et Jetons Touristiques ».
Voir `README.md` pour l'architecture (statique + Firebase + Worker Cloudflare, GitHub Pages).

## Suivi & réflexion (repo notes séparé)

La fiche de suivi de ce projet est dans `..\notes\billets-touristiques.md` (repo git séparé, cloné à côté de celui-ci).

- **Début de session** : faire un `git pull` dans le repo notes puis lire la fiche (journal, à faire, réflexions).
- **Fin de session** : y reporter ce qui a été fait (entrée datée dans le Journal), les frictions et idées, puis commit-push le repo notes.

## Demandes d'amélioration

Le cycle de vie d'une demande (table `demandes`, écran `admin-demandes.html`) est décrit dans
`specs/evolutions/CONVENTION-DEMANDES.md` : ce que « traiter » veut dire, les états, la règle des
complexités L, la spec obligatoire avant dev, et ce qu'il faut faire **après** (pousser, bumper le
cache, prévenir le demandeur, annoncer la nouveauté).

**À lire avant de toucher à une demande**, y compris depuis une session qui n'a pas d'historique
sur ce projet.
