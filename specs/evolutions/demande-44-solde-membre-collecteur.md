# Demande #44 (prod) — Dette et avoir entre membre et collecteur après un changement de prix

- **Épic :** chantier structurant (complexité **L** — spec détaillée obligatoire avant dev)
- **Demande :** #44 de la table `demandes` **de production** — Jean-Philippe, 2026-09-02,
  priorité **haute**.
- **Concerne :** membres, collecteurs, admins
- **Statut :** **En cours — phase d'analyse.** Aucune ligne de code avant accord.
- **Prise en premier** parce que c'est la seule demande de priorité haute restante. L'ordre acté
  le 2026-07-21 (#16 → #1 → #22) ne la concerne pas : elle est postérieure, et #1/#22 sont en
  priorité basse et normale.

## Contexte (demande)

> lorsqu'il y a une modification de prix à la hausse ou à la baisse, mettre un système pour les
> membres pour avoir ou devoir de l'argent à un collecteur, idem pour le collecteur : il sait
> qu'il doit rembourser ou attendre une future collecte pour régulariser le solde

## Le constat de départ

**La base ne conserve aucune trace d'un montant payé.** `inscriptions` porte `statut_paiement`
(`non_paye` / `declare` / `confirme`) et `date_validation`, mais **aucun montant**. Ce que doit un
membre est toujours recalculé :

```
montant dû = nb_normaux × collectes.prix + nb_variantes × collectes.prix_variante
```

Vérifié sur les 19 tables du schéma : ni table de paiements, ni historique de prix, ni colonne de
montant. Le seul montant réel enregistré dans toute l'application est `enveloppes.prix_envoi_reel`.
Cyril l'avait pressenti (« on a le flag payé, mais je ne crois pas qu'on ait le montant… ce
montant se base directement sur le prix du billet non ? ») : c'est exactement ça, à ceci près que
le flag a **trois** valeurs, et que ces trois valeurs sont précisément les trois cas à traiter.

Un changement de prix réécrit donc le passé en silence : un membre qui a payé 3,00 € sur une
collecte passée à 3,20 € reste affiché « payé », et la différence n'existe nulle part.

## Le modèle retenu : la ligne de dette (proposition de Cyril)

Plutôt que d'enregistrer un montant payé et d'en dériver un solde abstrait, on **matérialise
l'écart en une ligne nommée**, sur le modèle des frais de port : un objet visible, rattaché à un
membre et à un collecteur, qui se paie et se valide avec la machinerie existante.

C'est le bon modèle, et pour une raison de fond : **il n'a pas besoin de savoir ce qui a été
payé.** Au moment où le prix change, on connaît l'écart (nouveau − ancien) et on sait qui avait
déjà réglé. La dette se calcule donc sans mémoire du passé — ce qui fait tomber le seul vrai
obstacle du chantier.

### Les trois cas, au moment où le prix change

| `statut_paiement` | Prix en hausse | Prix en baisse |
|---|---|---|
| `non_paye` | **Rien.** Le montant dû se recalcule au nouveau prix — c'est déjà le comportement actuel, et il est juste. | **Rien**, idem. |
| `declare` (payé annoncé, pas validé) | **Ligne de dette** : « Augmentation du prix — UEBK 2026-14 NAUSICAA » | **Ligne d'avoir** |
| `confirme` (validé par le collecteur) | **Ligne de dette** | **Ligne d'avoir** |

Montant de la ligne :
`(nouveau_prix − ancien_prix) × nb_normaux + (nouveau_prix_variante − ancien_prix_variante) × nb_variantes`

