# Demande #86 — Relancer les frais de port impayés

- **Épic :** Corrections et évolutions (complexité **S**)
- **Demande :** #86 de la table `demandes` de production — Sébastien, 2026-10-21, priorité
  *haute*. Publics cités : membres, collecteurs, admins.
- **Statut :** développée le 2026-10-21 (dev lancé par Cyril le jour même).
- **Version en clair :** [demande-86-relance-frais-de-port-en-clair.md](demande-86-relance-frais-de-port-en-clair.md)

## Contexte (demande)

> Il semblerait qu'il ne soit pas possible de faire une relance pour des fdp non payé. quand on
> clique sur les boutons recap global ou relancer individuellement, il y a marqué aucun impayé ce
> qui est faux (regarde actuellement pour Seb Tournois il y a deux frais de port non payé

## Constat

- « Mes collectes » > « Vérification paiement » charge trois listes dans `loadVerificationPaiement()`
  et les range dans `verifPaiementData` : `inscriptions` (billets non soldés), `enveloppesPort`
  (frais d'envoi avancés par le collecteur : `prix_envoi_reel > 0`, `statut_paiement_port` ≠
  `confirme`) et `dettes` (#44 : compléments de prix si `montant > 0`, avoirs si `< 0`).
- L'écran (`renderVerificationPaiement`) et le total « En attente de paiement » comptent les trois
  — avoirs exclus du total, décision R1 de #44.
- Mais `ouvrirRelanceGlobale()` et `ouvrirRecapPaiementGlobal()` ne lisent **que
  `inscriptions`** : un membre qui ne doit que des frais d'envoi n'y figure pas, son total y est
  faux s'il doit aussi des billets, et sans billet impayé on tombe sur le toast « Aucun impayé à
  relancer » / « Aucun impayé ».
- **Lu en production le 21/10** : Sébastien collecte sous l'alias « Laura NCY » (membre 93). Deux
  enveloppes expédiées à port non payé, 10,94 € chacune (membres 37 et 101, envoyées les 15 et
  16/10), et aucune inscription impayée : exactement le cas décrit. Aucune dette en base à ce jour.
- La relance **par billet** (`ouvrirRelance`, bouton d'une collecte) n'est pas concernée : des
  frais d'envoi ne se rattachent pas à un billet.

## Décisions

1. **Une seule source pour les deux boutons** : `impayesParMembre()` regroupe par numéro de membre
   les trois listes de `verifPaiementData`, avec les **mêmes règles que l'écran** — avoirs exclus,
   adresse de repli prise dans la fiche du membre (`membresMap`) quand il ne doit pas de billet, tri
   par nom puis prénom. Chaque groupe porte `totalBillets`, `totalPort`, `totalDettes` et `total`.
2. **Relance** : après les lignes de billets, une ligne par frais d'envoi (« Frais d'envoi du
   16/10/2026 — 10.94 € », date d'expédition de l'enveloppe), puis une par complément (son
   `libelle`, ex. « Augmentation du prix — UEBK 2026-14 NAUSICAA »). « Total dû » et le lien
   PayPal prennent le total du groupe. L'accroche passe de « tes inscriptions en attente de
   paiement » à « tes paiements en attente », juste dans tous les cas.
3. **Récapitulatif** : chaque membre garde sa ligne « NOM Prénom → total », suivie de
   « (dont 10.94 € de frais d'envoi, 1.50 € de complément de prix) » quand il doit autre chose que
   des billets. La liste « Billets à payer » n'apparaît que si elle n'est pas vide (même règle pour
   le texte copié).
4. **Les paiements déclarés restent dans la relance**, comme c'était déjà le cas pour les billets :
   l'écran les compte dans ce qui est en attente. Changer cette règle n'est pas demandé.

## Hors périmètre

- Les avoirs (le collecteur doit au membre) : ni dans la relance, ni dans le récapitulatif.
- La relance par billet d'une collecte.
- L'échappement HTML des noms dans ces fenêtres (inchangé, comme le reste de l'écran).

## Critères d'acceptation

1. Un collecteur dont les membres ne doivent que des frais d'envoi : « Relancer individuellement »
   propose un message par membre, avec la ligne « Frais d'envoi du JJ/MM/AAAA — X €» et le bon
   total ; « Récapitulatif global » liste ces membres et le total général.
2. Un membre qui doit billets + frais d'envoi + complément : le « Total dû » de sa relance et sa
   ligne du récapitulatif valent le « Total » affiché pour lui à l'écran.
3. Un avoir n'apparaît nulle part dans la relance ni dans le total.
4. Ni le collecteur lui-même, ni un envoi gratuit (0 €), ni un port déjà confirmé ne figurent.
5. Le récapitulatif sans billet impayé n'affiche pas de liste « Billets à payer » vide.

## Vérification

Banc jsdom `scripts/banc-62/test-86-relance-port.mjs` (non versionné) : vrai `mes-collectes.js` +
`global.js`, imitation de PostgREST en mémoire. Trois scénarios — le cas de Sébastien reproduit à
partir des lignes lues en base, un cas mélangé (billets, port, complément, avoir) comparé aux
totaux de l'écran, et le cas sans impayé. **27/27** ; contre-épreuve sur l'ancien code : **16 KO**,
dont le toast « Aucun impayé à relancer » de la demande.

## Réalisation

*(à compléter)*
