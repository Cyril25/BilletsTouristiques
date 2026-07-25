# Demande #44 (L) — Dissocier visuellement le billet et sa/ses collecte(s)

- **Table `demandes`** : #44 (priorité haute, complexité **L**).
- **Écrans** : `billets.html` (catalogue) + `billet.html` (fiche) + `admin.html` (carte).
- **Statut** : Prêt à dev (analyse faite en party-mode BMAD, 2026-07-24).

## Contexte

Depuis la refonte #16, **billet** et **collecte** sont deux entités distinctes, mais
l'UI les mélange : on affiche un statut « du billet » (`Categorie`, dérivé) au même
niveau que le statut de la collecte, qui porte déjà la même info. Symptômes relevés par
Cyril : sur la fiche `billet.html`, un tag « collecte en cours » à gauche **et** un
statut de collecte en haut à droite ; sur la carte admin, un tag billet + des pastilles
par collecte ; dans le catalogue, une soupe de badges. Le même concept apparaît deux
fois sous deux identités.

## Cause racine (analyse)

Deux **noms** différents partagent la même zone visuelle :

- **Billet** = objet de catalogue, une **identité** permanente (nom, référence, image,
  thème). Son seul état propre = **disponibilité** : `Projet` / `Masqué` / `Pas de
  collecte`.
- **Collecte** = **campagne** datée sur un billet, avec un **cycle de vie**
  (`Pré collecte` → `Collecte` → `Terminé`), un collecteur, un prix, des dates.

Le `Categorie` posé sur le billet n'est que le **reflet remonté** du statut de sa
collecte → double affichage.

## Décisions (Cyril, party-mode 2026-07-24)

1. **Statut de campagne assumé à 100 % sur la/les collecte(s).** Le billet ne porte plus
   de statut de campagne. (Un mini-résumé d'état au niveau billet pourra être ajouté
   plus tard si le besoin se confirme — pas maintenant.)
2. **Deux plans visuels** avec une **séparation nette** sur `billets.html` :
   - **Zone billet** (identité) : image, nom, réf, thème. Calme, aucune pastille de
     statut colorée. Au plus un marqueur discret `Projet` / `Masqué` quand ça
     s'applique (surtout vu par l'admin).
   - **Zone collecte(s)** (campagnes) : chaque collecte est un **bloc** portant statut
     (couleur), collecteur, prix, dates, CTA.
3. **Accordéon** (vignettes déjà hautes) : la **collecte la plus récente** est ouverte ;
   les autres sont **repliées**, dépliables au clic.
   - « La plus récente » = ordre par **date de début de campagne** (`date_pre`, sinon
     `created_at`) décroissante. ⚠ Change la logique actuelle
     (`loadCollectesByBillet` prend « Collecte initiale » comme principale → passer à
     « la plus récente »). Le critère doit être **unique et partagé** par toutes les
     surfaces (une fonction `collectesTrieesRecentDabord(billetId)`).
