# Demande #46 (prod) — La cloche donne envie de lire, la page Nouveautés fait lire

- **Épic :** Corrections et évolutions
- **Demande :** #46 (prod) — Cyril, 2026-09-06, priorité normale, complexité S.
- **Concerne :** membres, collecteurs, admins
- **Écran :** cloche du menu + page Nouveautés
- **Statut :** À tester
- **Commit :** _(voir Réalisation)_

## Contexte (demande)

> Quand on clique sur une notif, ça doit nous amener sur la page des notifs où l'on réussira à
> lire de manière plus facile l'ensemble du texte. D'ailleurs je me demande si on ne devrait pas
> tronquer un peu le texte de la notif (quand on clique sur la cloche) car ce n'est pas très
> lisible et le but c'est d'intéresser la personne qui cliquera pour aller lire la suite.

## Analyse / décisions

- **Le constat est exact, vérifié dans le code** : la cloche affichait `subtitle = n.texte`, soit
  le texte **entier** de la notification. Certaines font dix lignes.
- **Une accroche de 110 caractères**, coupée proprement et suivie de « … ». Assez pour donner
  envie, trop court pour prétendre suffire.
- **Le clic mène à `notifications.html#notif-<id>`** — la page Nouveautés, ancrée sur la bonne
  carte, texte complet sous les yeux. Avant, il menait au lien métier (`n.lien`) quand il y en
  avait un : on atterrissait sur l'écran concerné sans avoir pu lire ce qu'on venait d'annoncer.
- **Le champ `lien` n'est pas perdu**, et c'est ce qui rend la décision tenable : la carte de la
  page Nouveautés porte **déjà** un bouton « Y aller » vers ce lien. On lit d'abord, on agit
  ensuite — l'enchaînement décrit dans la demande.
- **Rien à changer sur la page Nouveautés** hormis l'ancre : elle affichait déjà le texte complet.

## Critères d'acceptation

1. La cloche affiche une accroche tronquée, jamais le texte entier.
2. Cliquer une nouveauté ouvre la page Nouveautés positionnée sur cette notification.
3. Le clic marque toujours la notification comme lue.
4. La carte permet toujours d'aller à l'écran concerné quand un lien est renseigné.
5. Les autres entrées de la cloche (signalements, demandes d'inscription) gardent leur destination.

## Réalisation

- **Fichiers :** `global.js` (`accrocheNotif()`, destination du clic), `notifications.js` (ancre
  `id="notif-<id>"` sur la carte).
- **Migration :** aucune.
- **Commit :** _(à compléter)_
