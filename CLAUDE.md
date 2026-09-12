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

### « Lance le système de surveillance des demandes »

Cette phrase de Cyril — ou toute formule voisine (« surveille les demandes », « remets la
surveillance en route ») — veut dire : **taper `/loop 15m /rituel-demandes`**. C'est la boucle
décrite dans `specs/evolutions/CONVENTION-DEMANDES.md`, § « Le rituel en boucle » : elle trie,
répond aux remarques et écrit les analyses toute seule, toutes les 15 minutes. Il ne retiendra pas
le nom exact de la commande : ne pas le lui demander, ne pas proposer autre chose.

La lancer dans la conversation en cours, en signalant en une ligne qu'un onglet dédié vaut mieux
s'il compte y travailler — les passages s'exécutent là où la boucle a été lancée. Elle meurt avec
sa conversation et expire au bout de 7 jours : c'est pour ça qu'il la redemande.
