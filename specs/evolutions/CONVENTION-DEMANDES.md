# Convention — traiter les demandes d'amélioration

Ce document est la **référence unique** du cycle de vie d'une demande (table `demandes`,
écran `admin-demandes.html`). Il vaut pour toute session de travail, sur le poste de Cyril
comme dans une routine hébergée : personne ne doit avoir à deviner ce que « traiter une
demande » veut dire.

> Il vivait auparavant dans la mémoire locale de l'assistant. Une session qui n'avait pas
> cette mémoire ne savait plus traiter une demande correctement — d'où ce fichier, versionné
> avec le code qu'il décrit.

## Les états

| `etat` | Libellé écran | Sens |
|---|---|---|
| `nouvelle` | Nouvelle | Déposée, pas encore lue |
| `a_cadrer` | À cadrer | Comprise à moitié : il manque une précision du demandeur |
| `validee` | Prêt à dev | Assez claire pour être développée telle quelle |
| `en_cours` | En cours | Chantier ouvert (phase d'analyse d'une demande L) |
| `a_tester` | À tester | Développée et **en ligne** : le demandeur doit vérifier |
| `terminee` | Terminée | Le demandeur a validé (**lui seul** peut clore, cf. demande #48) |
| `abandonnee` | Abandonnée | Écartée |

## Le vocabulaire de Cyril

**« Traite les nouvelles demandes »** — lire toutes les demandes en `nouvelle` et, pour chacune :

- assez compréhensible pour être développée **sans reposer de question** → **Prêt à dev**
  (`validee`), en réestimant la complexité (`S`/`M`/`L`) si l'estimation existante paraît fausse ;
- pas assez claire → écrire dans `commentaire` **ce qui doit être précisé** (en conservant
  l'existant) et passer en **À cadrer** (`a_cadrer`).

Une demande peut mélanger les deux : un bug précis **et** un souhait vague. Ne pas trancher seul
le volet vague. Si Cyril est joignable, lui poser la question tout de suite — un commentaire
« à cadrer » qu'il lira dans trois jours coûte plus cher qu'une question directe.

**« Traite 1 / 2 / 3 demandes »** (sans numéro) — prendre les **Prêt à dev** par ordre de priorité
(`haute` > `normale` > `basse`), **en excluant les complexités `L`**. Ce sont de gros chantiers,
on ne les attrape jamais au fil d'une série de petites demandes.

**« Traite la demande #x »** (numéro explicite) — on la traite quelle que soit sa complexité :
Cyril assume le choix. Il peut aussi en exclure une nommément.

**Garde-fou avant tout développement** — re-vérifier qu'un « Prêt à dev » est vraiment clair. Si
quelqu'un l'a validée un peu vite, la **repasser en À cadrer** avec un commentaire, plutôt que de
coder sur du flou.

## Les demandes de complexité L

Phase d'analyse **obligatoire**, jamais de développement direct :

1. passer la demande en **En cours** (`en_cours`) — ouverte, mais pas en dev ;
2. rédiger une **spec détaillée**, en **posant les questions** nécessaires plutôt qu'en comblant
   les trous par des hypothèses silencieuses ;
3. méthode BMAD (`bmad-bmm-*`) si l'ampleur le justifie ;
4. **ne pas commencer le dev** avant que l'analyse soit jugée complète **d'un commun accord**.
   C'est à l'assistant de dire « l'analyse me semble complète » et d'attendre le feu vert.

## Développer une demande : la spec d'abord

Avant de coder, une courte spec dans ce dossier : `demande-<id>-<slug>.md`, avec contexte,
analyse/décisions, critères d'acceptation, et une section **Réalisation** complétée après coup
(fichiers + hash de commit). Reporter la ligne dans le tableau de [README.md](README.md).

Le hash de commit et la spec se mordent la queue : écrire le hash puis `--amend` change le hash.
Faire un petit commit `docs(#id)` juste après, comme les specs précédentes.

## Après le développement

Dans cet ordre :

1. **Pousser** — une demande « à tester » que personne ne peut voir n'a aucun sens.
2. **Bumper `CACHE_NAME` dans `sw.js`.** Et si `menu.html` a été touché, bumper **aussi** le
   `?v=` du fetch de `menu.html` dans `global.js` : sans ça les membres gardent l'ancien menu.
3. **Passer la demande en `a_tester`** et compléter son `commentaire` (ce qui a été fait, et
   surtout **ce qu'il faut vérifier**).
4. **Prévenir le demandeur.** ⚠ La fonction `notifierDemandeurSiSuivi()` de `admin-demandes.js`
   n'émet la notification privée que si l'état est changé **depuis l'écran**. En passant par
   l'API, aucun déclencheur ne le fait : il faut créer la ligne `notifications` à la main
   (`type='demande_suivi'`, `cible_email` = adresse du demandeur).
5. **Annoncer la nouveauté** — une ligne dans `notifications` (`type='nouveaute'`), avec `titre`
   court pour la cloche et `texte` détaillé pour la page Nouveautés. Choisir la `cible` :
   - `'tous'` → nouveauté membre ;
   - `'collecteurs'` → collecteurs **et** admins/superadmins ;
   - `'admins'` → admins **et** superadmins.

   ⚠ Côté SQL, utiliser `is_admin_ou_superadmin()` : la fonction historique `is_admin()` teste
   `role='admin'` et **exclut le superadmin**.

## Accès à la base

Toujours via le Worker `supabase-admin-proxy` (syntaxe PostgREST habituelle, en-tête
`X-Proxy-Key`) — l'accès direct à `supabase.co` est bloqué sous VPN du Canton de Neuchâtel.
Deux clés existent, de portées très différentes : la clé d'administration, qui ne vit que sur le
poste de Cyril, et une clé de tri étroite (voir
[workers/supabase-admin-proxy/worker.js](../../workers/supabase-admin-proxy/worker.js)).
**Aucune clé ne figure dans ce dépôt, qui est public.**

Avec `curl` sous VPN, ajouter `--ssl-no-revoke` : sans ça la requête meurt en `HTTP 000`
(`CRYPT_E_NO_REVOCATION_CHECK`) sans jamais mentionner le VPN. Avec Node/wrangler, exporter
`NODE_EXTRA_CA_CERTS` vers le bundle de CA du Canton.

## Ce qui n'est jamais automatique

Le tri peut se faire sans supervision : il est réversible d'un clic dans l'écran Gestion
Demandes. **Développer, pousser en production et passer en `a_tester` ne le sont pas.**

La demande #53 en est la démonstration : le correctif est parti en production avec un état
`:hover` non traité, et ce sont les tests de Cyril sur un vrai téléphone qui l'ont rattrapé —
pas une vérification automatique, alors même que les contrastes avaient été calculés. Ce projet
n'a pas de tests automatisés et sert six personnes réelles : la mise en ligne reste un geste
humain.
