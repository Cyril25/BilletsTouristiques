# Demande #68 — Savoir qui doit agir sur une analyse à valider

- **Complexité :** S — Prêt à dev au tri du 2026-09-14.
- **Demande :** #68, déposée par Cyril le 2026-09-14, priorité normale.
- **Écran :** Gestion des demandes (`admin-demandes.html`, `admin-demandes.js`).
- Version en clair : `demande-68-tour-analyse-a-valider-en-clair.md`.

## Contexte (demande)

> Sur l'écran « Gestion des demandes d'amélioration », quand il y a le statut « Analyse à valider »,
> on ne sait jamais si c'est l'IA qui a fait le dernier commentaire ou si c'est un admin. Autrement
> dit, on ne sait pas qui doit faire la prochaine action, et on est obligé d'ouvrir la demande pour
> savoir si l'IA a pris en compte notre dernier commentaire et nous a reposé une ou des questions.

## Constat

- `loadDemandes()` charge les demandes, les membres et les validations — **pas les commentaires**
  (`demande_commentaires`, #58). La liste ne peut donc rien dire du fil.
- Sur une « Analyse à valider », la ligne porte le badge de validation (œil et compteur, #59) et se
  **surligne « à relire »** dès que je n'ai pas validé. **Elle se surligne aussi quand une remarque
  attend la réponse de l'assistant** : le surlignage dit « à vous » alors que ce n'est pas le cas.
- L'assistant poste sous l'adresse `claude-code@assistant.local` (`scripts/rituel-demandes.mjs`).

## La règle

**La même que celle du rituel des demandes** (`etat()` dans `scripts/rituel-demandes.mjs`), pour que
l'écran et l'assistant ne se contredisent jamais : sur une demande en « Analyse à valider »,

- **le dernier commentaire du fil n'est pas de l'assistant** → une remarque attend sa réponse :
  **c'est à l'assistant** ;
- **le dernier commentaire est de l'assistant, ou il n'y a aucun commentaire** → **c'est aux
  admins** de relire.

## Ce qui change

1. `loadDemandes()` charge en plus `demande_commentaires?select=demande_id,auteur_email,created_at`,
   trié par date — avec le même repli que les validations : un échec n'empêche pas la liste de
   s'afficher.
2. Pour chaque demande, on retient **le dernier commentaire** (auteur, date).
3. Sur une « Analyse à valider » dont le dernier commentaire n'est pas de l'assistant :
   - un badge **« Assistant »** (icône sablier, couleurs « info ») apparaît à côté du badge de
     validation, avec en infobulle « Remarque de Prénom le 14/09/2026 — réponse de l'assistant
     attendue » ;
   - la ligne **ne se surligne pas** « à relire », puisque ce n'est pas le tour des admins.
4. Sinon, rien ne change à l'affichage, sauf l'infobulle du badge de validation, qui précise « dernier
   commentaire : l'assistant, le 14/09/2026 » quand il y en a un.

Aucune modification de la base : la lecture de `demande_commentaires` est déjà ouverte aux admins
(policy `demande_commentaires_select`, #58), et l'écran est réservé aux admins.

## Critères d'acceptation

1. Une « Analyse à valider » dont le dernier commentaire est d'un admin affiche le badge
   « Assistant », et n'est pas surlignée « à relire ».
2. Dès que l'assistant a répondu, le badge disparaît et la ligne se surligne à nouveau pour les
   admins qui n'ont pas validé.
3. Une « Analyse à valider » sans aucun commentaire se comporte comme avant.
4. Les autres états ne changent pas.
5. Si le chargement des commentaires échoue, la liste s'affiche quand même, comme avant.
6. Lisible en mode sombre et sur téléphone.

## Ce que cette spec ne fait pas

- **Pas d'indication pour les autres états** (« À cadrer », « Prêt à analyser »…) : la demande porte
  sur « Analyse à valider ».
- **Pas de filtre** « en attente de l'assistant ».
- **Pas de notification** : celles qui existent (#58, #51) ne changent pas.

## Réalisation

Développée le 2026-09-14 — commit `7166263`.

| Fichier | Ce qui change |
|---|---|
| `admin-demandes.js` | Chargement de `demande_commentaires` (même repli que les validations) ; `dernierCommentaireParDemande` ; `estAssistant()` ; dans `renderDemandeRow()`, le badge « Assistant » et le surlignage « à relire » retiré quand une remarque attend l'assistant ; infobulle du badge de validation complétée |
| `style.css` | `.demande-badge-attente-assistant`, sur les jetons `--color-badge-info-bg` / `--color-badge-info-text`, définis en clair et en sombre |
| `sw.js` | `CACHE_NAME` : `billets-v305` → `billets-v306` |

Écart avec la spec, sans conséquence : les dates s'affichent au format déjà utilisé par l'écran
(« 14 sept. 2026 », `formatDateFr()`), et non « 14/09/2026 » comme dans les exemples ci-dessus.

**Vérifié** : sous Node, `renderDemandeRow()` sur cinq cas simulés — remarque d'un admin (badge, pas
de surlignage), réponse de l'assistant et aucun commentaire (surlignage, pas de badge), autre état
(rien), adresse de l'assistant en majuscules (reconnue). **Pas encore vérifié** : le rendu dans le
navigateur, en mode sombre et sur téléphone (critère 6).
