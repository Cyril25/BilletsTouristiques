# Demande #82 — Historique des envois : « En cours » et « Terminés »

- **Épic :** Corrections et évolutions (complexité **S**)
- **Demande :** #82 de la table `demandes` de production — Sébastien, 2026-10-15, priorité
  *normale*. Publics cités : membres, collecteurs, admins.
- **Statut :** à tester — en ligne le 2026-10-21 (dev lancé par Cyril le jour même).
- **Version en clair :** [demande-82-historique-envois-en-cours-termines-en-clair.md](demande-82-historique-envois-en-cours-termines-en-clair.md)

## Contexte (demande)

> Dans l'historique des envoi dans "Mon espace" différencier les envois en cours et terminés dans
> 2 sections différentes.

## Constat

- « Historique des envois » est l'onglet du collecteur dans « Mes collectes » (menu Mon espace).
  `loadHistoriqueGlobal()` charge ses enveloppes `expediee`, `distribuee` et `recue`, triées par
  `date_expedition` décroissante ; `buildHistoriqueCards()` en fait **une seule liste**, avec un
  badge de statut (« Pas de retour », « Distribuée … », « Reçue … »).
- Côté membre, « Mes inscriptions » → « Mes envois » sépare déjà les envois (chez le collecteur /
  expédiés et distribués / reçus) : la demande vise l'écran du collecteur.
- La sélection multiple de #19 ne propose déjà une case que sur les envois **pas encore reçus**.

## Décisions

1. **Deux sections dans `#historique-cards`** : « En cours (n) » = `expediee` + `distribuee`, puis
   « Terminés (n) » = `recue`. Chacune garde l'ordre de chargement. Titres en
   `.envois-section-title`, la classe des sections de « Préparation des envois ».
2. **Un envoi « distribué » est en cours** : La Poste l'a livré mais le membre n'a pas confirmé la
   réception — c'est la même frontière que la vue membre et que les cases de #19. Choix soumis à
   Sébastien en commentaire sur la fiche le 21/10, avant le développement.
   **Réponse de Sébastien (21/10, postée pendant le développement, lue après la mise en ligne)** :
   « il faut que ce soit moi qui valide définitivement le courrier reçu, suite au membre qui me
   dira que tout est ok ». Le « distribué » reste donc bien en cours. Mais un membre peut aussi
   passer lui-même son envoi en « reçu » (« Confirmer la réception » dans Mes envois,
   `confirmerReception()` de `mes-inscriptions.js`), ce qui le range dans « Terminés » sans
   validation du collecteur. Réserver la fin au collecteur demande une étape de plus (réception
   déclarée par le membre, puis validée par le collecteur) : **hors #82, à trancher avec Sébastien**.
3. **Une section vide ne s'affiche pas** (y compris quand la recherche la vide). Le message
   « Aucun résultat pour … » est inchangé.
4. **Inchangés** : la recherche (filtre les deux sections), le compteur et le « Total payé » du
   titre (sur l'ensemble), l'export CSV (toutes les lignes), la sélection multiple et le marquage
   groupé — après « marquer reçu », le rechargement range l'envoi dans « Terminés ».

## Hors périmètre

- Replier la section « Terminés » (elle grandit avec le temps) : pas demandé.
- La vue membre « Mes envois », déjà découpée.

## Critères d'acceptation

1. L'onglet affiche « En cours (n) » puis « Terminés (n) » ; un envoi sans retour ou distribué est
   dans le premier, un envoi reçu dans le second, chacun du plus récent au plus ancien.
2. Les cases à cocher n'existent que dans « En cours ».
3. Une recherche qui ne trouve que des envois reçus n'affiche que « Terminés ».
4. Marquer des envois « reçus » en groupe les fait passer dans « Terminés ».
5. Le compteur, le total payé et l'export CSV portent toujours sur tous les envois.

## Vérification

Banc jsdom `scripts/banc-62/test-82-historique-sections.mjs` (non versionné) : vrai
`mes-collectes.js` + `global.js`, imitation de PostgREST en mémoire. Ordre et contenu des sections,
cases à cocher, recherche (4 cas), marquage groupé puis rechargement, historique sans envoi en
cours : **17/17** ; contre-épreuve sur l'ancien code : 10 KO.

## Réalisation

Commit `2c225b4` (2026-10-21), cache `v324` :

- `mes-collectes.js` — `buildHistoriqueCards()` : les cartes vont dans deux sections selon le
  statut, titres `h4.envois-section-title`, section vide masquée.

Vérifié : banc 17/17 (ci-dessus) ; site en ligne contrôlé (le code est servi). Base : à tester +
journal + docs, notification à Sébastien (membre 93), nouveauté `collecteurs`.
**Pas vérifié** : vraie page connectée, téléphone, mode sombre.
