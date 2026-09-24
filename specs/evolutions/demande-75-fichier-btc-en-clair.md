# Demande #75 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `99b81c4` (24/09/2026).

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

1. **Lire tout le catalogue btc.** Environ 1 h 30 pour les fiches, 2 h 30 de plus pour les photos
   (1 Go). Le rythme est volontairement lent pour ne pas gêner le site. Cyril lance l'opération
   lui-même, une fois cette analyse validée.
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

**Et six questions, surtout pour Cyril :**

1. **Un billet sans Anniversary chez btc, est-ce un billet « sans variante » ?** Proposition :
   **non, pas tout de suite**. On ne propose rien pour ces billets. btc ne note peut-être pas les
   dorés, et conclure « sans variante » pourrait fermer par erreur les inscriptions en doré d'un
   billet.
2. **Comment btc signale-t-il un doré ?** Nous n'avons rien vu sur 10 billets. Proposition : chercher
   le mot dans les 5 500 fiches une fois le catalogue lu.
3. **« Anniversary 2020 » et « Anniversary 10 years »** : proposition, les deux comptent comme
   *anniversaire* chez nous.
4. **Garder le numéro btc sur nos fiches billets**, pour un lien direct vers btc ? Proposition :
   oui, mais dans une demande à part, car c'est un changement de notre base.
5. **Utiliser chez nous le tirage, les GPS, la cote ou les photos** (par exemple pour les billets
   qui n'ont pas de photo) ? Proposition : demande à part, et pour les photos, se poser d'abord la
   question des droits.
6. **Le réimport de la collection de Cyril** (ce qu'il possède sur btc vers sa collection chez nous) ?
   Proposition : demande à part, car c'est un autre fichier et une autre partie du site.

Les questions 1 à 3 changent ce que l'import proposera : **mieux vaut que Cyril y ait répondu avant
de valider.**
