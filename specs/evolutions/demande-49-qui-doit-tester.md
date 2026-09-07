# Demande #49 (prod) — Voir qui doit tester, sans survoler

- **Épic :** Corrections et évolutions
- **Demande :** #49 (prod) — Cyril, 2026-09-07, priorité normale, complexité S.
- **Concerne :** admins
- **Écran :** Gestion Demandes
- **Statut :** À tester
- **Commit :** _(voir Réalisation)_

## Contexte (demande)

> Pour les demandes à tester, on est obligé de passer sur le petit bonhomme pour savoir qui doit
> tester ; si c'est une demande qu'on a faite on ne s'en souvient pas forcément. Il faudrait mettre
> en évidence les demandes qu'on doit tester nous, ou alors réussir à afficher « À tester par
> xxx », sachant que quand on passe la demande « à tester » il ne doit pas y avoir x lignes
> « à tester » mais une seule.

Précision de Cyril au cadrage : la dernière phrase vise **la liste déroulante des états**. Elle
compte sept entrées et doit continuer à en compter sept — pas question de créer « À tester par
JP », « À tester par Cyril » comme autant de statuts.

## Analyse / décisions

- **Le libellé se précise, la liste ne s'allonge pas.** Sur une ligne au statut « À tester »,
  l'option correspondante s'affiche « À tester par Jean-Philippe ». Les sept états restent sept :
  c'est le texte d'une entrée qui se contextualise, ligne par ligne, pas le référentiel qui change.
- **La mise en évidence en plus, pas à la place.** Les deux pistes de la demande répondent à deux
  moments différents : le libellé dit *qui* pour n'importe quelle ligne, la surbrillance répond à
  « est-ce que ça me concerne ? » sans lire. Elles coûtent chacune trois lignes, les faire toutes
  les deux évite d'avoir à choisir pour l'utilisateur.
- **Le prénom, pas l'adresse.** L'équipe compte six personnes ; une adresse e-mail dans un libellé
  d'option serait illisible. On charge `membres` pour la correspondance, avec repli sur la partie
  gauche de l'adresse — les demandes importées du Google Sheet n'ont pas de membre associé.
- **Le chargement des membres ne peut pas casser l'écran** : `.catch` qui rend une liste vide, on
  retombe alors sur le repli.
- **Le tooltip du bonhomme reste** : il donne l'adresse complète, utile quand deux prénoms se
  ressemblent.
- **Rien n'est ajouté sur les autres états.** Afficher « À tester par X » sur une demande encore
  « Nouvelle » aurait été du bruit : l'information ne devient utile qu'au moment où le test est
  attendu.

## Critères d'acceptation

1. La liste déroulante des états compte toujours exactement sept entrées.
2. Sur une demande « À tester », l'état affiché se lit « À tester par &lt;prénom&gt; ».
3. Sur les autres états, le libellé est inchangé.
4. Une demande « À tester » dont je suis le demandeur ressort visuellement dans le tableau.
5. Une demande sans demandeur nominatif affiche un repli lisible, sans casser la ligne.
6. Si la liste des membres ne se charge pas, l'écran fonctionne quand même.

## Réalisation

- **Fichiers :** `admin-demandes.js` (`membresDemandes`, `nomTesteur()`, libellé contextuel dans
  `renderDemandeRow()`, classe `demande-row--a-tester-moi`), `style.css`.
- **Migration :** aucune.
- **Commit :** _(à compléter)_
