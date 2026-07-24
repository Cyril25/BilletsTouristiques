# Demande #43 (L) — Cadrage de l'affichage de billets.html

- **Table `demandes`** : #43 (priorité haute, complexité **L**) — liée à #42.
- **Statut** : En cours (analyse)

## Contexte

Suite à #42 : définir précisément ce qui s'affiche sur billets.html (catalogue membre)
après la refonte collectes. Demande de Cyril : chaque billet ne s'affiche qu'**une
seule fois** ; la plupart du temps une seule collecte ; le billet « remonte » quand il
passe en pré-collecte / collecte / terminé ; si une **2e collecte** s'ouvre, la
première doit **rester visible** (pour voir qu'il y a une collecte secondaire, à
laquelle on était peut-être déjà inscrit).

## Investigation (état actuel du code, 2026-07-24)

- **Visibilité** (`app-new.js` applyFilters) : seuls les billets `Categorie='Masqué'`
  sont exclus, plus les billets marqués « pas intéressé » **si** le membre a la
  préférence `masquer_pas_interesse=true`. → l'écart de comptage de #42 est **normal**
  (21 Masqué + 132 pas-intéressé pour le compte de Cyril), pas un bug.
- **Unicité + multi-collecte** (`loadCollectesByBillet`) : chaque billet a une collecte
  **principale** (la « Collecte initiale », sinon une ouverte, sinon la 1re) affichée sur
  la carte, et les **autres collectes ouvertes** listées dans une section
  « collectes supplémentaires ». Le billet reste donc unique. → globalement aligné avec
  la demande.
- **Surfaçage / tri** : la liste est triée par `billets.date_effective` (desc). Cette
  colonne est renseignée pour tous les billets en cycle (Pré collecte/Collecte/Terminé).
  Point à valider : `date_effective` doit refléter l'activité de **n'importe quelle**
  collecte du billet (y compris une collecte secondaire qui vient de s'ouvrir), sinon le
  billet ne « remonte » pas quand seule la 2e collecte bouge.

## Questions de cadrage (en attente de Cyril)

1. Statut du billet à la **création** (lié #41).
2. Modèle d'affichage billets.html (unicité + collecte secondaire visible + surfaçage).
3. Édition des collectes en **modale** vs sous-formulaire inline (lié #41/#38).

## Décisions (Cyril, 2026-07-24)

1. **Statut à la création (#41)** : le sélecteur garde une option **« Hérité des
   collectes »** sélectionnée par défaut (+ les 3 statuts manuels en dessous). En
   pratique : « Hérité » ⇒ création du billet **avec** sa pré-collecte auto (statut
   dérivé) ; un statut manuel choisi ⇒ création **sans** pré-collecte (le statut manuel
   tient). Objectif : ne plus dérouter les admins.
2. **Édition des collectes (#41)** : passage en **modale**. Bouton « Ajouter une
   collecte » + « Modifier » par collecte ⇒ popup. Remplace le sous-formulaire inline
   de #38.
3. **Affichage billets.html (#43)** : modèle validé — billet **unique**, collecte
   principale sur la carte + collectes secondaires ouvertes listées dessous ; le billet
   **remonte** dès qu'**une** de ses collectes change de statut (y compris une
   secondaire) → s'assurer que `date_effective` reflète l'activité de n'importe quelle
   collecte.
4. **Statut par collecte (#40)** : sur la page billet, chaque collecte porte un **badge
   de statut cliquable** qui ouvre la modale d'édition (on y change le statut) ; le
   statut du billet reste **dérivé** (lecture seule) et cohérent partout.

## Réalisation

**Conclusion de l'analyse : l'implémentation actuelle satisfait déjà le modèle validé
— aucun code nouveau nécessaire sur billets.html.**

- **Unicité** : `loadCollectesByBillet` donne une collecte principale par billet ; le
  billet n'apparaît qu'une fois.
- **Principale + secondaires visibles** : la carte montre la principale, les autres
  collectes ouvertes sont listées en « collectes supplémentaires ».
- **Surfaçage** : le trigger `sync_billet_date_effective` (migration #16) recalcule
  `billets.date_effective = MAX(GREATEST(date_fin, date_coll, date_pre))` sur **toutes**
  les collectes du billet → le billet « remonte » dès qu'une collecte, même secondaire,
  reçoit une date récente. ✔
- **Visibilité** : Masqué exclu + pas-intéressé selon la préférence membre (cf. #42 :
  l'écart de comptage était normal, pas un bug).

Il n'y a donc pas de dev à faire ici : le cadrage confirme le comportement. À **vérifier
sur le TestEnv** (dont le « nouveau billet qui n'apparaît pas » de #42, très probablement
un cache — refaire un rechargement forcé).

- **Commit** : — (aucun changement de code ; cadrage documentaire)
