# Demande #24 — Plafond de billets sur une collecte supplémentaire

- **Épic :** Corrections et évolutions
- **Demande :** #24 (table `demandes`)
- **Priorité / Complexité :** normale / M
- **Concerne :** membres, collecteurs, admins
- **Écran :** Admin (Gestion Billets → collectes supplémentaires) + Catalogue (membre)
- **Statut :** À tester
- **Commit :** `87156d1`

## Contexte (demande)

> Pour l'ajout d'une collecte pour un billet déjà collecté, donner la possibilité de
> mettre un nombre de billets max, qui clôture l'inscription une fois ce nombre dépassé.

## Analyse / décisions

- **Migration** : `collectes.nb_max INTEGER` (nullable). NULL = pas de plafond
  (comportement historique inchangé). `scripts/migration-demande-24-collecte-nb-max.sql`,
  exécutée dans Supabase avant déploiement. RLS inchangée.
- **Ce qui compte pour le plafond** : total de billets physiques = somme
  `nb_normaux + nb_variantes` de toutes les inscriptions non désinscrites de la collecte.
- **Règle de clôture** : la collecte est ouverte si `nb_max` est NULL **ou** total actuel
  `< nb_max`. Dès que le total **atteint** `nb_max`, elle est « complète » (l'inscription
  qui atteint le plafond est la dernière acceptée — interprétation de « clôture une fois
  le nombre dépassé »).
- **Enforcement** : côté client (affichage « Collecte complète » + bouton désactivé) et
  **re-contrôle du total juste avant l'insertion** (anti-course). Un verrou strictement
  atomique nécessiterait un trigger Postgres — non fait (volume faible ; à ajouter si un
  jour deux inscriptions simultanées près du plafond posent problème).
- **Affichage** : « N / max billet(s) » côté membre (catalogue) et côté admin (liste des
  collectes, si le compteur d'inscriptions est chargé).

## Critères d'acceptation

1. À la création d'une collecte supplémentaire, un champ « Nombre max de billets »
   (optionnel) est disponible ; vide = pas de plafond.
2. Le membre voit la capacité « N / max » sur la collecte concernée dans le catalogue.
3. Quand le total atteint le plafond, l'inscription est fermée (« Collecte complète »).
4. Une tentative d'inscription sur une collecte pleine est bloquée (re-contrôle serveur).
5. Une collecte sans `nb_max` se comporte comme avant (aucune limite).

## Réalisation

- **Migration :** `scripts/migration-demande-24-collecte-nb-max.sql` (`collectes.nb_max`).
- **Fichiers :** `admin.html` (champ `field-collecte-nb-max`), `admin.js`
  (`saveCollecte` insert + reset, `renderCollectesList` badge capacité), `app-new.js`
  (`loadCollectesByBillet` : select `nb_max` + calcul des totaux + flags `_total`/`_full` ;
  `fetchCollecteTotalBillets` ; capacité dans `buildCollectesSupplementairesHtml` ;
  « Collecte complète » dans `buildInscriptionHtmlForCollecte` ; re-contrôle dans
  `confirmerInscriptionCollecte`), `style.css` (badges capacité), `sw.js` (cache `billets-v237`).
- **Commit :** `87156d1` — feat(collecte): plafond de billets sur une collecte supplementaire.
