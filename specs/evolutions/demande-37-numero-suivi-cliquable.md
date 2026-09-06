# Demande #37 (prod) — Numéro de suivi cliquable vers le suivi La Poste

- **Épic :** Corrections et évolutions
- **Demande :** #37 de la table `demandes` **de production** — Sébastien, 2026-07-25, normale / S.
- **Concerne :** collecteurs
- **Écran :** Mes collectes → Historique des envois
- **Statut :** À tester
- **Commit :** `e27c519`

## Contexte (demande)

> Dans « Mes collectes » rubrique « Historique des envois ». En cliquant sur le numéro de suivi
> d'un envoi, est-ce que l'on pourrait être envoyé directement sur le site de suivi de la poste,
> à la place d'aller rechercher sur internet en copier-coller ?

## Analyse / décisions

- **Cible : La Poste**, `https://www.laposte.fr/outils/suivre-vos-envois?code=<numéro>`. La demande
  la nomme explicitement, et c'est cohérent avec les modes d'envoi proposés (Normal, Suivi, R1–R3,
  qui sont la grille La Poste).
- **Pas de détection de transporteur.** `enveloppes.numero_suivi` est du texte libre et aucun
  transporteur n'est stocké : deviner à partir du format du numéro serait fragile pour un gain nul,
  le collecteur voit tout de suite si la page de suivi ne connaît pas son colis.
- **Trois emplacements**, tous ceux qui affichent déjà le numéro : le détail d'un envoi passé,
  les cartes de l'historique global, et l'historique d'une enveloppe. L'export CSV garde le numéro
  brut (c'est une donnée, pas un lien).
- **`stopPropagation` obligatoire** : les cartes de l'historique sont cliquables et ouvrent le
  détail de l'envoi. Sans ça, cliquer le lien ouvrirait aussi la fiche derrière.
- Ouverture dans un nouvel onglet, avec `rel="noopener noreferrer"`.

## Critères d'acceptation

1. Un numéro de suivi renseigné est un lien vers la page de suivi La Poste pré-remplie.
2. Cliquer le lien depuis une carte de l'historique n'ouvre pas le détail de l'envoi.
3. Sans numéro de suivi, rien ne change (pas de lien vide).
4. L'export CSV de l'historique est inchangé.

## Réalisation

- **Fichiers :** `mes-collectes.js` — `lienSuiviLaPoste()`, utilisé dans
  `renderEnveloppePasseeDetail()`, `buildHistoriqueCards()` et l'historique d'enveloppe ;
  `style.css` (`.lien-suivi`).
- **Migration :** aucune.
- **Commit :** `e27c519`