4. **Anti-double-inscription** : si le membre est déjà inscrit (ou bénéficiaire) sur une
   collecte du billet, l'afficher **clairement** pour éviter une réinscription par
   erreur, à **deux endroits** :
   - sur la **ligne repliée** de la collecte concernée : marqueur « ✓ vous y êtes
     inscrit (N billets) » ;
   - sur la **collecte visible** (si l'inscription est sur une AUTRE collecte du billet) :
     bandeau « ⚠ Vous êtes déjà inscrit à « … » » + CTA principal dégradé.
   - **Règle produit** : on **avertit, on ne bloque pas** (une 2ᵉ collecte est souvent un
     rattrapage légitime). L'inscription à une 2ᵉ collecte devient un choix **délibéré et
     informé** (« S'inscrire quand même », secondaire/discret), jamais un accident.
5. **Composant unique `collecte-block`** (état replié/déplié) réutilisé sur le catalogue,
   la fiche billet et la carte admin. Il reçoit : la collecte, l'état du membre pour
   CETTE collecte (inscrit / bénéficiaire / non inscrit), et un flag « inscrit ailleurs
   sur ce billet ». Objectif : une brique, une vérité, une matrice de tests — au lieu des
   implémentations parallèles actuelles (`admin-card-collecte-ligne`, `badge-nom-collecte`,
   `collecte-status-tag`, pastilles admin…).

## Maquette (membre, billets.html)

```
┌─────────────────────────────────────────────┐
│  ┌───────┐  FALAISE D'ÉTRETAT               │  ZONE BILLET (identité, calme)
│  │ image │  Étretat · UEJW · 2025           │
│  └───────┘  🏷 Villes, Monuments             │
├─────────────────────────────────────────────┤  ← séparateur net
│  COLLECTES                                    │
│  ┌───────────────────────────────────────┐   │
│  │ ● Collecte · par Antoine              │   │  la + récente, ouverte
│  │   2,15 € · clôture 24/01               │   │
│  │   ⚠ Vous êtes déjà inscrit à la        │   │  (si inscrit ailleurs)
│  │     « Collecte initiale » (2 billets)  │   │
│  │   [ S'inscrire quand même ]  ← discret │   │
│  └───────────────────────────────────────┘   │
│  ▾ Collecte initiale · Terminé · déc. 2024   │  + ancienne(s), accordéon
│    ✓ Vous y êtes inscrit — 2 billets          │
└─────────────────────────────────────────────┘
```

## Critères d'acceptation

- Sur `billets.html` : séparation visuelle claire billet / collecte(s) ; billet sans
  pastille de statut de campagne.
- Multi-collecte : la plus récente ouverte, les autres en accordéon dépliable.
- Un membre inscrit à une collecte du billet le voit clairement, y compris si cette
  collecte est repliée ; il est averti avant de s'inscrire à une autre collecte du même
  billet (sans blocage dur).
- Même composant `collecte-block` utilisé sur catalogue / fiche / carte admin ; un seul
  critère « plus récente » partagé.
- Personas : membre (s'inscrire, voir son état), collecteur (bénéficiaire sur sa
  collecte), admin (édition) — aucun ne voit d'info de statut dupliquée.

## Portée / risques

- **L** : touche 3 surfaces + la logique d'ordre des collectes (`loadCollectesByBillet`
  et équivalents) + le calcul « inscrit ailleurs ». À faire en plusieurs étapes ; ne pas
  perturber les membres (le job « puis-je m'inscrire et à quel prix » doit rester
  évident).
- Reprend/absorbe l'ajustement de la carte admin (#40) : la carte deviendra un cas
  particulier du composant `collecte-block`.

## Réalisation

En plusieurs incréments, surface par surface (chacun testable sur le TestEnv).

**Incrément 1 — catalogue billets.html : ordre + accordéon + anti-double-inscription**
(`be1a9b0`) — sans toucher au prix/paiement :
- Critère unique partagé « plus récente d'abord » (`collectesTrieesRecentDabord`,
  `compareCollecteRecentDabord`, sur `date_pre` sinon `created_at`). La collecte
  **affichée** = la plus récente (avant : « Collecte initiale »).
- **Accordéon** (`<details>` natif) : collectes plus anciennes repliées, dépliables ;
  tête = statut + marqueur « vous y êtes inscrit ».
- **Anti-double-inscription** : bandeau + CTA « S'inscrire quand même » si inscrit sur
  une autre collecte du billet (`collectesInscritesDuBillet`). On avertit, pas de blocage.
- Badge « Collecte en cours » retiré. CSS : accordéon, marqueurs, avertissement.

**Incrément 2 — catalogue : statut porté par la collecte, plus par le billet**
(`0a44038`) :
- Le badge de statut en haut de carte n'apparaît plus **qu'en l'absence de collecte**
  (état propre du billet : Projet / Masqué / Pas de collecte). En campagne, il disparaît.
- Le statut de campagne est porté par une **pastille** dans un **en-tête « Collecte »**
  (séparateur + pastille) placé au-dessus du prix/dates.
- La couleur de la carte (liseré, bandeau ville, pastille) suit la **collecte affichée**
  (la plus récente) au lieu du rollup `Categorie` du billet.
- Ajout accordéon (incr. 1) : dates de la collecte affichées au dépliage.

> Note : le prix et les dates restent physiquement à leur place (dans `content` / un
> `.more`) sous l'en-tête « Collecte » ; une séparation DOM plus stricte (déplacer le
> commentaire hors de la zone collecte) pourra être faite en polish si besoin.

**Incrément 3 — fiche `billet.html` : section collecte(s) en lecture seule** (`606aa63`) :
- La fiche charge les collectes du billet et affiche la plus récente (statut coloré +
  collecteur + prix + dates), les plus anciennes en accordéon `<details>`.
- Le badge `Categorie` du billet est **masqué dès qu'il y a une collecte** (le statut
  vit sur la collecte). Couleurs de statut répliquées localement (la fiche ne charge
  pas app-new.js).

**Statut global : les 3 surfaces sont couvertes** — catalogue (incr. 1+2), fiche
(incr. 3), carte admin (déjà refondue en **#40** : statut par collecte). → **À tester**.

**Reste (non bloquant, différé) :**
- Aligner finement la carte admin sur la couleur « collecte affichée » (cosmétique).
- Factoriser un vrai composant `collecte-block` partagé (refacto DRY des 3
  implémentations) — **pas fait volontairement en autonomie** : refacto pur, risqué sans
  test visuel, sans valeur utilisateur immédiate. À planifier séparément si souhaité.
