# Demande #45 (prod) — Périmètre des versions dans le formulaire d'expédition

- **Épic :** Corrections et évolutions
- **Demande :** #45 de la table `demandes` **de production** — saisie le 2026-09-06 après l'audit
  fait en développant #40. Priorité normale, complexité S.
- **Concerne :** collecteurs
- **Écran :** Mes collectes → Préparation des envois → Expédier l'enveloppe
- **Statut :** À tester
- **Commit :** `00c6ce6`

## Contexte (demande)

Le formulaire d'expédition comptait les billets de l'enveloppe en additionnant bêtement
`nb_normaux + nb_variantes`, sans appliquer le périmètre de versions ouvert par la collecte —
la règle posée par #46. Sur une collecte « variante seule », des quantités « normales » qui n'ont
aucune existence sont donc comptées : le nombre de billets affiché est faux, et avec lui le prix
de port pré-rempli.

## Analyse / décisions

- **Corriger à la lecture, pas au point de calcul.** Les trois autres chargements d'inscriptions
  — `openCollecteDetail()`, `loadVerificationPaiement()`, `loadEnveloppes()` — mettent déjà les
  quantités au périmètre juste après le `fetch`. `ouvrirFormulaireExpedition()` était **le seul à
  ne pas le faire** (vérifié un par un). On applique donc le même geste au même endroit, plutôt
  que de rustiner le calcul du nombre de billets : tout ce qui suit dans la fonction s'aligne d'un
  coup — nombre affiché, prix de port, et la valeur des billets de #40.
- **Cohérence gagnée au passage** : #40 calculait déjà la valeur **avec** la règle de périmètre,
  alors que le compteur juste à côté l'ignorait. Le formulaire pouvait donc annoncer « 54 billets ·
  valeur 62 € » là où la valeur ne portait que sur 29 billets. Les deux chiffres se répondent
  maintenant.
- **Le mode d'envoi suggéré n'était pas concerné**, contrairement à ce que disait la demande à sa
  saisie : `getModeEnvoiPlusExigeant()` lit le champ `mode_envoi` des inscriptions, jamais leurs
  quantités. Corrigé dans le commentaire de la demande.
- **Pas de contrainte en base.** Ces quantités hors périmètre existent dans les données (saisies
  avant #46, ou collectes dont le scope a changé après coup) ; on les neutralise à l'affichage,
  comme partout ailleurs, sans réécrire l'historique.

## Effet mesuré avant / après (prod, 2026-09-06)

Sur les **149 enveloppes en cours** :

- **23** voient leur nombre de billets corrigé ;
- **1 seule** voit son **prix** changer : enveloppe 108, **54 → 29 billets**, pré-remplissage
  **5,90 € → 3,70 €**. Les 22 autres restent dans la même tranche tarifaire, le prix ne bougeait
  déjà pas ;
- écart cumulé sur le prix pré-rempli : **2,20 €**.

Autrement dit : l'enjeu financier est négligeable — et le champ restait modifiable à la main. Le
vrai défaut est **l'affichage** : annoncer 54 billets pour une enveloppe qui en contient 29 fait
douter de tout le reste de l'écran. C'est ce qui justifie le correctif, pas les 2,20 €.

## Critères d'acceptation

1. Le formulaire d'expédition affiche le nombre de billets réellement dans le périmètre de la
   collecte.
2. Le prix de port pré-rempli est calculé sur ce nombre-là, et se recalcule pareil au changement
   de mode d'envoi.
3. La valeur des billets (#40) et le nombre affiché portent sur le même périmètre.
4. Une enveloppe sans quantité hors périmètre — le cas de 126 des 149 enveloppes en cours — est
   inchangée.
5. Le prix reste modifiable à la main.

## Réalisation

- **Fichiers :** `mes-collectes.js` — mise au périmètre dans `ouvrirFormulaireExpedition()`
  (la carte des billets `bMapExp` sert aussi à #40, sa déclaration en double a été retirée).
- **Migration :** aucune.
- **Cache-buster :** `sw.js` v285 + `menu.html?v=193`.
- **Commit :** `00c6ce6`
