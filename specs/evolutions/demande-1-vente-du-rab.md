# Demande #1 — Vente du rab et des numéros spéciaux par le collecteur

- **Épic :** chantier structurant (complexité **L**)
  ⚠ Ré-estimée **M** au cadrage du 09/09, **remise à L le 10/09** : cette ré-estimation mesurait ce que le cadrage avait *enlevé*, pas ce qui restait — une migration, quatre points durs, deux écrans, un état d'acceptation neuf, et de l'argent en jeu.
- **Demande :** #1 de la table `demandes` de production — import Google Sheet, 2026-07-16,
  priorité **basse**.
- **Concerne :** collecteurs (6 actifs, 14 au maximum), et les membres qui leur achètent.
- **Statut :** **analyse reprise et complétée le 2026-09-10.** La réouverture de #22 a une
  conséquence unique mais structurante sur #1 : elle **dépend maintenant du lot 1 de #22**.
  Voir « Ce que la reprise de #22 change ici ». Aucun développement commencé.
- **Origine :** issue du cadrage commun `demande-22-et-1-cadrage-doubles-et-vente.md`, dont les
  7 questions ont été tranchées le **2026-09-09**. Ce document est la spec de dev qui en découle ;
  #22 a désormais la sienne, les deux demandes ne partagent plus de modèle.

## Contexte (demande)

> Vente du rab / numéros spéciaux : permettre au collecteur d'affecter un billet à un membre avec
> un prix personnalisé (revente Facebook), pour que chacun n'oublie pas de payer et d'envoyer.
>
> *Commentaire :* prix libre par billet, visible dans mes-inscriptions du membre avec le numéro du
> billet mis par le collecteur et son prix associé.

Aujourd'hui ça se passe entièrement sur Facebook : le collecteur annonce son reliquat, un membre
répond, ils conviennent d'un prix — et plus rien ne le trace. Les commentaires des anciennes
collectes en portent la marque (« voir JP pour le rab », « 50 commandés, pas de rab »).

## Les décisions du cadrage qui commandent cette spec

| | Décision du 2026-09-09 |
|---|---|
| **Q3** | La vente porte **un numéro de série optionnel** : le collecteur vend tantôt « 2 billets du rab », tantôt « le billet n° 00042 ». Les deux cas doivent marcher. |
| **Q4** | **Modèle C** — le prix vit dans une **ligne de `dettes`** avec `motif = 'vente_rab'`. Pas de prix sur l'inscription, pas de collecte de vente. |
| **Q5** | **Confirmation préalable du membre** : une vente qu'on lui affecte ne compte dans son solde qu'**après qu'il l'a acceptée**. |

Le modèle C tient parce que #44 a livré exactement la primitive qui manquait — *un montant
arbitraire dû entre un membre et un collecteur, avec un libellé, réglé par le parcours habituel* —
et que sa colonne `motif` avait été introduite avec la mention « laisse la porte ouverte à
d'autres origines ». **#1 est cette autre origine.**

`dettes` est **en production depuis le 2026-09-07** (vérifié le 2026-09-09 : la table répond, elle
est vide). La réserve de calendrier notée au cadrage — « le modèle C dépend de #44 pas encore en
prod » — **est levée**.

## En un exemple

Jean-Philippe a 3 billets en trop d'une collecte terminée. Sur Facebook, Marie en veut un, et veut
précisément le **n° 00042**. Ils conviennent de **8,00 €**.

1. JP ouvre sa collecte dans « Mes collectes », **« Vendre du rab »**, choisit Marie, saisit
   `1 billet`, `8,00 €`, et — facultatif — le numéro `00042`.
2. Marie reçoit une notification privée et voit dans « Mes inscriptions » un bloc **« Vente
   proposée par JP — billet n° 00042 : 8,00 € »**, avec **J'accepte / Je refuse**.
   **Tant qu'elle n'a pas accepté, la somme n'apparaît nulle part dans son solde.**