⚠ **En appliquant la règle de périmètre (#46)** — les quantités hors du périmètre ouvert par la
collecte ne comptent pas. Sans cette précaution on facturerait des billets fantômes : c'est
exactement le défaut que #45 vient de corriger dans le calcul des frais de port. Autant ne pas le
réintroduire dans un calcul de dette.

### La baisse de prix — « à voir comment faire »

C'est **la même ligne, signe inversé**. Ce qui change n'est pas le calcul mais le règlement, parce
qu'un membre ne peut pas « payer » un montant négatif :

- **côté membre**, la ligne s'affiche comme un avoir : « Le collecteur X vous doit 1,20 € » ;
- **côté collecteur**, elle apparaît dans ses lignes à régler, avec un bouton qui la clôt —
  « Remboursé » ou « Déduit d'une prochaine collecte » ;
- **la ligne reste ouverte tant que le collecteur ne l'a pas close.** C'est très exactement le
  « attendre une future collecte pour régulariser le solde » de la demande : rien n'est perdu,
  rien n'est automatique, et les deux parties voient la même chose.

Symétriquement, une dette (montant positif) se paie comme une ligne de frais de port : le membre
déclare, le collecteur valide. Mêmes statuts, mêmes écrans, rien de neuf à apprendre.

### Pourquoi un déclencheur en base, et pas du code d'écran

La création des lignes doit se faire dans un **trigger PostgreSQL sur `collectes`**
(`UPDATE OF prix, prix_variante`), pas dans `admin.js`. Trois raisons vérifiées :

1. Aujourd'hui seul `admin.js` écrit le prix (modale collecte, création et édition) — mais la
   policy `collectes_update_own_collecteur` **autorise un collecteur à modifier sa propre
   collecte, prix compris**, par appel direct à l'API. Aucun écran ne le propose ; la porte est
   ouverte quand même (même famille que la policy de désinscription notée dans la fiche).
2. Les prix sont parfois corrigés **en SQL** à la main.
3. C'est déjà le choix de #16 : `Categorie` et `date_effective` sont dérivées par trigger. Une
   règle de cohérence qui vit en base ne peut pas être contournée par un chemin qu'on n'a pas prévu.

## Ce que les réponses de Cyril ont tranché

- **Périmètre : billets seulement.** Les frais de port gardent leur propre logique de paiement ;
  les mélanger rendrait le solde illisible.
- **Reprise de l'existant : rien à faire, et c'est vérifié.** La réponse « geler le montant
  actuel » est satisfaite gratuitement par le modèle de la ligne de dette : puisque la dette naît
  de l'écart au moment du changement, **l'état actuel est la référence**. Aucune colonne
  `montant_paye`, aucune requête de reprise, aucune hypothèse sur qui a payé quoi.
  Contrôle effectué le 2026-09-06 : sur les 5 359 collectes « Collecte initiale », **2 seules**
  divergent du prix d'origine du billet (billets 824 et 825, 2,12 → 2,13), et ce sont les arrondis
  connus de la migration, sur des collectes terminées. **Aucun prix n'a été édité depuis la
  bascule** : la référence de départ est propre.

## Exposition actuelle

Population qu'un changement de prix mettrait immédiatement en ligne de dette — inscriptions déjà
payées ou déclarées, sur une collecte **encore ouverte** :

- **302 inscriptions**, **18 membres**, **41 collectes**, **5 collecteurs**
- **532 billets**, **2 188,15 €** déjà engagés

Et pour cadrer ce que « changement de prix » veut dire : sur les 104 collectes ouvertes, **les 62
en pré-collecte n'ont aucun prix**. Pour elles, renseigner le prix est une première saisie, pas un
changement — personne n'a encore payé. Le cas visé est celui des **42 collectes ouvertes déjà
tarifées**.

## Points restant à trancher

**P1 — Une déclaration de paiement refusée doit annuler sa ligne de dette.**
Un membre `declare` n'a pas été vérifié. Si le prix monte, on crée sa ligne ; si le collecteur
**refuse ensuite** la déclaration, le membre redevient redevable du **plein** nouveau prix — et la
ligne ferait double emploi. Règle proposée : **la ligne suit le paiement**. Annuler un paiement
(#20) annule les lignes non encore réglées qui en découlent. Une ligne **déjà réglée**, elle,
n'est jamais touchée automatiquement : le collecteur ajuste à la main.

**P2 — Les écarts d'un centime.** Un changement de 0,005 € génère une ligne à 0,01 €. Proposition :
pas de seuil dans les données (une dette est une dette), mais un bouton « solder » en un clic pour
les liquider sans cérémonie. À confirmer, ou fixer un seuil.

**P3 — Notifier ou non.** La mécanique de notification ciblée (#33) existe et fonctionne. Proposition :
prévenir automatiquement les membres concernés lors de la création d'une ligne — c'est de l'argent,
ils ne vont pas surveiller l'écran. À confirmer.

**P4 — Où le solde se voit.** Proposition : membre → « Mes inscriptions », près de ses lignes de
frais de port ; collecteur → « Mes collectes », avec ses paiements à vérifier ; admin → écran de
stats. Reste à décider s'il entre dans la **somme due du menu** (#4), ce qui le rendrait visible en
permanence.

## Suite

P1 à P4 tranchés, cette spec est complétée (schéma de la table, trigger, écrans, critères
d'acceptation) et **le dev commence à ce moment-là, pas avant**. Le chantier reste dans le format
« spec longue » ; il ne justifie pas un PRD BMAD tant qu'on s'en tient au solde informatif décrit
ici.
