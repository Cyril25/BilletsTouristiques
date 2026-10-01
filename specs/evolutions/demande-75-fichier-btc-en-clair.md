# Demande #75 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `e2127b4` (24/09/2026).

## De quoi il s'agit

Le site **billets-touristiques.com** (on l'appellera « btc ») recense presque tous les billets
0 € : environ **5 500**, avec pour chacun le tirage, les séries Anniversary, l'éditeur, les lieux de
vente, la cote et les photos. Cyril y est abonné.

Notre base a encore beaucoup de billets dont on ne sait pas s'ils ont une variante (anniversaire ou
doré). La **demande #66** a déjà construit l'outil qui compare un fichier venu d'ailleurs avec notre
base et vous laisse accepter ou refuser chaque correction. Il lui manquait un vrai fichier.
**La 75 fabrique ce fichier à partir de btc.**

btc ne propose aucun export utile : seulement un PDF de 5 colonnes. On lit donc le site page par page,
avec le compte de Cyril, lentement, pour son usage personnel.

## Ce qui a déjà été fait (23-24 septembre)

Ce travail s'est fait en direct avec Cyril, en dehors des demandes. D'où ce document, écrit après coup.

**Un outil sur le poste de Cyril** lit le catalogue btc et produit un classeur Excel, avec les photos à
côté. **Il a été essayé sur 10 billets** (5 de France, 5 de Slovénie). Pour chacun, on obtient :

- **ce qui permet de le reconnaître** : son numéro chez btc, son amorce et son millésime ;
- **où il se trouve** : pays, ville, et même les **coordonnées GPS** du lieu, que btc n'affiche pas
  sur la fiche mais utilise pour sa carte ;
- **le billet lui-même** : titre, disponible ou épuisé, tirage (« 5 000 exemplaires »), séries
  Anniversary, description ;
- **autour du billet** : éditeur, où l'acheter, remarques, cote (« moyenne des prix = 3,30 € »),
  catégories ;
- **les photos** recto et verso.

**Et les 10 billets existent tous chez nous, sous la même référence.** Un exemple parlant : la
*Cathédrale de Laon 2025-2* a, selon btc, une série « Anniversary 10 years ». Chez nous, sa variante
est « non renseignée ». Une fois le fichier passé dans l'outil de la 66, ce billet arrivera tout seul en
« à compléter : anniversaire ».

## Ce qui est prévu ensuite

1. **Lire tout le catalogue btc**, environ 3 h, volontairement lentement pour ne pas gêner le site.
   ~~Les photos aussi~~ : **pas pour le moment**, a décidé Cyril le 24/09. On ne prendra plus tard que
   celles qui manquent chez nous.
2. **Faire un essai à blanc** dans l'outil de la 66, sans rien modifier. On saura combien de billets
   sont identiques, à compléter, en contradiction, inconnus chez nous ou illisibles. Ces chiffres
   seront ajoutés ici.
3. **L'import pour de vrai.** Les corrections sûres se font seules, comme prévu par la 66. Le reste
   arrive dans « Vérification des billets », où **vous acceptez ou refusez**.

## Ce qui est volontairement exclu

- **On ne compare que ce que la 66 compare** : la version normale et la variante. Le tirage, les
  GPS, la cote ou les photos sont dans le fichier, mais ne modifient rien chez nous.
- **Rien de btc n'est republié sur notre site.** Les photos, en particulier, appartiennent à btc ou aux
  éditeurs.
