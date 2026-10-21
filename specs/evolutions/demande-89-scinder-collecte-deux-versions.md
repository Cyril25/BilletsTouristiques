# Demande #89 — Scinder une collecte « les deux versions » au lieu d'en créer une seconde

- **Épic :** Corrections et évolutions (complexité **L**)
- **Demande :** #89 de la table `demandes` de production — Cyril, 2026-10-21, priorité *normale*.
  Publics cités : membres, collecteurs, admins. Liée à #87, #88 et #83.
- **Statut :** analyse à valider (rédigée le 2026-10-21 par le rituel des demandes).
- **Version en clair :** [demande-89-scinder-collecte-deux-versions-en-clair.md](demande-89-scinder-collecte-deux-versions-en-clair.md)

## Contexte (demande)

> En fait il y a un problème en lien avec 87 et 88, c'est que pour le billet palisse, il y a une
> pré-collecte pour les deux versions, puis une collecte pour la version normale. ce qui n'est pas
> pertinent, en fait il aurait fallu pouvoir splitter la pré-collecte en une collecte normale et une
> collecte dorée, car la ils se sont rendu compte que pour le moment la version doré n'était pas
> encore dispo, mais le jour ou elle sera dispo il faudrait une collecte juste pour la version non
> collectée. En fait l'idée quand on créé une version pour lequel il y a déjà une collecte
> existante, c'est qu'il y ai un message qui permette de dire voulez vous plutot spliter la
> collecte existante que de créer une nouvelle collecte. est-ce que c'est clair ?

## Constat

**Lapalisse (billet 5658, UEQX 2026-8), lu en base le 21/10 :**

| Collecte | Périmètre | Statut | Créée (UTC) | Inscrits | Normaux | Variantes | Paiements ≠ non payé |
|---|---|---|---|---|---|---|---|
| « Collecte 2026 » | les deux | Pré collecte, sans collecteur ni prix | 05:52 | 12 (11 automatiques) | 17 | 11 | 0 |
| « Collecte Normale » | normal | Collecte, Damien, 3,20 € | 05:53 | 7 (manuelles) | 13 | — | 6 |

Un seul membre est inscrit aux deux.

**Pourquoi les 12 pré-inscrits ne sont pas passés dans la collecte de Damien** : à la création
d'une collecte (`saveCollecte()` → `creerAutoInscriptions()`), la règle anti-réinscription N1
(`chargerDejaInscrits()` / `scopesSeRecouvrent()`) écarte tout membre déjà inscrit à une collecte
du billet dont le périmètre recouvre le nouveau — et « les deux » recouvre « normal ». Leurs
normaux restent donc dans une pré-collecte qui ne sera jamais ouverte pour eux : **17 normaux
pré-réservés ne mènent nulle part.**

