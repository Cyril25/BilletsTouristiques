# Demande #49 — Audit « billet vs collecte » : les derniers endroits où le billet décidait

- **Table `demandes`** : #49 (priorité haute, complexité M).
- **Statut** : À tester

## Contexte

Après #46 (affichage/quantités) et #48 (inscriptions par collecte + fuite de scoping),
question de Cyril : « on est certain que plus rien ne se base sur le billet lui-même quand
il doit se baser sur la collecte ? ». Réponse : **non** — une passe complète du repo a
trouvé cinq familles restantes, dont une **destructive**. Cette demande les traite.

## Analyse

Rappel du modèle (établi en #16, confirmé en #48) : ce qui se **vend** (prix, périmètre,
statut de campagne, collecteur, inscriptions) appartient à la **collecte** ; le **billet**
ne porte que l'identité (référence, millésime, ville, image, versions existantes) et un
statut **dérivé** de ses collectes. Sur la copie de test, ce statut dérivé affiche
« Collecte » pour les billets 5477, 5491 et 5505 alors qu'une de leurs collectes est
« Terminé » : toute décision prise sur `billet.Categorie` est donc fausse dès qu'un billet
porte deux collectes.

### 1. `nettoyerInscriptionsBlacklist` — destructif

Quand un collecteur est assigné, on supprime les inscriptions des membres qu'il a
blacklistés… avec un `DELETE inscriptions?billet_id=eq.X`. Sur un billet porté par deux
collecteurs, **la blacklist de l'un effaçait les inscriptions de l'autre**, silencieusement.

→ On charge d'abord **ses** collectes du billet et on supprime par `collecte_id=in.(…)`
(un billet a une ou deux collectes : l'URL reste courte).

### 2. Catalogue : blacklist et bénéficiaire du mauvais collecteur

`blacklistCollecteurs[collecteurPrincipalCatalogue(item)]` et `estBeneficiaireCatalogue(item)`
raisonnaient sur le collecteur **principal du billet**, y compris pour les collectes de
l'accordéon. Conséquences : être blacklisté par A empêchait de s'inscrire chez B sur le même
billet, et le bénéficiaire (collecteur inscrit sur sa propre collecte) était mal détecté.

→ `estBeneficiaireCollecte(collecte)` (générique) + blacklist lue sur `collecte.collecteur`.
`estBeneficiaireCatalogue(item)` devient un raccourci sur la collecte affichée.

### 3. Gardes de paiement sur `billet.Categorie`

FDP, bouton PayPal, badge de paiement, `collecteOuverte`, pré-remplissage « terminaisons »
testaient le statut du **billet**. Cas concret : un membre inscrit sur une collecte encore
en **pré-collecte**, sur un billet dont une autre collecte est en « Collecte » (statut
dérivé), se voyait proposer de payer **avant que le prix soit fixé**.

→ Toutes ces gardes lisent le statut de la collecte concernée (`colPrinc` pour la carte, la
collecte de l'inscription pour la modale de déclaration, la collecte de la section pour
l'accordéon).

### 4. « Mes collectes » : ouvert/fermé du billet au lieu de MA collecte

Le compteur, la répartition ouvertes/fermées, le libellé de la carte et l'en-tête du détail
venaient de `billet.Categorie` : **ma** collecte terminée restait affichée « En cours » si
celle d'un autre collecteur était ouverte.

→ `billetOuvertPourMoi(billet)` / `statutBilletPourMoi(billet)`, calculés sur
`collectesParBillet` (mes collectes), avec repli sur le statut du billet tant qu'elles ne
sont pas chargées. La clôture, elle, ciblait déjà correctement mes collectes.

### 5. Intersection scope ∩ versions du billet — décision

Le mini-formulaire de collecte rapide n'ouvrait **aucun champ de prix** sur un billet
`HasVariante = 'N'` portant une collecte de scope « variante » (cas 5477) : impasse, on ne
pouvait pas saisir le prix.

→ **Règle tranchée** : en **lecture et en saisie**, le scope de la collecte décide seul
(comme la modale de collecte et comme #46/#48). En **écriture automatique** de quantités
(`recalculerAutoInscriptions`, `admin-pre-inscriptions`), on **garde l'intersection** : créer
des variantes sur un billet qui n'en déclare pas serait pire que de n'en créer aucune. Le
choix est commenté aux deux endroits.

### 6. Code mort — non traité

`loadMesCollectesSupplementaires` / `renderCollecteSupplementaireCard` / `openCollecteDetailSupp`
portent encore l'ancienne règle billet mais sont **inatteignables** (`mesCollectesSupp` est
remis à `[]` depuis la fusion des flux en #16). Supprimer ~150 lignes juste avant une session
de test ajoute du risque sans rien changer pour l'utilisateur : à faire avec le reste de la
dette cosmétique.

## Ce qui reste légitimement au niveau du billet

Badges de version de la carte (l'existence d'une variante est une propriété du billet),
`ma-collection` (possession d'un billet), export eBay, filtres du catalogue par statut
dérivé, `hasInscriptions` (gel des champs d'un billet), contrôle d'anti-double-inscription
(volontairement transverse aux collectes), `admin-stats`.

## Critères d'acceptation

- Assigner un collecteur ayant une blacklist sur un billet à deux collecteurs ne supprime
  que **ses** inscriptions.
- Un membre blacklisté par le collecteur A peut toujours s'inscrire à la collecte de B sur
  le même billet ; le badge « Bénéficiaire » n'apparaît que sur la collecte du collecteur.
- Sur une collecte en pré-collecte, aucun bouton de paiement ni FDP, même si le billet
  affiche « Collecte » à cause d'une autre collecte.
- Dans « Mes collectes », une collecte terminée n'est plus affichée « En cours » parce
  qu'un autre collecteur en a une ouverte sur le même billet.
- Le formulaire rapide propose bien le prix variante sur une collecte de scope « variante »,
  même si le billet ne déclare pas de variante.

## Réalisation

- `admin.js` : `nettoyerInscriptionsBlacklist` (par collectes du collecteur) ;
  `showCollecteQuickForm` (scope seul) ; commentaire de décision sur `recalculerAutoInscriptions`.
- `app-new.js` : `estBeneficiaireCollecte` + gardes de paiement et blacklist par collecte
  (carte principale **et** accordéon), `collecteOuverte` et pré-remplissage sur la collecte.
- `mes-collectes.js` : `billetOuvertPourMoi` / `statutBilletPourMoi` (compteur, tri,
  cartes, en-tête du détail).
- `sw.js` v280 / `global.js` menu v188.
- **Commit** : `<à compléter>`
