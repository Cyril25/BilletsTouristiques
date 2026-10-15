# Demande #80 — Supprimer un billet en doublon, et ne plus en créer

- **Épic :** Corrections et évolutions (complexité **M**)
- **Demande :** #80 de la table `demandes` de production — Cyril, 2026-10-15, priorité *normale*.
  Publics cités : membres, collecteurs, admins.
- **Statut :** en développement (lancé par Cyril le 2026-10-15).
- **Version en clair :** [demande-80-suppression-doublon-billet-en-clair.md](demande-80-suppression-doublon-billet-en-clair.md)

## Contexte (demande)

> j'ai un problème, j'arrive pas à supprimer le billet XEADL malgré le fait qu'il n'y ai plus de
> collecte et le fait que je tape le nom du billet, j'ai ce message : suppression impossible : ce
> billet porte des collectes. Supprimez-les d'abord depuis sa fiche. Il s'agit en fait d'un doublon
> et je soupconne le fait qu'il aille vérifier les collectes du billet qu'on veut conserver pour dire
> que des collectes existent ... tu peux vérifier ça stp ? Et dans un second temps, interdire la
> création d'un billet avec même référence millesime et version (avant on l'autorisait, mais c'est
> principalement lié au fait qu'un billet et une collecte était lié, mais désormais on a un billet,
> avec des variantes donc pour les futurs billets pas possible de mettre un doublon avec ces trois
> infos (on garde l'historique, mais on fait un controle sur la création des nouveaux)

## Constat

**Le blocage de XEADL** (lu en base le 15/10/2026) :

| Fiche | Nom | Collectes | Inscriptions | Lignes `collection` |
|---|---|---|---|---|
| 5602 | 450 JAHRE EVANGELISCHE KIRCHE SCHWEBHEIM 1576-2026 | 0 | 0 | **2** (deux membres, `pas_interesse` seul) |
| 5633 | 450 JAHRE EVANGELISCHE KIRCHE SCHWEBHEIM | 1 | 10 | 2 (les mêmes membres) |

La fiche à supprimer est la 5602. Trois clés étrangères pointent vers `billets(id)` sans
suppression en cascade (catalogue de prod du 17/09) :

- `collectes_billet_id_fkey` — `ON DELETE RESTRICT` (#16, DV2-1) ;
- `collection_billet_id_fkey` — sans règle (`NO ACTION`), table « Ma collection » (migration 6-1) ;
- `inscriptions_billet_id_fkey` — sans règle.

C'est `collection` qui refuse. `confirmDelete()` (`admin.js`) affiche le message des collectes dès
que l'erreur contient `collectes`, `foreign key` **ou** `23503` : toute clé étrangère produit donc
« ce billet porte des collectes ». L'hypothèse de la demande (lecture des collectes de l'autre
fiche) est fausse : la requête porte sur `id=eq.5602`.

**Les doublons existants** (même `cle_billet_texte(Reference, Millesime, Version)`, mesuré le 15/10) :

- 5 560 billets, **95 groupes de doublons, 262 fiches**. Aucun ne dépend de la casse ni des espaces :
  les valeurs brutes et normalisées donnent les mêmes groupes ;
- répartis de 2015 à 2026 (8 groupes en 2026), surtout des paires « Terminé »/« Terminé » de l'ancien
  modèle « un billet = une collecte » ;
- 6 groupes ont un champ vide dans leur clé (amorce, millésime ou version vide) ;
- seules **4 fiches** sont dans le cas de XEADL (ni collecte ni inscription, mais des lignes
  `collection`), et **aucune** de leurs lignes ne porte de possession.

Une contrainte d'unicité en base est donc impossible sans toucher à l'historique : la demande la
réserve aux créations.

**Les chemins de création d'un billet** :

1. le formulaire de `admin-billet.html` (`saveBillet`, `POST /billets`), y compris « Dupliquer »
   (`copyBillet` recopie amorce, millésime et version) ;
2. le module d'import de #66 (`decider_ligne_import_billet`) : il refuse **déjà** une ligne
   `absent_base` dont la clé est apparue entre-temps, avec `cle_billet_texte`.

La modification (`updateBillet`, `PATCH`) peut aussi fabriquer un doublon si l'amorce, le millésime
ou la version changent.

## Décisions

1. **Une seule clé, celle de #66.** `cleBillet(b)` dans `admin.js` reproduit `cle_billet_texte()` :
   amorce et version en majuscules, les trois sans espaces aux bords. Deux règles différentes entre
   l'écran et l'import fabriqueraient des doublons que l'un voit et pas l'autre.
2. **Création : refus si la clé existe**, quel que soit l'état de la fiche existante (même
   « Masqué » ou « Terminé ») : un nouveau tirage du même billet est une nouvelle **collecte** sur la
   fiche existante, pas une nouvelle fiche. Le message nomme la fiche existante (« XEADL 2026-1 450
   JAHRE… ») et donne un lien pour l'ouvrir dans un nouvel onglet (le formulaire en cours n'est pas
   perdu).
