# Demande #24 — Plafond de billets sur une collecte

- **Épic :** Corrections et évolutions
- **Demande :** #24 (table `demandes`)
- **Priorité / Complexité :** normale / M
- **Concerne :** membres, collecteurs, admins
- **Écran :** Admin (Gestion Billets → collectes supplémentaires) + Catalogue (membre)
- **Statut :** À tester (repris le 2026-09-06, voir en fin de fichier)
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

## Reprise du 2026-09-06 — le plafond doit valoir aussi pour la collecte affichée

**Retour de Cyril :** « ce n'est pas bon, tu l'as mis dans collectes supplémentaires, cela doit
être mis dans la collecte initiale. »

### Ce qui manquait vraiment

La colonne `collectes.nb_max` n'a jamais été propre aux collectes supplémentaires, et depuis #16
le champ « Nombre max de billets » est présent dans la modale admin de **n'importe quelle**
collecte, initiale comprise. Le trou était côté **catalogue** :

- le total inscrit (`_total` / `_full`) n'était calculé que pour les collectes de l'accordéon —
  la collecte principale, celle que la carte affiche, était purement et simplement oubliée ;
- la carte principale (`buildInscriptionHtml`, `confirmerInscription`) ne connaissait ni la
  pastille de capacité, ni le bouton « Collecte complète », ni le re-contrôle avant insertion.

Autrement dit : un admin pouvait saisir un plafond sur la collecte initiale, il ne se passait rien.

### Décisions

- **Le calcul des totaux couvre maintenant les deux** : collectes principales et collectes de
  l'accordéon sont réunies avant le comptage, en une seule requête comme avant.
- **Un helper unique `capaciteCollecteHtml()`** rend la pastille « N / max billet(s) », utilisé
  par la carte et par l'accordéon : deux rendus identiques ne doivent pas vivre à deux endroits.
- **Même garde à l'inscription** que sur l'accordéon : recomptage juste avant l'insertion
  (deux membres peuvent s'inscrire en même temps près du plafond), et un recomptage impossible
  ne bloque pas une inscription légitime.
- `confirmerInscription()` a été scindée : la garde de plafond d'un côté,
  `inscrireSurCollectePrincipale()` de l'autre — le corps de l'insertion est inchangé.

### Critères d'acceptation (reprise)

1. Un plafond saisi sur la collecte initiale affiche « N / max billet(s) » sur la carte du
   catalogue.
2. Plafond atteint : la carte montre « Collecte complète » et le bouton d'inscription disparaît.
3. Une inscription lancée alors que le plafond vient d'être atteint est refusée avec un message,
   sans créer de ligne.
4. Une collecte sans plafond se comporte exactement comme avant.
5. Le comportement des collectes de l'accordéon est inchangé.

### Réalisation (reprise)

- **Fichiers :** `app-new.js` — `loadCollectesByBillet()` (totaux des collectes principales),
  `capaciteCollecteHtml()`, carte principale, `buildInscriptionHtml()`, `confirmerInscription()`
  + `inscrireSurCollectePrincipale()`.
- **Migration :** aucune (`collectes.nb_max` existe depuis la première version).
- **Commit :** _(à compléter)_
