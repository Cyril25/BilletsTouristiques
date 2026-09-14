# Demande #1 — Vente du rab et des numéros spéciaux par le collecteur

- **Épic :** chantier structurant (complexité **L**)
  ⚠ Ré-estimée **M** au cadrage du 09/09, **remise à L le 10/09** : cette ré-estimation mesurait ce que le cadrage avait *enlevé*, pas ce qui restait — une migration, quatre points durs, deux écrans, un état d'acceptation neuf, et de l'argent en jeu. Le 14/09, la mise en vente dans l'application s'y ajoute : L sans discussion.
- **Demande :** #1 de la table `demandes` de production — import Google Sheet, 2026-07-16,
  priorité **basse**.
- **Concerne :** collecteurs (6 actifs, 14 au maximum), et les membres qui leur achètent.
- **Statut :** **analyse reprise le 2026-09-14** après la remarque de Jean-Philippe, qui réécrit le
  parcours : le collecteur **met son rab en vente** dans l'application, billet par billet ; un membre
  **demande** à acheter ; le collecteur **valide** qu'il a encore le billet, et c'est seulement là
  que la somme apparaît. Voir « Ce que la remarque de Jean-Philippe change ». Aucun développement
  commencé.
- **Complétée le même jour** avec les réponses de Jean-Philippe (13 h 21) : le numéro reste
  facultatif, et le collecteur doit pouvoir **attribuer directement** un billet à un membre avec qui
  il s'est déjà mis d'accord, sans action de ce membre. La règle Q5 qui l'interdisait reposait sur un
  fait inexact — voir « Les réponses de Jean-Philippe » et la question R6, pour Cyril.
- ~~Statut du 10/09 : « elle dépend maintenant du lot 1 de #22 ».~~ Ne tient plus le 14/09 : voir
  « L'ordre des travaux, revu ».
- **Origine :** issue du cadrage commun `demande-22-et-1-cadrage-doubles-et-vente.md`, dont les
  7 questions ont été tranchées le **2026-09-09**. Ce document est la spec de dev qui en découle ;
  #22 a désormais la sienne.

## Contexte (demande)

> Vente du rab / numéros spéciaux : permettre au collecteur d'affecter un billet à un membre avec
> un prix personnalisé (revente Facebook), pour que chacun n'oublie pas de payer et d'envoyer.
>
> *Commentaire :* prix libre par billet, visible dans mes-inscriptions du membre avec le numéro du
> billet mis par le collecteur et son prix associé.

Aujourd'hui ça se passe entièrement sur Facebook : le collecteur annonce son reliquat, un membre
répond, ils conviennent d'un prix — et plus rien ne le trace. Les commentaires des anciennes
collectes en portent la marque (« voir JP pour le rab », « 50 commandés, pas de rab »).

## Ce que la remarque de Jean-Philippe change (2026-09-14)

Jean-Philippe, collecteur, a relu la version en clair et réécrit le parcours de l'exemple
(commentaire du 14/09 sur la fiche). Ce qu'il écrit, et ce que ça change :

| Ce qu'écrit Jean-Philippe | Ce que ça veut dire | Conséquence sur la spec |
|---|---|---|
| « 3 billets en trop […] qu'il ajoute sur le site avec le numéro de chaque billet et le prix associé » ; le prix « billet par billet suivant le numéro, ou […] identique aux 3 billets » | Le collecteur **met son rab en vente** dans l'application, billet par billet, avant toute vente | Tombe : « pas de catalogue du rab ». Une table d'offres apparaît |
| « Marie accepte le prix proposé par Jean-Philippe et souhaite l'acheter » | Le prix n'est plus négocié ailleurs : il est **affiché**, le membre le prend ou non | Le prix vit sur l'offre ; la dette le recopie à la validation |
| « JP reçoit la demande d'achat de Marie et valide qu'il a encore le billet […] une fois validé le montant apparaît chez Marie » | C'est **le membre qui demande**, le collecteur qui valide | Le sens de la confirmation s'inverse. Le principe de Q5 tient — la demande est le geste du membre — mais son mécanisme tombe (colonne d'acceptation, bloc « J'accepte / Je refuse ») |
| « JP enregistre la vente depuis « Mes collectes » : pour Marie » — quantité, prix et numéro retirés | **Lu comme** la validation de la demande de Marie : les détails viennent désormais de l'offre | **Interprétation à confirmer par Jean-Philippe** — question R1. *Répondue l'après-midi, et la réponse va plus loin : voir « Les réponses de Jean-Philippe ».* |
| « JP valide le paiement et met le billet dans l'enveloppe de Marie […] rejoint le processus habituel d'envoi » | Payer, puis envoyer, dans l'enveloppe de collecte | Inchangé : c'était déjà le parcours. L'ordre est présenté, pas imposé, comme décidé pour #22 le 11/09 |

**Ce qui ne change pas** : Q3 (numéro de série facultatif — voir R5), Q4 (le prix vit dans une ligne
de dettes et non sur l'inscription), ~~le principe de Q5 (rien n'entre dans ce que doit un membre sans
un geste de sa part)~~, et le règlement par le parcours de #44. *Le principe de Q5 est remis en cause
le même jour : voir ci-dessous.*