**Ce que la base impose à une scission** :
- `inscriptions_collecte_membre_id_uk UNIQUE (collecte_id, membre_id)` : une inscription par membre
  et par collecte — répartir une inscription sur deux collectes, c'est donc **deux lignes**, une par
  collecte (ce qui est permis : un membre peut être inscrit à plusieurs collectes d'un billet) ;
- invariant D4 (`check_inscription_scope_invariant`, `check_collecte_scope_vs_inscriptions`) : on
  ne peut passer une collecte en `variante` que lorsqu'aucune de ses inscriptions n'a plus de
  normaux, et réciproquement — **l'ordre des opérations compte** ;
- ce qui accroche une inscription : paiement (`statut_paiement`, trigger
  `enforce_inscription_statut_paiement`), compléments de prix (#44, `dettes.inscription_id`),
  rangement en enveloppe (`enveloppe_id`, `statut_livraison`), `fdp_regles`, `envoye` (D12).

## Proposition

### 1. L'opération « scinder »

Une fonction en base, **`scinder_collecte(p_collecte uuid, p_version_nouvelle text, p_nouvelle
jsonb)`**, exécutée en **une seule transaction** (sinon une coupure au milieu laisserait des
inscriptions à moitié déplacées), réservée aux admins (`is_admin_ou_superadmin()`, jamais
`TO authenticated`). Pour une collecte `les_deux` et une version à détacher (`normal` ou
`variante`) :

1. crée la **nouvelle collecte** avec le périmètre détaché et les champs du formulaire (nom,
   collecteur, prix, dates, statut, plafond) ;
2. pour chaque inscription de la collecte d'origine qui a des quantités dans la version détachée :
   crée l'inscription correspondante dans la nouvelle collecte (même membre, mêmes quantités pour
   cette version, `date_inscription` et `changed_by` conservés), puis remet ces quantités à 0 dans
   l'inscription d'origine — et **supprime** celle-ci si elle n'a plus rien ;
3. passe la collecte d'origine au périmètre restant (`normal` ou `variante`) — D4 l'accepte, plus
   aucune inscription incompatible ;
4. rend un compte rendu (inscriptions déplacées, supprimées, créées).

**La collecte d'origine garde la version qui reste en attente** (à Lapalisse : la dorée, en
pré-collecte), la nouvelle prend celle qu'on ouvre. Les pré-inscriptions gardent ainsi leur
historique là où rien ne bouge.

**Garde-fous** : refus si une inscription de la collecte d'origine a un paiement déclaré ou
confirmé, un complément de prix, un rangement en enveloppe, `fdp_regles` ou `envoye` (Q2) ; refus
si la collecte n'est pas `les_deux` ; refus si elle est terminée.

### 2. Où on le propose

- **À la création d'une collecte** (fiche du billet, « Ajouter une collecte », `saveCollecte()`) :
  si le périmètre choisi est `normal` ou `variante` et qu'une collecte **non terminée** du billet
  est `les_deux`, une fenêtre propose :
  - **« Scinder « Collecte 2026 » »** — ses inscrits gardent leurs variantes dans « Collecte 2026 »
    (qui devient « variantes seulement ») et retrouvent leurs normaux dans la nouvelle collecte ;
    chiffres à l'appui (« 12 inscrits : 17 normaux passeront dans la nouvelle collecte ») ;
  - **« Créer une collecte à part »** — le comportement actuel, avec l'avertissement que les
    pré-inscrits de « Collecte 2026 » ne seront **pas** inscrits à la nouvelle ;
  - « Annuler ».
- **Sur une collecte `les_deux`** de la liste des collectes de la fiche (`renderCollectesList()`),
  un bouton « Scinder » (Q6), qui ouvre le même formulaire pré-rempli.

### 3. Après la scission

- Le statut du billet reste dérivé de ses collectes (rien à faire).
- Le catalogue et la fiche montrent deux collectes ; #88 garantit que les deux restent visibles
  tant qu'elles sont en cours ; #87 donne à chacune son bouton « Partager ».
- « Mes inscriptions » : le membre voit deux inscriptions au billet, une par collecte, comme
  aujourd'hui quand un billet a plusieurs collectes.
- Le recalcul des pré-inscriptions automatiques (`recalculerAutoInscriptions()`) ne vise que la
  collecte principale du billet : limite existante, à garder en tête (hors périmètre).

### 4. Lapalisse : la réparation (ponctuelle, à décider)

La scission arrive trop tard pour Lapalisse : la collecte des normaux existe déjà, avec des
paiements. Deux voies (Q1) :
- **(a) Rattacher** : inscrire les 11 pré-inscrits absents de la collecte de Damien à cette
  collecte, avec leurs normaux (ils lui devront 3,20 € par billet), retirer ces normaux de
  « Collecte 2026 », puis la passer en « variantes ». Le membre inscrit aux deux garde son
  inscription chez Damien. Script ponctuel, essai à blanc, joué par Cyril.
