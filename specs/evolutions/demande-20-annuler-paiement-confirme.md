# Demande #20 — Annuler un paiement (déclaration ET paiement confirmé)

- **Épic :** Corrections et évolutions
- **Demande :** #20 (table `demandes`)
- **Priorité / Complexité :** normale / S
- **Concerne :** collecteurs
- **Écran :** Mes collectes → onglet « Vérification paiement »
- **Statut :** À tester
- **Commit :** `f4b5cce`

## Contexte (demande)

> Sur mes paiements, donner la possibilité d'annuler un paiement marqué comme déclaré
> payé alors que non.

## Analyse / décisions

Flux de paiement actuel : le membre **déclare payé** (`statut_paiement = 'declare'`),
puis le collecteur **confirme** (`'confirme'`). Idem pour les frais de port sur les
enveloppes (`statut_paiement_port`).

État du code avant la demande :
- **Refuser une déclaration** (`declare → non_paye`) **existe déjà** : bouton ✗ dans la
  vue « Vérification paiement » (`refuserPaiementVue`, `refuserPaiementPort`).
- **Mais** une fois un paiement **confirmé**, il disparaît de la vue (la requête ne
  charge que `non_paye` + `declare`) et **il n'y a aucun moyen de revenir en arrière**.

Décision de Cyril : **les deux** — garder le refus de déclaration existant ET ajouter
l'annulation d'un paiement déjà **confirmé** (cas : confirmé à tort, ou le membre n'avait
pas réellement payé).

Choix de conception :
- Une section **« Paiements confirmés »** chargée **à la demande** via un bouton
  (pattern identique à `loadHistoriqueEnveloppes`), pour ne pas alourdir la vue
  « à valider ». Accessible aussi quand la liste à valider est **vide** (cas fréquent :
  tout est confirmé puis on repère une erreur).
- Chaque ligne confirmée (billet ou frais de port) a un bouton **« Annuler »** qui
  repasse le statut à **`non_paye`** (cohérent avec le refus de déclaration existant ;
  la demande dit « alors que non [payé] »).
- **Confirmation** (`window.confirm`) avant annulation, car on revient sur un état soldé
  (garde-fou contre les fausses manips). Cohérent avec l'usage de `window.prompt` déjà
  présent (`ouvrirEditionPrixEnvoi`).
- Après annulation : recharger la liste des confirmés + la vue principale (compteurs/total).

## Critères d'acceptation

1. Le refus d'une déclaration (`declare → non_paye`) continue de fonctionner (inchangé).
2. Un bouton « Paiements confirmés » est accessible dans l'onglet Vérification paiement,
   y compris quand il n'y a plus rien à valider.
3. Ce bouton affiche les paiements confirmés (billets + frais de port) des membres du
   collecteur, groupés par membre.
4. Chaque ligne confirmée a un bouton « Annuler » qui, après confirmation, repasse le
   paiement à `non_paye`, affiche un toast, et rafraîchit la vue.
5. Un collecteur ne voit/n'annule que les paiements de SES collectes (pas les siens en
   tant que bénéficiaire).

## Réalisation

- **Fichiers :** `mes-collectes.js` (`buildPaiementsConfirmesAccess` ajouté dans
  `renderVerificationPaiement` et `renderPaiementsVide` ; `loadPaiementsConfirmes`,
  `renderPaiementsConfirmes`, `annulerPaiementConfirme`, `annulerPaiementPortConfirme`),
  `style.css` (`.paiements-confirmes-*`), `sw.js` (cache `billets-v235`).
- **Comportement :** section chargée à la demande (toggle), groupée par membre, filtrée
  sur les collectes du collecteur (exclut ses propres paiements). Annulation avec
  `window.confirm`, PATCH → `non_paye`, puis rechargement de la vue.
- **Non modifié :** le refus de déclaration `declare → non_paye` existant.
- **Commit :** `f4b5cce` — feat(collecteur): annuler un paiement confirme (demande #20).
