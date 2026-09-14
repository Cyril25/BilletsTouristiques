# Demande #68 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin. Aucune connaissance technique n'est
> nécessaire. La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `6f6dff9` (14/09/2026) ; développée au commit `7166263`.

## De quoi il s'agit

Dans la liste des demandes, une analyse « à valider » ne dit pas **à qui c'est le tour**. Quand
vous avez laissé une remarque, vous ne savez pas, sans ouvrir la fiche, si l'assistant y a déjà
répondu — et s'il vous a posé une question en retour.

## Ce qui change

Sur une demande en « Analyse à valider » :

- si **la dernière personne à avoir commenté est un admin**, la ligne affiche une petite étiquette
  **« Assistant »** avec un sablier : **c'est à l'assistant de répondre**. En passant la souris
  dessus, on voit qui a écrit et quand. La ligne ne se colore plus en « à relire » : ce n'est pas
  votre tour ;
- si **l'assistant a répondu en dernier**, ou s'il n'y a encore aucun commentaire, rien de nouveau :
  la ligne se colore « à relire » comme aujourd'hui, **c'est à vous**.

C'est exactement la règle que l'assistant utilise lui-même pour savoir qu'une remarque l'attend :
l'écran et lui ne pourront pas se contredire.

### Et quand l'assistant a répondu *(ajouté le 14/09, après les tests de Cyril)*

Si l'assistant a répondu en dernier **à des remarques**, la ligne dit **de qui on attend la
réaction** : une petite étiquette par personne, avec un sablier et son prénom — « ⏳ Jean-Philippe »,
« ⏳ Cyril ». En passant la souris dessus : « L'assistant a répondu à Jean-Philippe le … ».

- Si Jean-Philippe et Cyril avaient tous deux commenté avant la réponse, il y a deux étiquettes.
- Dès qu'une de ces personnes **valide** l'analyse, son étiquette disparaît : elle a réagi.
- Si l'assistant a écrit sans répondre à personne (par exemple pour annoncer l'analyse), pas
  d'étiquette : c'est à tous les admins de relire, comme avant.

## Ce que ça ne fait PAS

- Rien ne change pour les autres états.
- Pas de nouveau filtre, pas de nouvelle notification.
