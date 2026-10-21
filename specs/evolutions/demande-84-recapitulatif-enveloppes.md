# Demande #84 — Récapitulatif des enveloppes

- **Épic :** Corrections et évolutions (complexité **M**)
- **Demande :** #84 de la table `demandes` de production — Jean-Philippe, 2026-10-19, priorité
  *normale*. Public cité : collecteurs.
- **Statut :** développée le 2026-10-21 (dev lancé par Cyril le jour même).
- **Version en clair :** [demande-84-recapitulatif-enveloppes-en-clair.md](demande-84-recapitulatif-enveloppes-en-clair.md)

## Contexte (demande)

> peux tu faire un recap de la totalité des enveloppes qu avec les billets contenus par enveloppe
> et par membre ainsi que le montant qu il y a à l intérieur

## Constat

- « Mes collectes » > « Préparation des envois » (`loadEnveloppes()` → `renderEnveloppesListe()`)
  liste les enveloppes `en_cours` du collecteur en trois groupes (à répartir / en attente de
  paiement / en attente d'envoi), une carte par membre avec un **nombre** de billets. Le contenu
  et sa valeur ne se voient qu'en ouvrant chaque enveloppe (`renderEnveloppeDetail`, valeur de #40).
- Toutes les données nécessaires sont déjà chargées par l'onglet : enveloppes, inscriptions
  `pret_a_envoyer` / `non_reparti` (quantités ramenées au périmètre de leur collecte, #46), fiches
  des membres, billets. **Aucune requête à ajouter, aucune migration.**
- Jean-Philippe a 1 680 collectes ; l'incident du 16/10 portait sur ses 43 enveloppes en cours :
  c'est un écran qu'il remplit beaucoup.

## Décisions

1. **Un bouton « Récapitulatif des enveloppes »** en tête de l'onglet (`.historique-toolbar`,
   bouton `.btn-relance` comme le « Récapitulatif global » des paiements). Il ouvre la fenêtre
   `#relance-modal` déjà utilisée par les récapitulatifs.
2. **Ce qui est listé** : les enveloppes **affichées** par l'onglet (`enveloppesPourRecap`, posé
   par `renderEnveloppesListe()` après le ménage des enveloppes vides), et dans chacune les
   inscriptions `pret_a_envoyer` qui y sont. Une section par membre, **par nom puis prénom** (l'ordre
   de la liste), avec le nombre de billets et leur **valeur** ; une ligne par billet : libellé
   « Amorce Millésime-Version Nom » (`refBilletLabel`), quantités « 2 normaux + 1 variante » dans le
   périmètre de la collecte, valeur de la ligne.
3. **La valeur est celle de #40** (`valeurBillets`) : prix de la collecte de chaque inscription,
   hors frais de port. Une collecte sans prix compte 0 et sa valeur n'est pas affichée
   (`labelValeurBillets`), comme dans le détail d'une enveloppe.
4. **Les billets « à répartir » ne sont pas listés** : ils ne sont pas dans l'enveloppe. Une
   enveloppe affichée sans aucun billet dedans n'a pas de section ; une phrase en fin de
   récapitulatif en donne le nombre. Choix soumis à Jean-Philippe en commentaire sur la fiche
   le 21/10.
5. **Copier** (texte brut, même mécanique que le récapitulatif des paiements :
   `copierRecapPaiement(idTexte)` prend désormais l'identifiant du texte, défaut inchangé) et
   **Imprimer** (`imprimerRecapEnveloppes()` : le contenu seul dans une fenêtre à part, pour ne pas
   imprimer menus et onglets). Si le navigateur bloque la fenêtre, un message le dit.
6. Aucun billet dans aucune enveloppe : message « Aucun billet dans les enveloppes pour
   l'instant », pas de fenêtre vide.

## Hors périmètre

- Les envois déjà expédiés (onglet « Historique des envois »).
- Un export CSV ou tableur : pas demandé.
- L'enveloppe du collecteur lui-même, quand il est bénéficiaire, est listée comme à l'écran.

## Critères d'acceptation

1. « Préparation des envois » affiche le bouton « Récapitulatif des enveloppes ».
2. La fenêtre donne en tête le nombre d'enveloppes, de billets et la valeur totale, puis une
   section par membre (nom, prénom) avec ses billets, leurs quantités et leur valeur.
3. Une variante hors du périmètre de sa collecte n'est pas comptée ; une collecte sans prix
   n'affiche pas de valeur.
4. Une enveloppe sans billet dedans n'a pas de section, et elle est comptée dans la phrase de fin.
5. « Copier » copie le récapitulatif en texte ; « Imprimer » imprime le récapitulatif seul.
6. « Copier » du récapitulatif des paiements copie toujours le sien.

## Vérification

Banc jsdom `scripts/banc-62/test-84-recap-enveloppes.mjs` (non versionné) : vrai `mes-collectes.js`
+ `global.js`, imitation de PostgREST en mémoire, fenêtre d'impression et copie imitées. Cinq
enveloppes (pleine, petite, sans billet dedans, collecte sans prix, vraiment vide) : **17/17**.
Non-régression : bancs #86 (27/27), #82 (17/17) et incident du 16/10 (26/26).

## Réalisation

*(à compléter)*