3. Marie accepte. La ligne devient une dette due ordinaire : elle entre dans la somme du menu,
   elle se règle par le parcours habituel (déclarer → le collecteur valide), et le billet rejoint
   son enveloppe chez JP.
4. Si Marie refuse, JP est prévenu, la ligne est marquée refusée et ne compte jamais.

## Ce que la base sait déjà faire — et les quatre points durs

Le modèle C promettait « presque rien à construire ». C'est vrai du parcours de paiement, **faux
sur quatre points** que la lecture de `scripts/migration-demande-44-dettes.sql` fait apparaître.
Ce sont eux le vrai contenu du dev.

### 1. Aucun collecteur ne peut créer une ligne de dette

```sql
CREATE POLICY dettes_insert_admin ON dettes FOR INSERT
    WITH CHECK (is_admin_ou_superadmin());
```

Le commentaire dit pourquoi : « personne n'insère à la main, les lignes naissent du trigger ».
#1 rend cette hypothèse fausse — c'est le collecteur qui crée la vente. Il faut **une policy
d'INSERT pour le collecteur, étroitement bornée** : son propre alias, `motif = 'vente_rab'`
imposé, montant strictement positif, et l'acceptation forcée à « en attente » (sinon un
collecteur pourrait s'auto-accepter une vente chez un membre).

### 2. Le trigger R4 de #44 supprimerait la vente

`annuler_dettes_paiement_annule()` efface **toutes** les dettes non réglées rattachées à une
inscription dès que son paiement repasse à `non_paye` :

```sql
DELETE FROM dettes WHERE inscription_id = NEW.id AND statut_paiement = 'non_paye';
```

C'est juste pour un écart de prix — la ligne ferait double emploi. C'est **faux pour une vente** :
elle a sa propre existence, elle ne disparaît pas parce qu'un paiement a été annulé. Le trigger
doit être restreint à `motif = 'changement_prix'`.

### 3. La somme du menu compterait une vente non acceptée

`global.js:588` additionne les dettes `statut_paiement=eq.non_paye&montant=gt.0` — sans rien
savoir de l'acceptation. Une vente proposée et pas encore acceptée gonflerait le « vous devez »
du menu, ce que Q5 interdit explicitement. Le filtre doit exclure les lignes non acceptées.

### 4. `collecte_id` est `NOT NULL`

Une vente doit donc se rattacher à une collecte. Ça tombe bien : le rab **vient** d'une collecte
connue, et c'est elle qui porte le collecteur et le billet. Le collecteur vend depuis sa collecte,
pas dans le vide — c'est aussi ce qui évite d'inventer un rattachement.

## Le point que la spec doit trancher : comment le billet part dans l'enveloppe

Contrainte non négociable, vérifiée : **l'expédition est entièrement pilotée par
`inscriptions.statut_livraison` + `inscriptions.enveloppe_id`** (mes-collectes.js, 12 emplacements).
Un billet qui n'est pas une inscription ne peut pas être suivi dans une enveloppe. Or la demande
dit « pour que chacun n'oublie pas de payer **et d'envoyer** » : l'envoi fait partie du besoin.

Il faut donc créer une inscription à l'acceptation. **Mais une inscription ordinaire serait
facturée au prix de la collecte, en plus de la ligne de vente — le membre paierait deux fois.**

Deux façons de l'éviter :

| | Comment | Coût | Risque |
|---|---|---|---|
| **Quantités à zéro** *(recommandé)* | L'inscription est créée avec `nb_normaux = 0` et `nb_variantes = 0`. Les quantités réellement vendues sont portées par `dettes.nb_normaux` / `nb_variantes`, colonnes **qui existent déjà**. | **Aucun calcul de montant à modifier** : tout multiplie par zéro et tombe juste tout seul. Le trigger de #44 s'auto-protège même (`IF v_montant = 0 THEN CONTINUE`). | Une ligne « 0 billet » s'afficherait telle quelle. À corriger dans l'affichage : mes-inscriptions doit reconnaître l'inscription liée (via `dettes.inscription_id`) et la rendre **dans le bloc de vente**, pas comme une inscription normale. |
| **Drapeau `inscriptions.vente_rab`** | Une colonne booléenne, et chaque calcul de montant force 0 quand elle est vraie. | Quantités honnêtes à l'affichage. | **Le calcul de prix n'est pas centralisé** : `prixDepuisCollecte()` ne vit que dans mes-collectes.js ; mes-inscriptions.js et global.js calculent chacun le leur. C'est précisément le défaut qui avait fait écarter le modèle B — un oubli = un montant faux et silencieux. |