3. **Modification : même contrôle, seulement si la clé change.** La clé d'origine est mémorisée à
   l'ouverture (`panel.dataset.cleOrigine`). Un doublon historique reste modifiable tant qu'on ne
   touche pas à sa clé ; changer la clé vers une clé déjà prise est refusé (ce serait créer un
   doublon).
4. **Contrôle côté écran, sans migration.** Requête `Reference=ilike.*<amorce>*` (filtre large,
   insensible à la casse) puis comparaison exacte des clés dans le navigateur. Les deux seuls chemins
   de création passent par là (formulaire) ou ont déjà leur contrôle (import). Un garde-fou en base
   (trigger `BEFORE INSERT`) reste possible plus tard ; il demanderait une migration à jouer pour un
   risque, deux admins créant le même billet à la même seconde, qui ne s'est pas vu.
5. **Pendant la vérification, le bouton est désactivé** (« Vérification… ») : un double clic
   lancerait deux vérifications puis deux créations, soit le doublon qu'on veut empêcher. Si la
   vérification échoue (réseau), rien n'est enregistré et l'erreur s'affiche.
6. **Suppression : vérifier avant de supprimer, et dire la vraie raison.** `confirmDelete()` lit
   d'abord, pour le billet visé, ses collectes, ses inscriptions et ses lignes `collection` :
   - des collectes → refus, « ce billet porte N collecte(s) : supprimez-les d'abord depuis sa fiche » ;
   - des inscriptions (cas théorique depuis #16 : une inscription a toujours une collecte) → refus,
     avec leur nombre ;
   - une ligne `collection` qui porte une **possession** (`owned_normal`, `owned_variante`,
     `nb_doubles > 0`, `serial_normal` ou `serial_variante` non vides) → refus, avec le nom des
     membres : supprimer effacerait leur saisie, sans la reporter nulle part ;
   - sinon, les lignes `collection` restantes (« pas intéressé », ou une ligne vide) sont supprimées
     (`collection_admin_delete`, `is_admin()`), puis le billet.
7. **Les marques « pas intéressé » ne sont pas reportées sur la fiche jumelle.** Pour XEADL, les deux
   membres ont la même marque sur 5633. Ailleurs, au pire, un membre reverra le billet conservé non
   marqué et le marquera à nouveau. Reporter suppose de savoir quelle fiche est conservée, ce que la
   suppression ne dit pas.
8. **Le message d'erreur de secours** (si la base refuse quand même : course avec un autre admin)
   reconnaît la contrainte par son nom (`collectes_…`, `collection_…`, `inscriptions_…`) au lieu de
   tout ramener aux collectes.

## Hors périmètre

- **Fusionner deux fiches** (reporter collectes, inscriptions et collections de l'une sur l'autre).
- **Nettoyer les 95 groupes de doublons existants** : ils restent, et l'écran de qualité des billets
  (#69) peut les lister.
- Un garde-fou en base (décision 4).
- Le non-atomique de la suppression : si la base refuse le billet **après** avoir supprimé les
  marques « pas intéressé » (une collecte créée par un autre admin entre les deux), ces marques sont
  perdues et le billet reste. La lecture préalable rend ce cas improbable, et la perte est mineure.

## Critères d'acceptation

1. Supprimer la fiche 5602 (XEADL) fonctionne ; les marques « pas intéressé » des deux membres sur
   5602 disparaissent, celles sur 5633 restent.
2. Supprimer un billet qui a une collecte : « ce billet porte 1 collecte : supprimez-la d'abord depuis
   sa fiche ».
3. Supprimer un billet qu'un membre possède : refus, avec le nom du membre ; rien n'est supprimé.
4. Créer un billet XEADL / 2026 / 1 (ou « xeadl  » / 2026 / « 1 ») : refus, message sous l'amorce avec
   le libellé et un lien vers la fiche existante ; aucun billet créé.
5. « Dupliquer » un billet puis enregistrer sans changer amorce, millésime ni version : même refus ;
   en changeant la version, la copie s'enregistre.
6. Modifier le nom d'un doublon historique (VECA 2026-1, par exemple) : enregistré. Changer sa
   version vers une version déjà prise : refus.
7. Créer un billet dont la clé est libre : inchangé.

## Réalisation

*(à compléter après le développement)*