- **Le fichier ne quitte pas le poste de Cyril** : il n'entre jamais dans le code du site, comme
  pour tout fichier de données (demande #67).
- **Pas de réimport de la collection** de Cyril depuis btc : c'est un autre besoin (voir plus bas).

## Ce sur quoi on vous demande de vous prononcer

**Le principe** : fabriquer ce fichier à partir de btc pour le passer dans l'outil de la 66. Est-ce
bien ce qu'on veut ?

**Trois questions ont reçu la réponse de Cyril le 24 septembre :**

1. ~~Un billet sans Anniversary chez btc, est-ce un billet « sans variante » ?~~ ~~**Non** : btc ne
   suit pas les dorés, donc un billet sans Anniversary peut très bien avoir un doré. On ne propose rien
   pour ces billets.~~ **Revu le 1er octobre : oui jusqu'en 2024, non pour 2025-2026.** Chez nous, aucun
   doré n'existe avant 2025 : avant, « pas d'Anniversary » veut bien dire « pas de variante ».
2. ~~Comment btc signale-t-il un doré ?~~ **Il ne le signale pas.** Les dorés ne se corrigeront
   donc pas à partir de btc.
3. ~~« Anniversary 2020 » et « Anniversary 10 years » ?~~ **Les deux sont des « anniv »** chez nous.
   Le fichier a maintenant une colonne « Variante » qui vaut *anniv* ou reste vide.

**Il en reste quatre :**

4. **Garder le numéro btc sur nos fiches billets**, pour un lien direct vers btc ? Proposition :
   oui, mais dans une demande à part, car c'est un changement de notre base.
5. **Utiliser chez nous le tirage, les GPS, la cote ou les photos** (par exemple pour les billets
   qui n'ont pas de photo) ? Proposition : demande à part, et pour les photos, se poser d'abord la
   question des droits.
6. **Le réimport de la collection de Cyril** (ce qu'il possède sur btc vers sa collection chez nous) ?
   Proposition : demande à part, car c'est un autre fichier et une autre partie du site.
7. ~~Les annonces des membres de btc : pour quoi faire ?~~ **Réglée**, voir la partie suivante.

## Nouveau (24 septembre) : les annonces des membres de btc

Cyril a demandé trois fichiers en plus : la liste des **pseudos** des membres de btc, **qui propose
quoi** et **qui cherche quoi**. Chaque billet a sur btc une page qui le dit, avec pour chaque
annonce le numéro du billet, vente ou échange, le prix, un commentaire, et la date de fin
d'abonnement du membre.

**L'outil est prêt, mais il n'a pas été lancé.** Ces fichiers ne parlent plus de billets : ils
parlent de **personnes**, plusieurs milliers de collectionneurs qui ne sont pas membres chez nous.
Ils ont publié leurs annonces pour les autres membres de btc, pas pour qu'on en fasse une liste
ailleurs. Ce qu'il est raisonnable d'extraire dépend de **ce qu'on veut en faire** :

- **savoir quels billets circulent**, lesquels sont recherchés et à quel prix → les annonces **sans
  les pseudos** suffisent ;
- **trouver un billet qui manque à Cyril**, ou quelqu'un à qui proposer ses doubles → btc le fait déjà,
  billet par billet ;
- **faire une liste de collectionneurs à contacter** → à déconseiller : c'est justement l'usage
  auquel ces personnes n'ont pas consenti.

**Réponse de Cyril (24 septembre)** : c'est pour trouver avec qui échanger. D'un côté, qui propose
des billets qu'il n'a pas ; de l'autre, qui cherche des billets qu'il a. C'est le principe même de btc,
simplement plus facile à lire. Il fera lui-même le rapprochement avec sa collection à partir des
trois fichiers. Rien n'entre dans notre base, et chaque contact se fait sur btc, un par un.

Les questions 1 à 3 avaient la plus forte influence sur ce que l'import proposera, et elles sont
réglées. **L'analyse peut être validée pour les billets.** La question 7 est réglée elle aussi.

## Deux précisions du 24 septembre

**Des Anniversary sont bien proposées, btc ne le dit simplement pas.** Dans les propositions, btc
n'affiche que le numéro. Mais les Anniversary sont numérotées dans une plage connue (par exemple de
4001 à 5000). En regardant le numéro, on retrouve **12 Anniversary sur 24 propositions** des deux
billets concernés de l'essai. Le fichier le signale dans une colonne à part : c'est une déduction, pas
une information de btc.

**Les adresses mail des membres de btc : non.** btc ne les montre pas, et c'est voulu : on les contacte
par sa messagerie. Aller les chercher autrement reviendrait à contourner la protection que ces
membres ont choisie en s'inscrivant. Le fichier donne, pour chacun, un lien qui ouvre directement le
formulaire de message.

## Le plan de mise à jour des variantes (1er octobre)

**Le but** : compléter les **5 144 billets** dont on ne sait pas s'ils ont une variante, sans rien casser.

**Ce qu'on fera, billet par billet :**

| Chez nous | Chez btc | Ce qu'on fait | Combien |
|---|---|---|---|
| on ne sait pas | Anniversary | **anniversaire** | environ 1 530 |
| on ne sait pas | rien, billet de **2015 à 2024** | **pas de variante** (pas de doré avant 2025) | environ 3 100 |
| on ne sait pas | rien, billet de 2025 ou 2026 | on ne touche pas : c'est peut-être un doré | environ 170 |
| pas de variante | Anniversary | **anniversaire**, après accord d'un admin | 2 |
| doré | Anniversary | **on laisse doré** | 4 |
| déjà renseigné | rien | on ne touche jamais | — |
| inconnu de btc, ou en double | — | on ne touche pas | environ 340 |

Soit **environ 4 630 billets complétés sur 5 144**.

**On ne touche qu'aux billets, et seulement à leur variante.** Ni les collectes, ni les inscriptions, ni
les paiements ne sont modifiés.

**Les précautions, dans l'ordre :**

1. un **essai à blanc** sur la vraie base, qui ne modifie rien et doit retrouver les chiffres ci-dessus ;
2. une **répétition générale** sur une copie de la base, avec le **retour arrière** essayé ;
3. une **sauvegarde complète** de la base juste avant, et une copie des variantes de tous les billets ;
4. l'import **par petits lots** : une cinquantaine de billets d'abord, que Cyril vérifie sur le site, puis le
   reste ;
5. un **contrôle après chaque lot**.

Chaque correction garde la valeur d'avant : on peut revenir en arrière pour un billet ou pour tout un lot.

**Le risque accepté** : pour les billets de 2020 à 2022, btc a pu oublier une Anniversary (il en oublie une
sur dix en 2025). Une cinquantaine de billets pourraient être marqués « pas de variante » à tort. Ce sont de
vieux billets presque tous sans inscription : on pourra les corriger dans leur fiche.

**Plus tard : les alertes.** Une ligne dans « Qualité des billets » qui dira « attention, quelque chose
cloche », avec la raison et le lien vers le billet sur btc : billet peut-être doré, version à corriger,
billets à fusionner, billet à créer, série spéciale à vérifier… C'est un petit développement à part.
