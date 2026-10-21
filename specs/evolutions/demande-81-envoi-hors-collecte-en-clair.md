# Demande #81 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin ou collecteur, qui allez relire cette
> analyse avant qu'on la développe. Aucune connaissance technique n'est nécessaire.
> Reflète la version technique du commit `5e13fa6` (21/10/2026).

## Ce qui a été demandé

Sébastien vend ou échange des billets **en dehors des collectes**, et les envoie par la poste à des
membres du site. Il voudrait suivre ces envois dans le site, comme les envois de collecte : avec le
destinataire, le numéro de suivi, le prix du port, et les billets qu'il y a dedans. Il a précisé en
commentaire :
- les billets se choisissent dans le catalogue, pour que le contenu de l'enveloppe soit clair ;
- le port doit être réclamé au membre, dans les paiements à vérifier et les relances, comme pour
  une collecte ;
- le membre doit voir l'envoi de son côté et pouvoir en confirmer la réception ;
- seulement pour des membres du site.

## Ce qui est proposé

Dans « Mes collectes » → « Historique des envois », un bouton **« Nouvel envoi hors collecte »**.

> Exemple. Sébastien échange deux billets avec Paul : 1 UEBK 2026-14 normal et 1 FRAB 2025-3 en
> variante. Il clique sur le bouton, choisit Paul, cherche les deux billets dans le catalogue,
> indique leurs quantités, puis le mode d'envoi (Suivi), le numéro de suivi et le prix du port,
> 2,20 €. Il valide.

À partir de là, l'envoi vit **exactement comme un envoi de collecte** :
- il apparaît dans l'historique de Sébastien, dans « En cours », avec la mention « hors
  collecte » ;
- les 2,20 € de port apparaissent dans ses paiements à vérifier, et dans ses relances s'ils ne sont
  pas payés ;
- Paul le voit dans « Mes envois », avec ses deux billets ; il voit les 2,20 € dans ses frais
  d'envoi, peut déclarer les avoir payés, et peut confirmer la réception ;
- Sébastien le passe « distribué » puis « reçu » comme les autres.

Bonne nouvelle : tout ce qui concerne le port, les paiements, les relances et la réception existe
déjà. Ce qu'il faut construire, c'est **la liste des billets d'un envoi qui ne vient pas d'une
collecte**, et le formulaire pour la remplir.

## Ce qui ne change pas

- Les collectes, leurs inscriptions et leurs enveloppes ne bougent pas.
- Ces billets ne créent **aucune collecte** et n'apparaissent pas sur la carte du billet.
- Le **prix des billets** eux-mêmes n'est pas réclamé par le site : seul le port l'est (c'est ce qui
  a été demandé).

## Ce sur quoi on vous demande de vous prononcer

1. **Envoi à part ou dans la même enveloppe ?** La proposition crée un envoi séparé. Si ces billets
   partent souvent **dans la même enveloppe** que des billets de collecte, dites-le : il faudrait
   alors pouvoir les ajouter à l'enveloppe en préparation, ce qui est plus lourd. On le garderait
   pour un second temps.
2. **Le prix des billets** vendus reste réglé en dehors du site ? Seul le port passe par le site.
3. **Hors catalogue** : faut-il pouvoir écrire aussi un contenu libre (des jetons, un billet qui
   n'est pas au catalogue) ?
4. **Où mettre le bouton** : dans « Historique des envois » (proposé), ou dans « Préparation des
   envois » ?
5. **L'assurance** : pour un recommandé, faut-il pouvoir indiquer la valeur des billets envoyés ?
   Les billets hors collecte n'ont pas de prix dans le site.

Il vaut mieux avoir la réponse de Sébastien à la question 1 avant de valider : elle change la
taille du chantier.

## Comment ce serait fait

En deux étapes : d'abord la création de l'envoi et son détail côté collecteur, puis ce que voit le
membre dans « Mes envois ». Il faudra un changement dans la base, que Cyril jouera. Ce chantier
touche les mêmes écrans que la demande #83 (normaux et variantes dans des enveloppes
différentes) : les deux seront développées l'une après l'autre.
