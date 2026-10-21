# Demande #87 — « Partager » présente une collecte, et chaque collecte a son bouton

- **Épic :** Corrections et évolutions (complexité **S**)
- **Demande :** #87 de la table `demandes` de production — Jean-Philippe, 2026-10-21, priorité
  *normale*. Publics cités : membres, collecteurs, admins. Liée à #88 et #89.
- **Statut :** développée le 2026-10-21 (dev lancé par Cyril le jour même).
- **Version en clair :** [demande-87-partager-une-collecte-en-clair.md](demande-87-partager-une-collecte-en-clair.md)

## Contexte (demande)

> Le bouton partager, quand il y a deux collectes sur un billet, ne fonctionne pas comme souhaité,
> par exemple pour le billet lapalisse, on voudrait qu'il dise que ce soit damien le collecteur
> avec le détail

**Précision de Cyril en commentaire (21/10)** : « le bouton partager devrait être sur chaque
collecte c'est juste ? » — oui, retenu (réponse sur la fiche le même jour).

## Constat

`openShareModal(billetId)` (`admin.js`, bouton de la carte dans Gestion Billets) prépare le texte
du post Facebook à partir du billet :
- le **collecteur** vient de `collectePrincipaleBilletAdmin()` : la collecte nommée « Collecte
  initiale » si elle existe — **même terminée** —, sinon la première non terminée ;
- le **prix** vient de la première collecte non terminée de la liste ;
- le **statut** est celui du billet (dérivé de toutes ses collectes).

Sur un billet à plusieurs collectes, le texte pouvait donc annoncer le collecteur d'une collecte
et le prix d'une autre, et ne disait pas quelle version était collectée. Lapalisse (21/10) : une
collecte des normaux (Damien, 3,20 €) et une pré-collecte des dorés.

## Décisions

1. **Le texte présente une collecte** (`afficherPartage(billet, collecte)`) : statut **de la
   collecte** ; si elle est en « Collecte », son collecteur et son adresse PayPal ; une ligne
   « 🔹 Version : normale / Doré » quand le billet a deux versions et que la collecte n'en couvre
   qu'une (`scope`) ; le prix des seules versions qu'elle couvre (#46). Titre, image et lien
   d'inscription inchangés.
2. **Chaque collecte en cours a son bouton « Partager »** dans la liste des collectes de la page du
   billet (`renderCollectesList()`, classe `btn-partager-collecte`, même allure que « Modifier »),
   branché sur la délégation de clics existante (`initPanel()`). Pas de bouton sur une collecte
   terminée.
3. **Le bouton « Partager » du billet** (carte de Gestion Billets) : une seule collecte en cours →
   elle est partagée directement ; **plusieurs** → la fenêtre propose de choisir
   (`afficherChoixCollectePartage()`), le texte et « Copier » attendent le choix ; aucune en cours
   → la première collecte du billet, comme avant.
4. **La fenêtre de partage est ajoutée à `admin-billet.html`** : elle n'existait que sur
   `admin.html`, et la liste des collectes vit sur la page du billet. Fermeture au clic hors de la
   fenêtre et par Échap : déjà gérées par `admin.js` dès que l'élément existe.

## Hors périmètre

- Le libellé du prix d'une variante garde son code (« 2.50€ D ») comme avant ; seule la nouvelle
  ligne « Version » emploie le libellé (« Doré »).
- Partager depuis le catalogue membre : il n'y a pas de bouton de partage côté membre.

## Critères d'acceptation

1. Lapalisse, bouton de la carte : la fenêtre propose « Collecte Normale » ou « Collecte 2026 ».
2. « Collecte Normale » : statut Collecte, Damien et son PayPal, version normale, 3.20 €.
3. « Collecte 2026 » : pré-collecte, version Doré, ni collecteur ni prix.
4. Une collecte en cours à côté d'une « Collecte initiale » terminée : c'est la collecte en cours
   qui est partagée, avec son collecteur et son prix.
5. Billet à une seule collecte « les deux versions » : texte identique à avant.
6. Page du billet : un bouton « Partager » par collecte en cours, qui ouvre la fenêtre sur elle.

## Vérification

Banc jsdom `scripts/banc-62/test-87-partage-collecte.mjs` (non versionné) : vrai `admin.js` +
`global.js`, `admin.html` et `admin-billet.html` ; vrai clic dans la liste des collectes (délégation
d'`initPanel()`). **15/15** ; contre-épreuve sur l'ancien `admin.js` : échec dès le premier cas
(aucun choix proposé).

## Réalisation

*(à compléter)*
