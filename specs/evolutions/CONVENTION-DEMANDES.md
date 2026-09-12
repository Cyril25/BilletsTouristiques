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
| `a_analyser` | Prêt à analyser | Estimée **L** au tri : l'analyse est à écrire, le dev n'est pas ouvert |
| `analyse_a_valider` | Analyse à valider | L'analyse est écrite et **attend la relecture d'un admin** |
| `validee` | Prêt à dev | Développable telle quelle (pour une L : analyse relue et validée) |
| `en_cours` | En cours (dev) | **Développement** en cours |
| `a_tester` | À tester | Développée et **en ligne** : le demandeur doit vérifier |
| `terminee` | Terminée | Le demandeur a validé (**lui seul** peut clore, cf. demande #48) |
| `abandonnee` | Abandonnée | Écartée |

> ⚠ **`en_cours` a changé de sens à la demande #59.** Il désignait la phase d'analyse d'une
> demande L ; il désigne désormais le **développement**. L'analyse a ses deux états propres.
> Les demandes qui étaient en `en_cours` au moment de la bascule (#1 et #22, analyse écrite,
> pas encore relue) sont passées en `analyse_a_valider`.

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

Phase d'analyse **obligatoire**, jamais de développement direct. Depuis la demande #59, le
parcours est porté par les états eux-mêmes :

```
Nouvelle → À cadrer → Prêt à analyser → Analyse à valider → Prêt à dev
         → En cours (dev) → À tester → Terminée
```

1. au tri, une demande estimée **L** part en **Prêt à analyser** (`a_analyser`) — ouverte, mais
   pas en dev ;
2. rédiger une **spec détaillée**, en **posant les questions** nécessaires plutôt qu'en comblant
   les trous par des hypothèses silencieuses ; méthode BMAD (`bmad-bmm-*`) si l'ampleur le
   justifie ;
3. **écrire la version en clair** (cf. « Une spec, deux documents »), **attacher les deux
   fichiers** à la demande (champ `docs`, cf. #58) et passer en **Analyse à valider**
   (`analyse_a_valider`). La liste signale alors d'elle-même qu'une relecture est attendue —
   personne n'a besoin d'ouvrir la fiche pour le découvrir ;
4. **un admin relit et valide** depuis la fiche. Une seule validation suffit : la demande bascule
   **automatiquement** en `validee` (Prêt à dev), par un trigger en base.
5. **ne pas commencer le dev avant cette validation.** C'est à l'assistant de dire « l'analyse me
   semble complète » et d'attendre — mais le feu vert est désormais un **geste tracé**, pas une
   phrase à interpréter : on sait qui a relu, et quand.

**Ce qui déclenche ce parcours, c'est le L au moment du tri.** Une ré-estimation ultérieure n'en
éjecte pas la demande dont l'analyse existe déjà.

⚠ **Et ne pas ré-estimer une demande de fond à M par optimisme.** L'état la protège jusqu'à la
validation ; **après**, elle passe en `validee` et c'est la **complexité seule** qui l'empêche
d'être ramassée par un « traite 2 demandes ». Le piège est réel : #1 et #22 avaient été ré-estimées
M à la sortie de leur cadrage — la ré-estimation mesurait ce que le cadrage avait *enlevé*, pas ce
qui restait — et ont été **remises à L le 2026-09-10**.

### Répondre à une remarque : la règle

**Consigne de Cyril, 2026-09-10 — vaut à chaque fois, pas seulement pour les L.** Quand un admin
laisse un commentaire sur une analyse :

1. **le lire et le prendre en compte** — corriger la spec, affiner l'analyse, rouvrir les questions
   que la remarque soulève ;
2. si la remarque invalide une décision, **le dire dans la spec** au lieu de réécrire l'histoire :
   barrer ce qui était faux, dater la correction, expliquer *pourquoi* c'était faux ;
3. **ajouter un commentaire en réponse** disant **ce qui a été fait et comment** — pas « pris en
   compte » tout seul ;
4. si l'analyse doit être reprise, **repasser la demande en Prêt à analyser** : la laisser en
   « Analyse à valider » ferait croire qu'elle n'attend qu'un clic.

Une remarque à laquelle personne ne répond décourage la suivante, et c'est le mécanisme entier qui
s'éteint.

**Et une fois la reprise faite, la demande repart en Analyse à valider — même si une question reste
posée à un relecteur** *(remarque de Cyril, 2026-09-11, sur #22)*. « Prêt à analyser » dit que c'est
à l'analyste de jouer ; une question qui attend la réponse d'un admin dit l'inverse. Laisser la
demande en analyse cacherait aux relecteurs que la balle est dans leur camp : la liste ne leur
signale rien. La question se signale dans la version en clair (« mieux vaut attendre sa réponse
avant de valider »), pas par l'état. Le risque d'une validation prématurée est faible : la
complexité L empêche que la demande parte en dev au fil de l'eau, et le garde-fou avant dev relit
les questions ouvertes.

Et une réponse postée **par l'API** doit créer sa notification (`type='demande_commentaire'`,
`cible='admins'`, comme le fait l'écran) : sans elle, le commentateur n'apprend jamais qu'on lui a
répondu. Les réponses du 10/09 sur #1 et #22 n'avaient prévenu personne.

**Retirer sa validation ne fait pas revenir en arrière** : le compteur baisse, l'état reste. Une
demande qui retomberait toute seule en analyse parce que quelqu'un a décoché serait plus
déroutante qu'utile ; le retour se fait à la main.

## Une spec, deux documents

**Consigne de Cyril, 2026-09-10, née d'un admin qui a dit d'une spec : « c'est pas mon domaine,
c'est du charabia pour moi ».** Les specs sont relues par des admins qui ne sont pas du métier.
Une spec illisible par son relecteur ne produit aucune relecture — exactement comme une spec qu'il
ne voyait pas (le défaut corrigé par #59).

Chaque demande porte donc **deux fichiers** :

| Fichier | Pour qui | Ce qu'il contient |
|---|---|---|
| `demande-<id>-<slug>.md` | le développement | modèle de données, RLS, migration, points durs |
| `demande-<id>-<slug>-en-clair.md` | **les admins relecteurs** | ce que ça change pour les gens, ce qui a été décidé et pourquoi, ce qui est volontairement exclu, ce qui reste ouvert |

L'écran affiche **« En clair » par défaut**, avec une bascule vers « Technique ». La paire se
reconnaît au **suffixe `-en-clair`** du nom de fichier : aucune colonne supplémentaire, les deux
chemins vivent dans le même champ `docs`.

**Ce n'est pas une traduction ligne à ligne, et c'est ce qui rend l'exercice tenable.** Les deux
documents répondent à deux questions différentes : le technique dit *« comment on le construit »*,
celui en clair dit *« est-ce bien ce qu'on veut »*. **Un admin qui valide répond à la seconde.**
D'où, dans la version en clair : pas de schéma de table, pas de RLS, pas de SQL, pas de nom de
fonction — mais un **parcours concret** avec des prénoms et des montants, et une section
« ce sur quoi on vous demande de vous prononcer ».

⚠ **Le risque est la dérive** : deux documents qui finissent par dire des choses différentes, c'est
pire qu'un seul document difficile. Parade : la version en clair **cite en en-tête le commit de la
version technique dont elle découle**. Un écart devient visible au lieu de s'installer.

**L'ordre de travail :** analyser → écrire ou corriger la version technique → **puis** écrire la
version en clair. Jamais l'inverse : une version en clair écrite d'abord fige des décisions qui
n'ont pas encore rencontré le schéma.

**Et les commentaires de réponse suivent la même règle.** Ils sont lus par les mêmes admins :
écrire l'essentiel sans jargon, et reléguer le détail technique en fin de message s'il est
vraiment nécessaire.

## Développer une demande : la spec d'abord

Avant de coder, une courte spec dans ce dossier : `demande-<id>-<slug>.md` **et sa version
`-en-clair.md`** (voir ci-dessus), avec contexte, analyse/décisions, critères d'acceptation, et une
section **Réalisation** complétée après coup (fichiers + hash de commit). Reporter la ligne dans le
tableau de [README.md](README.md).

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

## Le rituel en boucle

**Décision de Cyril, 2026-09-11.** Sur son poste, une conversation Claude Code dédiée fait tourner
`/loop 15m /rituel-demandes`. Il la demande sous le nom de « **système de surveillance des
demandes** » (cf. `CLAUDE.md`) : c'est de cette commande qu'il parle. Chaque passage :

1. contrôle la base (`node scripts/rituel-demandes.mjs etat`) et s'arrête là s'il n'y a rien à faire ;
2. trie les demandes `nouvelle` ;
3. reprend les remarques laissées sur une `analyse_a_valider` après la dernière réponse de l'assistant ;
4. écrit **une** analyse `a_analyser`, la plus prioritaire.

**Ce qui se publie désormais sans supervision** : le tri, les analyses (specs poussées sur `main`,
donc en ligne), les réponses aux remarques (commentaire et notification aux admins). Ce qui rend ça
acceptable : une analyse ne part jamais en développement sans qu'un admin l'ait validée, et la
complexité L l'empêche d'être ramassée au fil de l'eau.

`scripts/rituel-demandes.mjs` est le seul accès du rituel à la base, et il refuse lui-même ce qui
n'en fait pas partie : toute transition autre que `nouvelle` → `validee` / `a_cadrer` / `a_analyser`,
`a_analyser` → `analyse_a_valider` et `analyse_a_valider` → `a_analyser` ; l'entrée d'une L en Prêt
à dev ; l'écrasement du journal ou des documents attachés (il ajoute, il ne remplace jamais). Il crée
aussi les notifications que seul l'écran créait : au demandeur quand sa demande passe À cadrer, aux
admins quand l'assistant répond dans un fil.

**Une analyse bloquée sans Cyril** (SQL à jouer, décision qui n'appartient qu'à lui) porte en tête
de journal une entrée `[date] EN ATTENTE DE CYRIL — …`. Le contrôle la saute jusqu'à ce qu'une entrée
plus récente soit écrite par-dessus, ou qu'un commentaire soit posté sur la fiche après la mise en
attente. Sans ce marqueur, chaque passage la reprendrait pour buter au même endroit.

La boucle vit dans sa conversation : elle s'arrête quand on la ferme, et expire au bout de 7 jours.
La commande `/rituel-demandes` est locale (`.claude/` est ignoré par git) : ce paragraphe et le
script suffisent à la refaire.

## Ce qui n'est jamais automatique

Le tri, l'analyse et la réponse aux remarques se font sans supervision (paragraphe précédent).
**Développer, mettre du code en production et passer en `a_tester`, jamais.**

La demande #53 en est la démonstration : le correctif est parti en production avec un état
`:hover` non traité, et ce sont les tests de Cyril sur un vrai téléphone qui l'ont rattrapé —
pas une vérification automatique, alors même que les contrastes avaient été calculés. Ce projet
n'a pas de tests automatisés et sert six personnes réelles : la mise en ligne reste un geste
humain.