### Les réponses de Jean-Philippe *(14/09, 13 h 21)*

Aux deux questions qui lui étaient posées :

| Question | Sa réponse | Ce que ça change |
|---|---|---|
| **R1** — faut-il aussi pouvoir enregistrer une vente conclue sur Facebook, sans mise en vente ? | « non, par contre imaginons que je vende le billet numéro 1000 à 5 euros et que je l'avais proposé à Marie sur Facebook, il me faut pouvoir le mettre à Marie directement sans que Marie ait une action à faire » | Pas de mécanisme de vente à part. Mais depuis la mise en vente, le collecteur **attribue** un billet à un membre — et la somme apparaît **sans geste du membre** |
| **R5** — le numéro de série, obligatoire ou facultatif ? | « facultatif » | Confirme Q3. Rien à changer |

**L'attribution directe contredit Q5**, décidée avec Cyril le 09/09 : « la vente ne compte dans le
solde du membre qu'après acceptation — le précédent “aucun montant sans inscription volontaire” est
préservé ».

**Or ce précédent n'existe pas.** Vérifié le 14/09 dans le code : depuis « Mes collectes », le bouton
**« Inscrire un membre »** ([mes-collectes.js:4015](../../mes-collectes.js#L4015)) crée une
inscription avec ses quantités et `statut_paiement = 'non_paye'` — donc une somme due — sans
aucune action du membre. La base l'autorise par la policy `inscriptions_insert_collecteur`
(`scripts/migration-inscription-collecteur-insert.sql`), et les admins par
`inscriptions_insert_admin`. **Un collecteur fait donc déjà, pour une inscription, exactement ce que
Jean-Philippe demande pour le rab.** Le cadrage du 09/09 et les deux versions précédentes de cette
spec ont répété ce fait sans le vérifier.

Conséquence recommandée : **aligner le rab sur l'existant** — le collecteur peut attribuer un billet
du rab à un membre, comme il peut déjà l'inscrire à sa collecte. La demande du membre reste le chemin
pour ceux qui découvrent le rab sur le site ; l'attribution, celui des accords déjà conclus ailleurs.
Comme cela revient sur une décision prise avec Cyril, **c'est à lui de le confirmer — question R6.**

## Le parcours *(réécrit le 14/09 d'après Jean-Philippe)*

Jean-Philippe a 3 billets en trop d'une collecte terminée, dont le **n° 00042**.

1. **JP met son rab en vente** depuis « Mes collectes », sur sa collecte : trois lignes, une par
   billet, chacune avec son numéro s'il le connaît et son prix — ou un seul prix appliqué aux trois.
   Les offres sont `disponible`.
2. **Marie voit le rab** (où : question R4) et **demande à acheter** le n° 00042 à 8,00 €. L'offre
   passe `demandee` : plus personne d'autre ne peut la demander. JP reçoit une notification.
3. **JP valide qu'il a encore le billet.** L'offre passe `vendue` ; dans la même opération, une
   ligne de `dettes` de 8,00 € naît à la charge de Marie, et le billet est rattaché à une
   inscription de Marie sur la collecte (point dur n° 5). Les 8,00 € apparaissent dans son
   « vous devez ».
4. **Marie déclare avoir payé, JP confirme** — le parcours de #44, inchangé.
5. **JP met le billet dans l'enveloppe de Marie**, avec ses autres billets s'il y en a ; l'envoi
   suit le processus habituel.

Si JP n'a plus le billet, il **refuse** : l'offre sort de la vente, Marie est prévenue. Tant que JP
n'a pas répondu, Marie peut **retirer sa demande** : l'offre redevient `disponible`. Personne n'est
relancé et rien n'expire — même principe que #22 (« l'application ne relance pas »).

### Quand l'accord est déjà conclu ailleurs *(ajouté le 14/09, réponse de Jean-Philippe — sous réserve de R6)*

JP a proposé le **n° 1000 à 5,00 €** à Marie sur Facebook, et elle a dit oui.

1. **JP attribue le billet à Marie** depuis « Mes collectes » : soit depuis une offre déjà en vente,
   soit en créant l'offre et en l'attribuant du même geste.
2. L'offre passe `vendue`, la dette de 5,00 € naît, le billet rejoint une inscription de Marie —
   **exactement la même opération que la validation d'une demande**, sans la demande.
3. **Marie n'a rien à faire.** Elle reçoit une notification : « JP vous a attribué le billet
   n° 1000 du rab : 5,00 € ». La suite est celle du parcours ci-dessus : paiement, puis enveloppe.

Si JP s'est trompé de personne, il **annule la vente** tant qu'elle n'est pas réglée : la dette
disparaît, l'offre redevient disponible — comme il peut aujourd'hui désinscrire un membre.

### L'exemple du 10/09, remplacé

~~JP ouvre sa collecte, « Vendre du rab », choisit Marie, saisit 1 billet, 8,00 € et le
numéro 00042. Marie reçoit une proposition avec J'accepte / Je refuse ; tant qu'elle n'a pas accepté,
la somme n'apparaît nulle part ; si elle refuse, JP est prévenu et la ligne ne compte jamais.~~

Remplacé le 14/09. Dans cette version, le collecteur **attribue** une vente négociée ailleurs et le
membre l'accepte. Jean-Philippe, collecteur lui-même, décrit l'inverse : une offre affichée, une
demande du membre, une validation du collecteur. La spec suit sa version ; les autres relecteurs
peuvent la contester sur la fiche.

## Les décisions du cadrage qui commandent cette spec

| | Décision du 2026-09-09 |
|---|---|
| **Q3** | La vente porte **un numéro de série optionnel** : le collecteur vend tantôt « 2 billets du rab », tantôt « le billet n° 00042 ». Les deux cas doivent marcher. |
| **Q4** | **Modèle C** — le prix vit dans une **ligne de dettes**, avec `motif = 'vente_rab'`. Pas de prix sur l'inscription, pas de collecte de vente. |
| **Q5** | **Confirmation préalable du membre** : une vente qu'on lui affecte ne compte dans son solde qu'**après qu'il l'a acceptée**. *Le 14/09 au matin : principe maintenu, mécanisme inversé — c'est la demande du membre qui fait son geste. Le 14/09 après-midi : la décision reposait sur un fait inexact (un collecteur peut déjà inscrire un membre sans son accord) et Jean-Philippe demande l'attribution directe — à confirmer par Cyril, question R6.* |

Le modèle C tient parce que #44 a livré exactement la primitive qui manquait — *un montant
arbitraire dû entre un membre et un collecteur, avec un libellé, réglé par le parcours habituel* —
et que sa colonne `motif` avait été introduite avec la mention « laisse la porte ouverte à
d'autres origines ». **#1 est cette autre origine.**

`dettes` est **en production depuis le 2026-09-07** (vérifié le 2026-09-09 : la table répond, elle
est vide). La réserve de calendrier notée au cadrage — « le modèle C dépend de #44 pas encore en
prod » — **est levée**.

## Les points durs

Le modèle C promettait « presque rien à construire ». C'est vrai du parcours de paiement, **faux
sur quatre points** que la lecture de `scripts/migration-demande-44-dettes.sql` fait apparaître.
Ce sont eux le vrai contenu du dev. *Revu le 14/09 : le n° 3 disparaît, le n° 1 change de forme,
quatre points s'ajoutent (n° 5 à 8).*

### 1. Aucun collecteur ne peut créer une ligne de dette

```sql
CREATE POLICY dettes_insert_admin ON dettes FOR INSERT
    WITH CHECK (is_admin_ou_superadmin());
```

Le commentaire dit pourquoi : « personne n'insère à la main, les lignes naissent du trigger ».
#1 rend cette hypothèse fausse — c'est le collecteur qui crée la vente.
~~Il faut une policy d'INSERT pour le collecteur, étroitement bornée : son propre alias, motif
vente_rab imposé, montant strictement positif, et l'acceptation forcée à « en attente ».~~

> **Revu le 14/09.** La dette ne naît plus d'une saisie du collecteur mais de sa **validation**
> d'une demande, et cette validation écrit dans trois tables à la fois (l'offre, la dette,
> l'inscription). D'où une fonction `SECURITY DEFINER` plutôt qu'une policy d'INSERT : elle vérifie
> que l'appelant est le collecteur de la collecte et fait les trois écritures ensemble, ou aucune.
> La table `dettes` reste fermée aux collecteurs en écriture directe — c'est mieux que la policy
> « étroitement bornée » prévue le 10/09.

### 2. Le trigger R4 de #44 supprimerait la vente

`annuler_dettes_paiement_annule()` efface **toutes** les dettes non réglées rattachées à une
inscription dès que son paiement repasse à `non_paye` :

```sql
DELETE FROM dettes WHERE inscription_id = NEW.id AND statut_paiement = 'non_paye';
```

C'est juste pour un écart de prix — la ligne ferait double emploi. C'est **faux pour une vente** :
elle a sa propre existence, elle ne disparaît pas parce qu'un paiement a été annulé. Le trigger
doit être restreint à `motif = 'changement_prix'`.

**Plus probable depuis le 14/09** : quand l'acheteur est déjà inscrit à la collecte, la dette pointe
vers **son inscription existante** (point dur n° 5), dont le paiement peut réellement être annulé.
La restriction n'est plus une précaution, c'est un correctif nécessaire.

### 3. La somme du menu compterait une vente non acceptée

`global.js:588` additionne les dettes `statut_paiement=eq.non_paye&montant=gt.0` — sans rien
savoir de l'acceptation. Une vente proposée et pas encore acceptée gonflerait le « vous devez »
du menu, ce que Q5 interdit explicitement. Le filtre doit exclure les lignes non acceptées.

**Sans objet depuis le 14/09.** Aucune dette n'existe avant la validation du collecteur, et cette
validation répond à une demande du membre : il n'y a plus de ligne « en attente » à exclure.
`global.js` n'est pas touché.

### 4. `collecte_id` est `NOT NULL`

Une vente doit donc se rattacher à une collecte. Ça tombe bien : le rab **vient** d'une collecte
connue, et c'est elle qui porte le collecteur et le billet. Le collecteur vend depuis sa collecte,
pas dans le vide — c'est aussi ce qui évite d'inventer un rattachement. *Inchangé le 14/09 : l'offre
est posée sur une collecte, la dette en hérite.*

### 5. Une seule inscription par membre et par collecte *(ajouté le 14/09)*

Depuis #16, `inscriptions` porte `UNIQUE (collecte_id, membre_email)` — contrainte
`inscriptions_collecte_membre_uk`,
[migration-demande-16-1.sql:396](../../scripts/migration-demande-16-1.sql#L396).

**Ce point manquait déjà à la version du 10/09**, indépendamment de la remarque de Jean-Philippe :
elle prévoyait de créer une inscription à quantités nulles pour chaque vente. Pour un membre déjà
inscrit à la collecte, la base la refuserait. Il y a donc deux cas :

- **Marie n'est pas inscrite à la collecte** — le cas typique du rab (« inscriptions closes, voir
  René pour le rab ») : on crée une inscription à quantités nulles, comme prévu. Vérifié dans le
  code : l'invariant D4 de #16 n'interdit que des quantités non nulles dans la mauvaise version,
  une inscription 0 / 0 passe ;
- **Marie est déjà inscrite** : le billet du rab est rattaché à **son inscription existante**, dont
  les quantités ne changent pas. Il voyage avec ses autres billets de la collecte — ce que décrit
  Jean-Philippe (« l'envoi se fera avec d'autres billets »).

### 6. Le membre déjà servi *(ajouté le 14/09)*

Une inscription ne porte **qu'une enveloppe** (`inscriptions.enveloppe_id`). Si Marie est inscrite à
la collecte et que son enveloppe est déjà partie, le billet du rab n'a plus de véhicule : le
rattacher à cette inscription réécrirait l'historique d'un envoi terminé. **Non tranché** —
question R3.

### 7. Deux membres demandent le même billet *(ajouté le 14/09)*

Le passage `disponible` → `demandee` se fait en une instruction conditionnelle
(`UPDATE … WHERE statut = 'disponible'`) dans la fonction de demande : la première demande
l'emporte, la seconde reçoit « déjà demandé ». Ni verrou applicatif, ni file d'attente.

### 8. Qui voit le rab *(ajouté le 14/09)*

Tous les membres, sauf avis contraire (R4) : le rab va typiquement à ceux qui ne se sont pas
inscrits à temps, donc pas seulement aux inscrits de la collecte. La policy de lecture compare
l'email du JWT à la table `membres` — sans clause `TO authenticated` : un membre connecté par
Firebase arrive dans le rôle anon.

## Le point que la spec doit trancher : comment le billet part dans l'enveloppe

Contrainte non négociable, vérifiée : l'expédition est **entièrement pilotée par l'inscription**
(`inscriptions.statut_livraison` + `inscriptions.enveloppe_id`, mes-collectes.js, 12 emplacements).
Un billet qui n'est pas une inscription ne peut pas être suivi dans une enveloppe. Or la demande
dit « pour que chacun n'oublie pas de payer **et d'envoyer** » : l'envoi fait partie du besoin.

Il faut donc créer une inscription à l'acceptation. **Mais une inscription ordinaire serait
facturée au prix de la collecte, en plus de la ligne de vente — le membre paierait deux fois.**

Deux façons de l'éviter :

| | Comment | Coût | Risque |
|---|---|---|---|
| **Quantités à zéro** *(recommandé)* | L'inscription est créée avec `nb_normaux = 0` et `nb_variantes = 0`. Les quantités réellement vendues sont portées par `dettes.nb_normaux` / `nb_variantes`, colonnes **qui existent déjà**. | **Aucun calcul de montant à modifier** : tout multiplie par zéro et tombe juste tout seul. Le trigger de #44 s'auto-protège même (`IF v_montant = 0 THEN CONTINUE`). | Une ligne « 0 billet » s'afficherait telle quelle. À corriger dans l'affichage : mes-inscriptions doit reconnaître l'inscription liée (via `dettes.inscription_id`) et la rendre **dans le bloc de vente**, pas comme une inscription normale. |
| **Drapeau sur l'inscription** (`inscriptions.vente_rab`) | Une colonne booléenne, et chaque calcul de montant force 0 quand elle est vraie. | Quantités honnêtes à l'affichage. | **Le calcul de prix n'est pas centralisé** : `prixDepuisCollecte()` ne vit que dans mes-collectes.js ; mes-inscriptions.js et global.js calculent chacun le leur. C'est précisément le défaut qui avait fait écarter le modèle B — un oubli = un montant faux et silencieux. |

**Recommandation : les quantités à zéro.** C'est la seule des deux qui ne demande à aucun calcul
d'argent d'apprendre une règle nouvelle, et le travail restant est un travail d'affichage, où une
erreur se voit au lieu de se cacher dans un montant.

> **Complété le 14/09** : les quantités à zéro valent pour un membre qui n'a **pas encore**
> d'inscription sur la collecte. S'il en a une, le billet la rejoint sans en changer les quantités —
> et le calcul tombe juste de la même façon, puisque la vente reste portée par la dette. Voir points
> durs n° 5 et 6. Et l'inscription se crée désormais **à la validation par le collecteur**, plus à
> l'acceptation par le membre.

## Le modèle de données

Une seule migration, `scripts/migration-demande-1-vente-rab.sql`, qui **amende** l'existant sans
rien casser :

1. ~~Colonne dettes.acceptation (en_attente, acceptee, refusee), vide pour toutes les lignes de
   #44, plus date_acceptation.~~ **Tombé le 14/09** : l'attente vit sur l'offre (`demandee`), plus
   sur la dette. Une dette de vente naît validée.
2. **Le numéro de série sur la dette** (`dettes.numero_serie TEXT NULL`) — recopié de l'offre à la
   validation (Q3). Stocké **en colonne et pas seulement dans le libellé** : le libellé est du texte
   d'affichage, un numéro qu'on voudra un jour rechercher ou recopier dans `collection.serial_normal`
   doit être une donnée. Le libellé reste rempli pour la lisibilité (« Vente du rab — billet
   n° 00042 »).
3. ~~Policy d'INSERT dettes_insert_collecteur, bornée comme dit au point dur n° 1.~~ **Tombé le
   14/09** : remplacé par la fonction de validation (voir « Les trois fonctions »).
4. **Correction du trigger R4** — `AND motif = 'changement_prix'` dans le `DELETE`. Nécessaire
   depuis le 14/09 (point dur n° 2).
5. ~~Policy d'UPDATE élargie pour que le membre passe l'acceptation de en_attente à acceptee ou
   refusee sur sa ligne.~~ **Tombé le 14/09** : le membre n'accepte plus rien, il demande — par une
   fonction.

### La table des offres *(ajouté le 14/09)*

`rab_offres` — nom provisoire, voir R2.

| Colonne | Rôle |
|---|---|
| `id`, `created_at` | |
| `collecte_id` | la collecte d'où vient le rab — elle porte le collecteur et le billet |
| `variante` | version normale ou variante ; doit être compatible avec le `scope` de la collecte (#16) |
| `numero_serie` | facultatif (Q3, R5) |
| `prix` | strictement positif ; saisi ligne par ligne, ou appliqué à toutes les lignes d'un coup à la saisie |
| `statut` | `disponible` → `demandee` → `vendue`, plus `retiree` |
| `demandeur_email` | le membre qui a demandé — clé étrangère vers `membres.email` en `ON UPDATE CASCADE`, comme le prévoit #62 pour toute table qui référence un membre |
| `demandee_at`, `repondue_at` | |
| `dette_id`, `inscription_id` | posés à la validation |

**Une ligne = un billet.** Trois billets sans numéro au même prix, ce sont trois lignes identiques :
la saisie « même prix pour tous » les crée d'un coup. Pas de colonne de quantité — c'est ce qui
permet la réservation ligne par ligne du point dur n° 7.

### Les fonctions *(ajouté le 14/09 — trois le matin, cinq l'après-midi)*

Toutes `SECURITY DEFINER`, appelées en RPC — le motif de #22 pour ses envois et de #51 pour
`mes_notifications_envoyees()` : la règle vit à un seul endroit.

- `demander_rab(p_offre_id)` — l'appelant est un membre. Passe l'offre de `disponible` à `demandee`
  en une instruction conditionnelle (point dur n° 7), pose `demandeur_email`, notifie le collecteur
  (notification privée, `cible_email`, policy de #33). Refuse que le collecteur de la collecte
  demande son propre rab.
- `retirer_demande_rab(p_offre_id)` — seul le demandeur, et seulement tant que l'offre est
  `demandee` : retour à `disponible`.
- `repondre_demande_rab(p_offre_id, p_valide)` — seul le collecteur de la collecte, seulement sur
  une offre `demandee`.
  Validée : crée la dette (`motif = 'vente_rab'`, montant = prix, `nb_normaux` ou `nb_variantes` à 1
  selon la version, `numero_serie`), rattache le billet à l'inscription existante du membre ou en
  crée une à quantités nulles (point dur n° 5), passe l'offre `vendue`, notifie le membre.
  Refusée (« je ne l'ai plus ») : l'offre passe `retiree`, le membre est notifié.
  Le cas du membre déjà servi attend R3.
- `vendre_rab(p_offre_id, p_membre_email)` *(ajouté l'après-midi, sous réserve de R6)* — seul le
  collecteur de la collecte, sur une offre `disponible`. **C'est l'opération « validée » ci-dessus,
  sans demande** : même dette, même rattachement à l'inscription, offre `vendue`, notification au
  membre. `repondre_demande_rab` validée l'appelle avec le demandeur ; l'attribution directe l'appelle
  avec le membre choisi. Une seule écriture de la règle. Créer l'offre et l'attribuer du même geste,
  c'est un INSERT suivi de cet appel.
- `annuler_vente_rab(p_offre_id)` *(ajouté l'après-midi)* — seul le collecteur, tant que la dette
  est `non_paye` : supprime la dette, retire le billet de l'inscription de véhicule (supprimée si elle
  a été créée pour lui et ne porte rien d'autre), l'offre redevient `disponible`. Nécessaire dès lors
  que le membre n'a plus de geste à faire : c'est son seul recours contre une erreur de personne,
  par l'intermédiaire du collecteur.

### Qui lit et écrit les offres *(ajouté le 14/09)*

- **Lecture** : les offres `disponible`, par tout membre (R4) ; toutes les offres de sa collecte, par
  le collecteur ; ses propres demandes, par le demandeur ; tout, par les admins.
- **Écriture directe** : le collecteur crée, modifie le prix et retire **ses offres encore
  disponibles**. Les colonnes `statut`, `demandeur_email`, `dette_id` et `inscription_id` ne
  changent **que par les fonctions** — garde-fou par colonne, sur le modèle de celui que #22 ajoute
  aux dettes (trouvé le 11/09).
- Aucune policy en `TO authenticated` (rôle anon, cf. point dur n° 8).

⚠ Le fichier de migration est **gitignoré comme toutes les migrations** ; il sera à jouer par
Cyril dans l'éditeur SQL Supabase, et son contenu reproduit dans cette spec au moment du dev.

## Les écrans *(revus le 14/09)*

| Écran | Ce qui change |
|---|---|
| `mes-collectes.js` | ~~Action « Vendre du rab » : choix du membre, quantité, prix, numéro de série facultatif.~~ **Mettre du rab en vente** sur une collecte du collecteur : lignes avec ou sans numéro, prix par ligne ou commun. **Demandes reçues** : « Je l'ai encore » / « Je ne l'ai plus ». **Attribuer à un membre** *(ajouté l'après-midi, R6)* : depuis une offre disponible, ou en la créant ; et « Annuler la vente » tant qu'elle n'est pas réglée. Suivi : disponible, demandée, vendue, retirée — puis le règlement par l'écran de #44. |
| Où le membre voit le rab *(nouveau)* | Selon R4. Proposition : un bloc « Rab disponible » sur la page du billet (`billet.html`), là où un membre regarde déjà un billet et ses collectes, avec « Je le veux ». |
| `mes-inscriptions.js` | ~~Bloc « Ventes proposées » avec J'accepte / Je refuse.~~ **Mes demandes de rab** : en attente, avec « Retirer ma demande » ; puis la vente validée dans le solde, comme une dette de #44. Doit masquer l'inscription à quantités nulles qui sert de véhicule d'envoi. |
| `global.js` | ~~Somme du menu : exclure les ventes non acceptées.~~ **Aucun changement** depuis le 14/09 (point dur n° 3 sans objet). |
| Notifications | ~~Une à la proposition, vers le membre ; une au refus, vers le collecteur.~~ Une à la **demande**, vers le collecteur ; une à la **réponse**, vers le membre, qu'elle soit positive ou non ; une à l'**attribution** et une à l'**annulation**, vers le membre *(ajoutées l'après-midi)*. Le règlement réutilise celles de #44. |

## Critères d'acceptation *(revus le 14/09)*

Ceux du 10/09 qui tombent, et pourquoi : ~~2 — le collecteur ne crée une vente qu'avec une
acceptation en attente~~ (il n'y a plus d'acceptation) ; ~~3 — une vente non acceptée n'apparaît
nulle part~~ (aucune dette n'existe avant la validation) ; ~~5 — le membre refuse, le collecteur est
prévenu~~ (c'est le collecteur qui refuse, le membre qui est prévenu). Les critères 1 et 4 sont
réécrits ; 6 à 10 sont repris.

1. Un collecteur met du rab en vente sur **sa** collecte : une ligne par billet, numéro facultatif,
   prix par ligne ou commun à toutes. Un non-collecteur ne peut pas, **y compris par appel direct à
   l'API**.
2. Un membre voit le rab disponible et demande un billet ; **un seul membre** peut demander une même
   ligne à la fois — la seconde demande reçoit « déjà demandé ».
3. Le collecteur de la collecte ne peut pas demander son propre rab.
4. Tant que la demande n'est pas validée, **rien n'apparaît** dans ce que doit le membre, ni dans le
   menu ni dans « Mes inscriptions » ; il peut retirer sa demande.
5. Le collecteur valide → la dette naît, entre dans le « vous devez » et se règle par le parcours de
   #44, écrans inchangés. Le collecteur refuse → l'offre sort de la vente et le membre est prévenu.
6. Les états « demandée » et « vendue » d'une offre ne se posent **que par les fonctions** : aucune
   écriture directe ne peut les poser, même celle du collecteur.
7. Le billet vendu **part dans l'enveloppe** du membre chez ce collecteur, suivi comme les autres —
   avec ses autres billets de la collecte s'il y est déjà inscrit.
8. Le membre ne paie **que le prix de la vente** — jamais le prix de la collecte en plus, qu'il y
   soit déjà inscrit ou non.
9. Un changement de prix de la collecte d'origine **ne crée aucune dette** sur une vente du rab.
10. Une annulation de paiement sur l'inscription qui porte le billet **ne supprime pas** la vente.
11. Le numéro de série s'affiche chez le membre, sur l'offre comme sur la dette, et reste
    facultatif.
12. Renommer l'adresse d'un membre (#62) fait suivre ses demandes de rab.
13. *(Ajouté l'après-midi, sous réserve de R6.)* Le collecteur **attribue** une offre disponible à
    un membre — ou crée l'offre et l'attribue d'un seul geste : la dette naît aussitôt, **sans action
    du membre**, qui reçoit une notification. Le résultat est identique à une demande validée.
14. Le collecteur **annule** une vente tant qu'elle n'est pas réglée : la dette disparaît, l'offre
    redevient disponible, le membre est prévenu. Une vente déclarée payée ne s'annule plus.

## Ce que la reprise de #22 change ici (2026-09-10)

#22 n'est plus un tableau d'affichage : elle porte des **transactions entre membres** — ventes et
échanges — avec **dette, confirmation par le créancier et historique**. Le cadrage commun avait
séparé #1 et #22 sur un argument central, *« #1 a de l'argent, #22 n'en a pas »*, **qui est mort**.

### La conséquence : #1 dépend du lot 1 de #22

~~Le modèle C de #1 repose sur dettes, aujourd'hui ancrée sur un alias de collecteur et une collecte
obligatoires. Le lot 1 de #22 généralise précisément cette table. Développer #1 avant, c'est poser
la même primitive deux fois — puis migrer une table qui portera alors des lignes réelles. dettes est
vide aujourd'hui : c'est le moment le moins cher pour la généraliser.~~

~~Ordre retenu le 10/09, qui remplaçait celui du cadrage : lot 1 de #22 (fondation), puis #1, puis
lot 2 de #22 (annonces).~~

> **Corrigé le 14/09 — pour deux raisons, dont une indépendante de Jean-Philippe.** D'abord, #22 a
> lui-même corrigé le 11/09 l'argument « la table est vide » : sa généralisation ne réécrit aucune
> donnée et coûtera la même chose plus tard (question O5 de #22). Ensuite et surtout, **dans le
> parcours de Jean-Philippe, la vente du rab tient dans la table des dettes telle qu'elle est** : le
> créancier est un collecteur et la vente vient d'une collecte — les deux colonnes obligatoires sont
> remplies naturellement. #1 n'a besoin d'aucune généralisation. Voir « L'ordre des travaux, revu ».

### Ce qui ne change pas

Les décisions **Q3** (numéro de série optionnel), **Q4** (le prix vit dans une ligne de dette et
non sur l'inscription) et **Q5** (confirmation préalable du membre) **restent valables** —
Q5 dans son principe, depuis le 14/09. Les points durs n° 1, 2 et 4 identifiés dans la migration #44
et le mécanisme d'inscription à quantités nulles également, complétés le 14/09.

~~Un détail gagne même en cohérence : la Q5 de #1 (rien ne compte sans un geste du membre) et la
règle de #22 (celui qui reçoit confirme) sont le même principe — rien n'apparaît dans le solde
de quelqu'un sans un geste de sa part.~~

> **Corrigé le 14/09 après-midi.** Ce « même principe » s'appuyait sur un précédent qui n'existe pas
> (voir « Les réponses de Jean-Philippe »). Entre deux membres (#22), personne n'a d'autorité sur
> l'autre : l'acceptation reste le seul garde-fou. Entre un collecteur et un membre, le collecteur
> **inscrit déjà** des membres à ses collectes, et donc leur fait déjà devoir une somme. Si R6
> confirme l'attribution directe, les deux demandes n'appliquent plus la même règle — et c'est
> cohérent avec les rôles qui existent déjà.

## L'ordre des travaux, revu (2026-09-14)

### Côté argent : #1 ne dépend plus du lot 1 de #22

Voir la correction ci-dessus. Le règlement d'une vente du rab utilise la table des dettes et les
écrans de #44 tels qu'ils sont en production.

### Côté mise en vente : #1 recoupe maintenant le lot 2 de #22

Le lot 2 de #22 prévoit exactement les mêmes gestes : un membre **met son double dans
l'application**, un autre clique **« ça m'intéresse »**, ce qui ouvre une transaction que le vendeur
accepte. C'est le parcours de Jean-Philippe pour le rab, avec un vendeur collecteur.

- **Ce qui est commun** : une offre affichée, une demande, une réponse du vendeur, la réservation
  pendant l'attente.
- **Ce qui diffère** : le rab est rattaché à une collecte, se paie toujours en argent, voyage dans
  l'enveloppe de collecte et n'a pas besoin d'être rapproché de recherches.

**Construire deux mécanismes de mise en vente, ce serait refaire l'erreur que #1 et #22 ont évitée
pour l'argent** : poser deux fois la même brique.

| | Principe | Pour | Contre |
|---|---|---|---|
| **A** *(recommandée)* | #1 construit la mise en vente en premier, limitée aux collecteurs et à leurs collectes, **pensée comme la première version des annonces** de #22 : mêmes états, mêmes gestes. Le lot 2 de #22 l'étend (membres, doubles et recherches, échange, rapprochement) | #1 n'attend plus rien. Le cas le plus simple — argent seul, vendeur connu, envoi et paiement déjà en place — sert de banc à la mécanique d'offre avant de l'ouvrir à 110 membres | #1 doit anticiper un peu le lot 2 : nommer et découper sa table pour qu'elle s'étende, sans construire ce que le rab n'utilise pas |
| **B** | #1 attend le lot 2 de #22 et en devient le cas « collecteur » | Une seule conception, faite d'un bloc | #1, de priorité basse, attend les deux premiers lots de #22 |
| **C** | Deux mécanismes séparés | Chacun reste simple | Deux façons de mettre en vente pour les membres, à réconcilier un jour |

C'est une décision d'ordre des travaux, qui appartient à Cyril — **question R2**. Les documents de
#22 ne sont pas modifiés par cette reprise, puisqu'ils sont en relecture : ils seront alignés une
fois R2 tranchée. Si A est retenue, la question O5 de #22 reçoit la même réponse.

## Ce que cette spec ne fait pas

- **Pas de vente entre deux membres** — c'est #22. ~~La frontière est désormais nette : #22 fournit
  la fondation (dettes généralisée, transactions), #1 s'en sert pour le cas collecteur vers membre,
  qui a en plus l'enveloppe et l'inscription.~~ Corrigé le 14/09 : #1 n'utilise plus la fondation de
  #22 ; la frontière passe désormais par la mise en vente — voir R2.
- ~~Pas de catalogue du rab : le collecteur sait ce qui lui reste, l'appli ne l'inventorie pas. La
  vente se négocie toujours sur Facebook, l'appli enregistre ce qui a été convenu.~~ **Tombé le
  14/09** : c'est précisément ce que demande Jean-Philippe — le rab est mis en vente dans
  l'application.
- **Pas de reprise** des ventes passées.
- **Pas de rattachement au registre de collection** côté acheteur (`collection.serial_normal`) : le
  numéro est stocké, le pont avec le registre viendra si « Ma collection » s'ouvre (lot séparé, Q6).
- **Pas de négociation** *(ajouté le 14/09)* : le prix est celui de l'offre. Un collecteur qui veut
  baisser un prix modifie une offre encore disponible.
- **Pas de relance ni d'expiration** d'une demande restée sans réponse *(ajouté le 14/09)*, comme
  pour #22.
- ~~Pas de vente attribuée directement à un membre, sans offre (ajouté le 14/09 au matin) — sauf si
  R1 la réintroduit.~~ **Tombé l'après-midi** : Jean-Philippe demande l'attribution directe (R1,
  voir R6). Ce qui reste exclu : une vente **hors de toute offre**. L'attribution passe toujours par
  une ligne d'offre, créée à la volée si besoin — Jean-Philippe a répondu « non » à un mécanisme à
  part.

## Questions ouvertes *(14/09)*

| | Question | Pour qui | Recommandation |
|---|---|---|---|
| ~~R1~~ | ~~« JP enregistre la vente depuis Mes collectes : pour Marie » : validation de la demande de Marie, ou aussi une vente conclue sur Facebook sans offre ?~~ **Répondue le 14/09** : pas de mécanisme à part, mais l'attribution directe d'une offre à un membre, sans action de sa part | Jean-Philippe | ~~La lecture retenue, seule : le second chemin ramènerait la vente attribuée que le membre doit accepter.~~ Recommandation tombée : elle supposait que toute attribution devait être acceptée par le membre. Jean-Philippe demande justement le contraire — voir R6 |
| **R2** | L'ordre des travaux : A, B ou C (« L'ordre des travaux, revu ») | Cyril | A |
| **R3** | Le membre **déjà servi** : son enveloppe de la collecte est partie, comment voyage le billet du rab ? | Les relecteurs, pour la fréquence du cas ; puis le dev | Selon la fréquence : refuser la demande avec un message clair (le plus simple) ; suivre l'argent dans l'application et l'envoi hors d'elle ; ou porter l'envoi sur l'offre (le plus complet, mais touche la machinerie d'enveloppes de mes-collectes.js) |
| **R4** | Qui voit le rab, et où ? | Les relecteurs | Tous les membres, sur la page du billet |
| ~~R5~~ | ~~Le numéro de série : facultatif ou obligatoire dans la mise en vente ?~~ **Répondue le 14/09 : facultatif** | Jean-Philippe | — |
| **R6** *(ajoutée l'après-midi)* | **L'attribution directe** : le collecteur peut-il faire devoir une vente du rab à un membre **sans action de ce membre**, comme Jean-Philippe le demande ? Ça revient sur Q5, décidée avec Cyril le 09/09 — mais Q5 reposait sur un précédent inexact : « Inscrire un membre » le permet déjà pour les inscriptions | Cyril | **Oui**, avec notification au membre et annulation possible par le collecteur tant que la vente n'est pas réglée. S'aligner sur ce qu'un collecteur fait déjà plutôt que d'imposer au rab une règle que le reste de l'application ne suit pas |

~~R1 et R2 sont à trancher avant de valider : R1 change ce que les relecteurs valident, R2 ce qui
sera construit.~~ **Mis à jour l'après-midi : R2 et R6 sont à trancher avant de valider**, toutes
deux par Cyril — R6 change ce que les relecteurs valident, R2 ce qui sera construit. R3 et R4
peuvent l'être au moment du dev.

## Réalisation

*(à compléter après dev : fichiers touchés + commit)*

---

*Spec du 2026-09-09, issue du cadrage commun #22/#1, reprise le 10/09 puis le 14/09. Aucune ligne
de code écrite : la demande est en analyse jusqu'à sa validation par un admin sur la fiche.*
