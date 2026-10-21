# Demande #88 — Plusieurs collectes en cours : ne plus en cacher une dans l'accordéon

- **Épic :** Corrections et évolutions (complexité **S**)
- **Demande :** #88 de la table `demandes` de production — Cyril, 2026-10-21, priorité *haute*.
  Publics cités : membres, collecteurs, admins. Liée à #87 et #89.
- **Statut :** développée le 2026-10-21 (dev lancé par Cyril le jour même).
- **Version en clair :** [demande-88-collectes-en-cours-depliees-en-clair.md](demande-88-collectes-en-cours-depliees-en-clair.md)

## Contexte (demande)

> Quand il y a plusieurs collectes ouvertes en même temps (que ce soit pré collecte et collecte,
> deux pré collecte, deux collectes), il faut qu'on voit correctement visuellement les deux (que
> l'accordéon ne soit pas fermé dans ce cas)

## Constat

- Catalogue (`app-new.js`, `loadCollectesByBillet()` puis `buildCollectesSupplementairesHtml()`) et
  fiche du billet (`billet.js`, `renderCollectesFiche()`) appliquent la même règle depuis #44 : la
  collecte **la plus récente** (`date_pre`, puis `created_at`) est affichée en entier ; **toutes**
  les autres vont dans « Autres collectes de ce billet », en `<details>` **repliés**, terminées ou
  non.
- Une collecte encore ouverte se retrouve donc cachée dès qu'une autre est plus récente. Cas réel
  du 21/10, Lapalisse : « Collecte Normale » (Damien, ouverte) et « Collecte 2026 » (pré-collecte
  des dorés) — l'une des deux était forcément repliée.

## Décisions

1. **Une collecte en cours** (`categorie` ≠ `Terminé` : pré-collecte ou collecte) **est dépliée**
   dans l'accordéon (`<details open>`). Les terminées restent repliées.
2. **Les collectes en cours passent en tête de l'accordéon**, avant les terminées ; chaque groupe
   garde l'ordre « plus récente d'abord ». Sans ça, une vieille pré-collecte encore ouverte pouvait
   se retrouver sous des collectes terminées plus récentes.
3. **La collecte principale ne change pas** (toujours la plus récente) : la changer touche le statut
   affiché, les boutons d'inscription, le filtre par collecteur (#39) et le plafond (#24) — hors
   périmètre.
4. Même règle sur les deux écrans, pour qu'ils montrent la même chose. Côté catalogue, une fonction
   `collecteEnCours(c)` ; côté fiche (`billet.js`, fermé sur lui-même), la même condition en local.
5. Le membre peut toujours replier une collecte dépliée ; elle se redéplie au rendu suivant de la
   liste (filtre, tri), ce qui est voulu.

## Hors périmètre

- Le titre « Autres collectes de ce billet » reste tel quel.
- Le choix de la collecte principale (décision 3).
- L'administration (Gestion Billets) : sa liste des collectes d'un billet n'est pas un accordéon.

## Critères d'acceptation

1. Lapalisse : sur la carte et sur la fiche, la collecte de Damien est en haut et la pré-collecte
   des dorés est **dépliée** en dessous.
2. Une collecte en cours apparaît avant une collecte terminée plus récente, dépliée ; la terminée
   est repliée.
3. Un billet dont les autres collectes sont toutes terminées s'affiche comme avant (repliées).
4. Au téléphone et en mode sombre : rien de nouveau (même composant, déjà vérifié par #44 / #47).

## Vérification

Banc jsdom `scripts/banc-62/test-88-accordeon-collectes.mjs` (non versionné) : vrai `app-new.js` et
`billet.js` + `global.js`, données sur le modèle de Lapalisse. Carte (4 cas) et fiche (2 cas) :
**10/10** ; contre-épreuve sur l'ancien code : 6 KO.

## Réalisation

*(à compléter)*