**Recommandation : les quantités à zéro.** C'est la seule des deux qui ne demande à aucun calcul
d'argent d'apprendre une règle nouvelle, et le travail restant est un travail d'affichage, où une
erreur se voit au lieu de se cacher dans un montant.

## Le modèle de données

Une seule migration, `scripts/migration-demande-1-vente-rab.sql`, qui **amende** l'existant sans
rien casser :

1. **`dettes.acceptation TEXT NULL`** — `CHECK (acceptation IN ('en_attente','acceptee','refusee'))`.
   `NULL` pour toutes les lignes de #44 : un écart de prix ne s'accepte pas, il s'impose. Seules
   les ventes portent une valeur. Plus `date_acceptation TIMESTAMPTZ`.
2. **`dettes.numero_serie TEXT NULL`** — le numéro saisi par le collecteur (Q3). Stocké **en
   colonne et pas seulement dans le libellé** : le libellé est du texte d'affichage, un numéro
   qu'on voudra un jour rechercher ou recopier dans `collection.serial_normal` doit être une
   donnée. Le libellé reste rempli pour la lisibilité (« Vente du rab — billet n° 00042 »).
3. **Policy `dettes_insert_collecteur`** — bornée comme dit au point 1 ci-dessus.
4. **Correction du trigger R4** — `AND motif = 'changement_prix'` dans le `DELETE`.
5. **Policy d'UPDATE** — le membre doit pouvoir passer `acceptation` de `en_attente` à `acceptee`
   ou `refusee` sur **sa** ligne. Le `WITH CHECK` actuel ne l'autorise qu'à poser
   `statut_paiement = 'declare'` : il faut l'élargir, sans lui ouvrir le montant.

⚠ Le fichier de migration est **gitignoré comme toutes les migrations** ; il sera à jouer par
Cyril dans l'éditeur SQL Supabase, et son contenu reproduit dans cette spec au moment du dev.

## Les écrans

