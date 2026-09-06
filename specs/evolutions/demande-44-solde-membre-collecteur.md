# Demande #44 (prod) — Solde entre membre et collecteur après un changement de prix

- **Épic :** chantier structurant (complexité **L** — spec détaillée obligatoire avant dev)
- **Demande :** #44 de la table `demandes` **de production** — Jean-Philippe, 2026-09-02,
  priorité **haute**.
- **Concerne :** membres, collecteurs, admins
- **Statut :** **En cours — phase d'analyse.** Aucune ligne de code avant accord sur cette spec.
- **Prise en premier** parce que c'est la seule demande de priorité haute restante. L'ordre acté
  le 2026-07-21 (#16 → #1 → #22) ne la concerne pas : elle est postérieure, et #1/#22 sont en
  priorité basse et normale.

## Contexte (demande)

> lorsqu'il y a une modification de prix à la hausse ou à la baisse, mettre un système pour les
> membres pour avoir ou devoir de l'argent à un collecteur, idem pour le collecteur : il sait
> qu'il doit rembourser ou attendre une future collecte pour régulariser le solde

## Le constat qui commande tout le reste

**La base ne conserve aucune trace d'un montant payé.** La table `inscriptions` porte
`statut_paiement` (`non_paye` / `declare` / `confirme`) et `date_validation`, mais **aucun
montant**. Ce que doit un membre est toujours **recalculé** :

```
montant dû = nb_normaux × collectes.prix + nb_variantes × collectes.prix_variante
```

Vérifié sur les 19 tables du schéma : il n'existe ni table de paiements, ni historique de prix,
ni colonne de montant sur `inscriptions`. Le seul montant réel enregistré dans toute
l'application est `enveloppes.prix_envoi_reel` — l'affranchissement payé par le collecteur.

**Conséquence :** un changement de prix réécrit le passé en silence. Un membre qui a payé 2,00 €
le billet, sur une collecte passée ensuite à 2,20 €, reste affiché « payé » — la différence
n'existe nulle part. Une baisse de prix crée de la même façon un avoir invisible.

**Donc #44 n'est pas une fonctionnalité d'affichage.** On ne peut pas « montrer la différence » :
il faut d'abord que le système se mette à **enregistrer ce qui a été payé**. C'est ce qui en fait
une L, et ce qui explique qu'aucun contournement d'écran ne puisse y suffire.

Corollaire, du même ordre que la leçon de #11 : le solde ne pourra exister que **pour les
paiements postérieurs au déploiement**, sauf décision de reprise (voir Q3).

## Ce que recouvre vraiment « changement de prix »

Mesuré en base le 2026-09-06 :

| Statut de collecte | Nombre | Dont sans prix |
|---|---|---|
| Pré collecte | 62 | **62** |
| Collecte | 42 | 0 |
| Terminé | 5 256 | 1 087 |

**Les 62 collectes en pré-collecte n'ont aucun prix.** Pour elles, renseigner le prix n'est pas un
changement : c'est la première saisie, et personne n'a encore payé. Le cas visé par la demande est
donc celui des **42 collectes ouvertes qui ont déjà un prix** — celui qu'on corrige après coup
parce que le tarif réel du fournisseur est tombé, ou qu'on s'est trompé.

## Exposition actuelle

Population qu'un changement de prix mettrait immédiatement en solde — inscriptions déjà payées
(ou déclarées payées) sur une collecte **encore ouverte** :

- **302 inscriptions**, **18 membres**, **41 collectes**, **5 collecteurs**
- **532 billets**, **2 188,15 €** déjà engagés

C'est petit, et c'est une bonne nouvelle : le chantier peut démarrer sans reprise massive. Mais
ces 2 188 € sont précisément la somme dont la base ne sait pas si elle a été encaissée à ce
prix-là.

## Piste retenue (à valider)

**Enregistrer le paiement, calculer le solde — ne jamais stocker le solde.**

1. **Nouvelles colonnes sur `inscriptions`** : `montant_paye NUMERIC` (et son pendant pour les
   frais de port si Q2 le retient), renseigné **au moment où le collecteur valide** le paiement,
   avec le montant calculé à cet instant. `date_validation` existe déjà pour l'horodater.
2. **Le solde est dérivé, jamais stocké** : `solde = montant dû aujourd'hui − montant payé`.
   Positif → le membre doit ; négatif → le collecteur doit. Un solde stocké finirait par diverger
   du calcul, comme tout doublon de vérité.
3. **Le prix reste la source de vérité de ce qui est dû.** On ne fige pas le prix à l'inscription :
   le groupe veut justement que le nouveau prix s'applique. Ce qu'on fige, c'est **ce qui a été
   encaissé**.
4. **Agrégation par membre × collecteur**, parce que c'est ainsi que la dette se règle en vrai
   (« devoir de l'argent à un collecteur »), et parce que ça survit à la clôture d'une collecte —
   c'est la condition pour « attendre une future collecte pour régulariser ».
5. **Annuler un paiement** (#20) remet `montant_paye` à NULL, comme il remet déjà
   `date_validation`.

### Écarté, et pourquoi

- **Figer le prix à l'inscription** : simple, supprime le problème… et supprime aussi la
  fonctionnalité. Le collecteur ne pourrait plus répercuter un tarif réel sur des inscrits, ce
  qu'il fait aujourd'hui.
- **Une table `paiements` séparée** : plus propre en théorie (paiements partiels, multiples), mais
  c'est un deuxième modèle à maintenir en parallèle de `statut_paiement`, pour un besoin qui reste
  « un règlement par inscription ». À rouvrir seulement si Q1 impose une compensation automatique
  complexe.

## Questions à trancher avant tout développement

**Q1 — Le solde est-il actif ou informatif ?** *(la vraie bifurcation)*
Soit le site **déduit automatiquement** l'avoir du prochain montant dû (le membre voit un montant
déjà net), soit il **affiche le solde** et les deux personnes se règlent entre elles comme
aujourd'hui, par PayPal ou chèque.
*Recommandation : informatif d'abord.* La compensation automatique touche au calcul de ce que
chacun réclame, sur un système qui n'a encore jamais enregistré un montant. Afficher un solde
juste est déjà tout le bénéfice de la demande ; automatiser pourra venir ensuite, sur des données
éprouvées.

**Q2 — Les frais de port entrent-ils dans le solde ?**
`enveloppes.prix_envoi_reel` est déjà le montant réel, et il change lui aussi (mode d'envoi
différent de celui prévu).
*Recommandation : non, pas dans la première version.* Le port a son propre statut de paiement et
sa propre logique ; le mélanger rendrait le solde illisible pour un gain marginal.

**Q3 — Que fait-on des 302 inscriptions déjà payées ?**
Soit on **gèle aujourd'hui** le montant dû actuel comme « montant payé » (reprise en une requête),
soit on **démarre à zéro** et seul l'avenir a un solde.
*Recommandation : geler.* L'hypothèse « ils ont payé le prix en vigueur » est vraie tant qu'aucun
prix n'a bougé depuis leur paiement — et les prix ont été semés depuis les billets à la bascule
du 6 septembre, donc l'hypothèse est aussi bonne qu'elle le sera jamais. Ne pas le faire, c'est
laisser 2 188 € hors du système et devoir expliquer pourquoi certains membres n'ont pas de solde.

**Q4 — Qui voit quoi ?** Proposition : le membre voit son solde par collecteur dans « Mes
inscriptions » ; le collecteur voit la liste de ses membres en solde dans « Mes collectes » ;
l'admin voit tout dans les stats. Reste à décider si le solde s'ajoute à la **somme due du menu**
(#4), ce qui le rendrait visible en permanence.

**Q5 — Prévient-on les membres ?** Un changement de prix sur une collecte où des gens ont déjà
payé peut déclencher une notification ciblée (la mécanique de #33 existe et sert déjà). À décider :
automatique, ou à la main par le collecteur.

## Suite

Une fois Q1–Q3 tranchées, cette spec est complétée (modèle de données exact, écrans, critères
d'acceptation, plan de reprise) et **c'est seulement à ce moment que le dev commence**. Si le
chantier grossit — notamment si Q1 va vers la compensation automatique — on passe par la méthode
BMAD (PRD + architecture + stories) plutôt que par cette seule spec.
