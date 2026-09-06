# Demande #41 (prod) — Pays obligatoire à la création d'un billet

- **Épic :** Corrections et évolutions
- **Demande :** #41 de la table `demandes` **de production** — Jean-Philippe, 2026-08-04, normale / S.
- **Concerne :** admins
- **Écran :** Gestion Billets → formulaire billet
- **Statut :** À tester
- **Commit :** `e27c519`

## Contexte (demande)

> lors de l'ajout d'un nouveau billet, rendre obligatoire le pays, sinon le billet ne sera pas
> ajouté à la base de données

Le pays alimente le filtre du catalogue, le drapeau et la grille de frais de port : un billet créé
sans pays passe entre les mailles de tous ces écrans.

## Analyse / décisions

- **À la création seulement.** Des billets anciens ont été saisis sans pays ; exiger le champ en
  modification les rendrait inéditables tant qu'ils ne sont pas corrigés un par un — on bloquerait
  des corrections sans rapport. La règle porte donc sur l'ajout, comme le demande la demande.
- **Même mécanique que les autres champs requis** (`validateBilletForm` + `setFieldError`), pour
  que le message et le focus se comportent comme pour Nom, Référence et Version.
- Le champ est déjà un `<select>` alimenté par la table `pays` : il suffit de refuser l'option
  vide. Le libellé passe à « Pays * » et l'attribut `required` est posé.

## Critères d'acceptation

1. Créer un billet sans pays affiche « Le champ Pays est requis », place le focus sur le champ et
   n'écrit rien en base.
2. Créer un billet avec un pays fonctionne comme avant.
3. Modifier un billet existant sans pays reste possible.

## Réalisation

- **Fichiers :** `admin-billet.html` (label `*`, `required`, `<span id="error-pays">`),
  `admin.js` (`validateBilletForm`).
- **Migration :** aucune (pas de contrainte SQL : la règle est de saisie, et l'existant est
  incomplet).
- **Commit :** `e27c519`