| Écran | Ce qui change |
|---|---|
| `mes-collectes.js` | **Nouveau** : action « Vendre du rab » sur une collecte du collecteur — choix du membre, quantité, prix, numéro de série facultatif. Puis suivi de ses ventes (proposée / acceptée / refusée / réglée). |
| `mes-inscriptions.js` | **Nouveau** : bloc « Ventes proposées » avec **J'accepte / Je refuse**, et affichage des ventes acceptées dans le solde. Doit masquer l'inscription à quantité nulle qui sert de véhicule d'envoi. |
| `global.js` | Somme du menu : exclure les ventes non acceptées (point dur n° 3). |
| Notifications | Une à la proposition (privée, vers le membre — `cible_email`, policy de #33), une au refus (vers le collecteur). Le parcours de règlement réutilise celles de #44. |

## Critères d'acceptation

1. Un collecteur crée une vente depuis sa collecte : membre, quantité, prix libre, numéro de série
   facultatif. Un non-collecteur ne peut pas, **y compris par appel direct à l'API**.
2. Un collecteur ne peut créer une vente que sur **son** alias, avec `motif='vente_rab'`, un
   montant `> 0`, et `acceptation='en_attente'` — toute autre valeur est refusée par la base.
3. Tant que la vente n'est pas acceptée : elle n'apparaît **ni dans la somme du menu, ni dans le
   montant dû** de « Mes inscriptions ». Elle est visible comme proposition, c'est tout.
4. Le membre accepte → la vente entre dans son solde et se règle par le parcours habituel
   (déclarer, puis validation par le collecteur), avec les écrans de #44 inchangés.
5. Le membre refuse → la ligne ne compte jamais, le collecteur est prévenu et peut la supprimer.
6. Le billet vendu **part dans l'enveloppe** du membre chez ce collecteur, suivi comme les autres.
7. Le membre ne paie **que le prix de la vente** — jamais le prix de la collecte en plus.
8. Un changement de prix de la collecte d'origine **ne crée aucune dette** sur une vente du rab.
9. Une annulation de paiement sur une autre inscription du membre **ne supprime pas** la vente.
10. Le numéro de série s'affiche chez le membre comme le demandait le commentaire de la fiche, et
    reste facultatif — vendre « 2 billets du rab » sans numéro doit marcher.

## Ce que la reprise de #22 change ici (2026-09-10)

#22 n'est plus un tableau d'affichage : elle porte des **transactions entre membres** — ventes et
échanges — avec **dette, confirmation par le créancier et historique**. Le cadrage commun avait
séparé #1 et #22 sur un argument central, *« #1 a de l'argent, #22 n'en a pas »*, **qui est mort**.

### La conséquence : #1 dépend du lot 1 de #22

Le **modèle C** de #1 repose sur `dettes`, aujourd'hui ancrée sur `collecteur_alias NOT NULL` et
`collecte_id NOT NULL`. Le lot 1 de #22 **généralise précisément cette table** (créancier qui n'est
pas un collecteur, colonnes rendues nullables, RLS élargie).

Développer #1 avant, c'est poser la même primitive deux fois — puis migrer une table qui portera
alors des lignes réelles. **`dettes` est vide aujourd'hui** (mesuré le 10/09) : c'est le moment le
moins cher pour la généraliser, et il ne se représentera pas.

**Ordre retenu, qui remplace celui du cadrage** (« développer #1 d'abord ») :

```
lot 1 de #22 (fondation : dettes généralisée + transactions)  →  #1  →  lot 2 de #22 (annonces)
```

#1 reste **la petite** des deux : une fois la fondation posée, il ne lui reste que ses quatre
points durs et ses deux écrans.

### Ce qui ne change pas

Les décisions **Q3** (numéro de série optionnel), **Q4** (le prix vit dans une ligne de dette et
non sur l'inscription) et **Q5** (confirmation préalable du membre) **restent valables**. Les
quatre points durs identifiés dans la migration #44 et le mécanisme d'inscription à quantités
nulles également. **C'est l'ordre des travaux qui a changé, pas le contenu de la spec.**

Un détail gagne même en cohérence : la Q5 de #1 (le membre accepte avant que la vente compte) et la
règle de #22 (celui qui reçoit confirme) sont **le même principe** — rien n'apparaît dans le solde
de quelqu'un sans un geste de sa part.

## Ce que cette spec ne fait pas

- **Pas de vente entre deux membres** — c'est #22. La frontière est désormais nette : #22
  fournit la **fondation** (dettes généralisée, transactions), #1 s'en sert pour le cas
  collecteur → membre, qui a en plus l'enveloppe et l'inscription.
- **Pas de catalogue du rab** : le collecteur sait ce qui lui reste, l'appli ne l'inventorie pas.
  La vente se négocie toujours sur Facebook, l'appli enregistre ce qui a été convenu.
- **Pas de reprise** des ventes passées.
- **Pas de rattachement à `collection.serial_normal`** côté acheteur : le numéro est stocké, le
  pont avec le registre de collection viendra si « Ma collection » s'ouvre (lot séparé, Q6).

## Réalisation

*(à compléter après dev : fichiers touchés + commit)*

---

*Spec du 2026-09-09, issue du cadrage commun #22/#1. Aucune ligne de code écrite : la demande est
en analyse jusqu'à validation explicite de Cyril.*
