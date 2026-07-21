# Demande #2 — Drapeau + filtre/compteur par pays (Gestion Membres)

- **Épic :** Corrections et évolutions
- **Demande :** #2 (table `demandes`)
- **Priorité / Complexité :** basse / M
- **Concerne :** admins
- **Écran :** Gestion Membres
- **Statut :** À tester
- **Commit :** `7592acc`

## Contexte (demande)

> Afficher un drapeau du pays de résidence du membre et permettre un filtre/compteur par
> pays (belges, allemands, polonais…).
> Commentaire : `membres.pays` est en texte libre : normaliser (liste déroulante) +
> nettoyer les données existantes (ok).

## Analyse / décisions

- **Pas de nouvelle migration.** Le profil utilise déjà une **liste déroulante** alimentée
  par la table `pays` (76 pays) — les nouvelles valeurs sont donc déjà normalisées.
- **Drapeau** : mapping nom de pays → emoji drapeau (`PAYS_FLAGS`), avec clé **normalisée**
  (minuscules + accents retirés) pour tolérer les variations de casse/accents des anciennes
  saisies libres. Un membre sans `pays` est considéré **France** (cohérent avec l'affichage
  d'adresse existant).
- **Filtre + compteur** : un `<select>` listant les pays présents parmi les membres, chacun
  avec son drapeau et son **compteur** (`Pays (N)`) ; le compteur global de la liste reflète
  déjà le filtrage.
- **Nettoyage des données existantes** : hors périmètre de ce dev (tâche data séparée). Les
  valeurs non reconnues n'affichent simplement pas de drapeau — sans régression.

## Critères d'acceptation

1. Chaque carte membre affiche le drapeau de son pays de résidence (France par défaut).
2. Un sélecteur « Pays » permet de filtrer les membres par pays, avec le nombre par pays.
3. Le compteur de membres reflète le filtre actif.
4. Une valeur de pays non reconnue n'affiche pas de drapeau mais ne casse rien.

## Réalisation

- **Fichiers :** `users.js` (`PAYS_FLAGS`, `flagPays`, `paysAffiche`, filtre
  `activeCountryFilter`, `populateCountryFilter`, `filterUsersByCountry`, drapeau dans la
  carte), `users.html` (sélecteur pays), `style.css` (`.user-card-flag`,
  `.user-country-filter-wrapper`), `sw.js` (cache `billets-v238`).
- **Commit :** `7592acc` — feat: demandes #2, #3, #4.
