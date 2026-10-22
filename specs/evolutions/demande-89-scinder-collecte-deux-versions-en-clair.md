# Demande #89 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui créez les collectes. Aucune
> connaissance technique n'est nécessaire.
> Reflète la version technique du commit `89c3e83` (22/10/2026).

## Ce qui a été demandé

Cyril, à partir du billet **Lapalisse** (UEQX 2026-8). Une pré-collecte avait été ouverte pour les
deux versions, la normale et la dorée. Puis on s'est rendu compte que la dorée n'était pas encore
disponible, et une **seconde collecte**, pour la version normale seulement, a été créée pour Damien.

Ce n'est pas ce qu'il aurait fallu faire : il aurait fallu **couper la pré-collecte en deux**, une
collecte pour les normaux (qui ouvre tout de suite) et une pour la dorée (qui attend). D'où la
demande : quand on crée une collecte pour une version déjà couverte par une collecte en cours, le
site doit proposer de **scinder** la collecte existante plutôt que d'en créer une nouvelle.

## Ce que ça a coûté à Lapalisse

Ce matin, à une minute d'écart :
- « Collecte 2026 », pour les deux versions, en pré-collecte : **12 membres pré-inscrits**, pour
  17 normaux et 11 dorés ;
- « Collecte Normale », de Damien, ouverte à 3,20 € : 7 inscrits, 13 normaux, dont 6 ont déjà
  déclaré ou réglé leur paiement.

Le site n'inscrit jamais automatiquement deux fois un membre à la même version. Les 12 pré-inscrits
**n'ont donc pas été inscrits à la collecte de Damien**. Leurs **17 normaux sont réservés dans une
pré-collecte qui ne s'ouvrira jamais pour eux**. Un seul d'entre eux s'est inscrit chez Damien de
lui-même.

## Ce qui est proposé

**À la création d'une collecte**, quand on choisit « normaux seulement » (ou « variantes
seulement ») et qu'une collecte « les deux versions » est en cours sur le billet, une fenêtre
demande :

> **« Collecte 2026 » couvre déjà les deux versions.**
> 12 inscrits — 17 normaux, 11 dorés.
> - **Scinder « Collecte 2026 »** : les 17 normaux passent dans la nouvelle collecte, les 11 dorés
>   restent dans « Collecte 2026 », qui devient « dorés seulement ».
> - **Créer une collecte à part** : les 12 pré-inscrits ne seront pas inscrits à la nouvelle.
> - Annuler

Si on choisit de scinder, avec la même fiche que d'habitude (collecteur, prix, dates…) :
- la nouvelle collecte « normaux » est créée, et chaque membre y retrouve ses normaux ;
- « Collecte 2026 » ne garde que les dorés, et reste en pré-collecte jusqu'à ce qu'ils arrivent ;
- un membre qui n'avait pris que des normaux n'est plus inscrit à « Collecte 2026 » ;
- chaque membre voit désormais deux inscriptions au billet dans « Mes inscriptions », une par
  collecte.

Un bouton **« Scinder »** apparaîtra aussi dans la liste des collectes d'un billet, mais **seulement
sur une collecte qu'on peut vraiment scinder** : une collecte « les deux versions », en cours, où
personne n'a encore payé. Ailleurs, il n'y a pas de bouton, pour ne pas brouiller la lecture
(précision de Cyril, 21/10).

Quand on scinde, **le plafond** de la collecte (nombre maximum de billets), s'il y en a un, est
recopié sur les deux collectes. Les membres **ne reçoivent pas de message** : c'est juste une
collecte qui est scindée.

**Garde-fou** : on ne scinde qu'une collecte où personne n'a encore payé, déclaré un paiement, ni
reçu un billet. En pratique, une pré-collecte.

## Ce qui ne change pas

- Créer une collecte à part reste possible.
- Une collecte « normaux seulement » ou « variantes seulement » ne se scinde pas : il n'y a rien à
  couper.

## Lapalisse, aujourd'hui

Même une fois la scission développée, Lapalisse demandera une réparation à la main, puisque la
collecte de Damien existe déjà. Deux possibilités :
- **(a)** inscrire les 11 pré-inscrits qui ne sont pas chez Damien à sa collecte, avec leurs
  normaux. Ils lui devront 3,20 € par billet, comme s'ils avaient été inscrits automatiquement.
- **(b)** ne pas les inscrire : ils le feront eux-mêmes s'ils le veulent (on peut les prévenir).

Dans les deux cas, « Collecte 2026 » ne garde ensuite que les dorés.

**C'est fait, le 21/10, selon (a)** (décision de Cyril). Les 11 membres sont inscrits à la
collecte de Damien avec leurs 16 normaux. Le membre qui y était déjà garde son inscription.
« Collecte 2026 » est désormais une pré-collecte des dorés seulement : 10 membres, 11 dorés. Les
membres n'ont pas reçu de message.

Un détail est apparu en développant la scission : en faisant cette réparation, le site a noté les
9 pré-inscriptions automatiques restées dans « Collecte 2026 » comme des inscriptions faites à la
main. Ça ne se voit pas à l'écran, mais il refuserait par exemple de supprimer cette pré-collecte.
Un petit script, joué par Cyril avec la mise en service, les remet en ordre. La scission, elle, ne
fera pas cette erreur.

## Ce sur quoi on vous demande de vous prononcer

1. ~~**Lapalisse** : (a) ou (b) ?~~ Tranché : (a), fait le 21/10.
2. ~~**Quand peut-on scinder ?**~~ Tranché par Cyril : seulement une collecte sans aucun paiement.
3. ~~**Prévenir les membres ?**~~ Tranché : non.
4. ~~**Le plafond ?**~~ Tranché : recopié sur les deux collectes, dans un premier temps.
5. ~~**Qui peut scinder ?**~~ Tranché par Cyril : les admins seulement.
6. ~~**Un bouton « Scinder » ?**~~ Tranché : oui, seulement sur les collectes qu'on peut scinder.

## Où on en est (22/10)

**C'est en service.** Le bouton « Scinder » et la question posée à la création d'une collecte sont
sur la page de chaque billet, dans Gestion Billets, et Cyril a mis en service la partie base de
données le 22/10. Lapalisse est en ordre : « Collecte Normale » pour les normaux de Damien,
« Collecte Dorés » pour les dorés, en pré-collecte. La demande est à tester.

## Les demandes liées

- **#87** (un bouton « Partager » par collecte) et **#88** (les collectes en cours toujours
  visibles) : une collecte scindée en produit justement deux. Elles passent avant, ou avec.
- **#83** (envoyer les normaux et les variantes séparément) : si on peut scinder une collecte déjà
  ouverte, deux collectes suffisent pour envoyer les normaux d'abord. #83 pourrait alors devenir
  inutile.
