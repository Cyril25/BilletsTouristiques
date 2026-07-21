# Demande #27 — Date de fin optionnelle sur le mode vacances

- **Épic :** Corrections et évolutions
- **Demande :** #27 (table `demandes`)
- **Priorité / Complexité :** normale / M
- **Concerne :** membres, collecteurs, admins
- **Écran :** Profil (membre) + Mes collectes (badge collecteur)
- **Statut :** À tester
- **Commit :** `5613657`

## Contexte (demande)

> Pour le mode vacances, donner la possibilité de mettre une date de fin : le mode vacances
> est enlevé après cette date. Sans date, c'est à l'utilisateur de le désactiver.

Évolution de la demande #23 (mode vacances = booléen `membres.en_vacances`).

## Analyse / décisions

- **Migration** : colonne `membres.vacances_jusqu_au DATE` (nullable). NULL = pas de date
  de fin (comportement #23 : désactivation manuelle).
- **Site statique, pas de tâche planifiée** → la désactivation « après la date » se fait de
  deux façons complémentaires :
  1. **Calcul côté client (source de vérité pour l'affichage)** : helper
     `estEnVacancesEffectif(en_vacances, jusqu_au)` = `en_vacances && (!jusqu_au ||
     jusqu_au >= aujourd'hui)`. Appliqué partout où le statut vacances est affiché
     (badges collecteur). Ainsi, dès le lendemain de la date, le badge disparaît sans
     intervention.
  2. **Auto-nettoyage opportuniste** : quand le membre rouvre **son profil** après la date,
     on remet `en_vacances = false` et `vacances_jus_qu_au = null` en base (l'état stocké
     redevient honnête, la case est décochée).
- **Date de fin incluse** : le membre reste « en vacances » le jour J, inactif à J+1.
- **Profil** : un champ date « Jusqu'au (optionnel) » apparaît quand la case est cochée.
- **Badge collecteur** enrichi : « En vacances » + « jusqu'au JJ/MM » si une date est définie.

## Critères d'acceptation

1. Le membre peut cocher « Mode vacances » et, optionnellement, saisir une date de fin.
2. Sans date : comportement inchangé (actif jusqu'à décochage manuel).
3. Avec une date passée : le membre n'est plus considéré en vacances (badge collecteur
   absent), et sa case est nettoyée à sa prochaine visite du profil.
4. Le badge collecteur affiche la date de fin quand elle est renseignée.

## Réalisation

- **Migration :** `scripts/migration-demande-27-vacances-date-fin.sql` (`membres.vacances_jusqu_au`).
- **Fichiers :** `global.js` (`estEnVacancesEffectif`), `profil.html` (champ date + toggle),
  `profil.js` (select + prefill + auto-nettoyage si date passée + save + `toggleVacancesDate`),
  `mes-collectes.js` (select `vacances_jusqu_au` + statut effectif dans les 2 enrichissements,
  `badgeVacances(jusquAu)` affiche la date), `style.css` (`.profil-vacances-date`),
  `sw.js` (cache `billets-v242`).
- **Commit :** `5613657` — feat(vacances): date de fin optionnelle sur le mode vacances.