- **(b) Ne rien rattacher** : retirer les normaux de « Collecte 2026 » et la passer en
  « variantes » ; les 11 membres s'inscrivent eux-mêmes chez Damien s'ils le veulent (une
  notification peut les prévenir).

**Fait le 2026-10-21 — voie (a), décision de Cyril** (« tu peux inscrire les 11 pré-inscrits qui
ne le sont pas, et la pré-collecte existante doit être uniquement une pré-collecte pour les
dorés »). Script ponctuel par le Worker, essai à blanc puis exécution : 11 inscriptions créées
chez Damien (16 normaux, `changed_by` et `date_inscription` d'origine conservés, non payées) ; le
membre 100, déjà inscrit chez Damien, garde son inscription ; dans « Collecte 2026 », normaux
remis à 0 pour 10 inscrits, 2 inscriptions supprimées (que des normaux), périmètre passé à
`variante`. Contrôle relu en base : « Collecte 2026 » `variante` / Pré collecte, 10 inscrits,
0 normal, 11 dorés ; « Collecte Normale » 18 inscrits, 29 normaux. Personne n'était bloqué ni sur
la liste noire de Damien ; pas de plafond. Les membres n'ont pas été notifiés.

### 5. Base de données (migration à jouer par Cyril)

- `CREATE FUNCTION scinder_collecte(…)` (`SECURITY DEFINER`, `search_path` fixé, contrôle admin en
  tête), `GRANT EXECUTE` au rôle `anon` (le JWT Firebase arrive en `anon`) ;
- scripts habituels : constat, migration, contrôle (une scission jouée sur une collecte de test
  dans une transaction annulée), retour arrière (suppression de la fonction).

### 6. Découpage

1. La fonction en base + le bouton « Scinder » sur une collecte `les_deux`.
2. La proposition à la création d'une collecte.
3. La réparation de Lapalisse (script ponctuel), dès que Q1 est tranchée — elle peut précéder 1 et 2.

Vérification sur le banc PostgREST + jsdom (`scripts/banc-62/`) : les triggers D4, D12 et
paiement sont ceux de la production.

## Questions ouvertes (reprises dans la version en clair)

- ~~**Q1 — Lapalisse** : rattacher les 11 pré-inscrits à la collecte de Damien (a), ou les laisser
  s'inscrire eux-mêmes (b) ?~~ Tranchée par Cyril le 21/10 : (a), faite le jour même (§ 4).
- **Q2 — Quand peut-on scinder ?** Proposé : seulement si aucune inscription n'a de paiement, de
  complément, d'enveloppe ou d'envoi — en pratique, une pré-collecte. Faut-il aussi pouvoir scinder
  une collecte déjà ouverte, avec ses paiements ?
- **Q3 — Prévenir les membres** dont l'inscription est répartie (notification « ton inscription à
  Lapalisse est maintenant en deux collectes ») ?
- **Q4 — Le plafond** (#24) d'une collecte scindée : recopié sur les deux, ou à ressaisir ?
- **Q5 — Qui** : les admins seulement (proposé : c'est eux qui créent les collectes) ?
- **Q6 — Le bouton « Scinder »** sur une collecte, en plus de la proposition à la création ?

## Liens

- **#87** (partager une collecte) et **#88** (plusieurs collectes ouvertes visibles) : à
  développer **avant** ou avec #89 — une collecte scindée en produit justement deux.
- **#83** (normaux et variantes dans des enveloppes différentes) : avec la scission, une collecte
  `les_deux` déjà ouverte peut être coupée en deux, ce qui rend l'option D de #83 (deux collectes)
  valable aussi pour les collectes existantes. Si #89 est validée, #83 pourrait se réduire à rien.

## Hors périmètre

- Fusionner deux collectes (l'inverse).
- Scinder une collecte `normal` ou `variante` (il n'y a rien à scinder).
- Le recalcul des pré-inscriptions automatiques sur plusieurs collectes d'un même billet.
