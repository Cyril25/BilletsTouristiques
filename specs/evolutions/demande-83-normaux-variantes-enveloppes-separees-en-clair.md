# Demande #83 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin ou collecteur, qui allez relire cette
> analyse avant qu'on la développe. Aucune connaissance technique n'est nécessaire.
> Reflète la version technique du commit `d5a8953` (21/10/2026).

## Ce qui a été demandé

Jean-Philippe voudrait, dans « Mes collectes », pouvoir mettre dans l'enveloppe **les billets
normaux d'un membre sans ses variantes** (ou l'inverse). Aujourd'hui, il n'y a qu'une case par
membre : ses normaux et ses variantes partent toujours ensemble.

## Pourquoi c'est un gros morceau

Pour le site, l'inscription de Marie à une collecte (par exemple 2 normaux + 1 variante) est **un
seul objet**, rangé dans **une seule enveloppe**. Tout ce qui compte les billets s'appuie là-dessus :
le nombre de billets d'une enveloppe, sa valeur, le prix du port, l'historique des envois, ce que
Marie voit dans « Mes envois ». Séparer ses normaux de sa variante, c'est apprendre au site qu'une
même inscription peut être dans deux enveloppes à la fois, et le lui faire comprendre partout.

## Ce qui est proposé

**Par défaut, rien ne change.** Tant qu'on coche « tout » pour un membre, ses normaux et ses
variantes voyagent ensemble, comme aujourd'hui.

**Quand on veut séparer**, dans le détail d'une collecte, un membre qui a des normaux et des
variantes a deux cases au lieu d'une : **N** et **V**.

> Exemple. Marie a pris 2 normaux et 1 variante du billet UEAA. Les normaux sont arrivés, la
> variante pas encore. Jean-Philippe coche **N** : les 2 normaux vont dans l'enveloppe de Marie, la
> variante reste « à répartir ». Il expédie l'enveloppe. Trois semaines plus tard, la variante
> arrive : il coche **V**, elle va dans la nouvelle enveloppe de Marie, qui partira avec ses
> prochains billets.

Partout ailleurs, la séparation se voit :
- le détail de l'enveloppe montre « UEAA — 2 normaux », sans la variante ;
- le nombre de billets, la valeur et le prix du port de chaque enveloppe ne comptent que ce
  qu'elle contient vraiment ;
- dans « Mes envois », Marie voit le billet UEAA dans ses deux envois, « 2 normaux » dans le
  premier, « 1 variante » dans le second.

## Ce qui ne change pas

- **Le paiement** : Marie paie son inscription en une fois, comme aujourd'hui. Séparer concerne
  l'envoi, pas ce qu'elle doit.
- **Ses inscriptions** : dans « Mes inscriptions », elle voit toujours une seule inscription au
  billet UEAA.

## Une autre solution, sans rien développer

Pour les **prochains** billets dont on sait que les variantes arriveront à part, on peut déjà
ouvrir **deux collectes** sur le même billet : une pour les normaux, une pour les variantes. Le site
sait le faire depuis l'été. Chaque collecte a alors ses propres inscriptions, qu'on range
indépendamment. L'inconvénient : le membre doit s'inscrire deux fois. Et ça ne règle rien pour les
collectes déjà ouvertes.

## Ce sur quoi on vous demande de vous prononcer

1. **Le besoin** : Jean-Philippe, est-ce bien que les variantes arrivent plus tard que les normaux,
   et que tu veux envoyer les normaux sans attendre ? Ou y a-t-il un autre cas ?
2. **Le paiement** : on le garde en une fois pour normaux et variantes. D'accord ?
3. **Le port** : deux envois, c'est deux frais de port pour le membre. Est-ce acceptable ?
4. **Les collectes où le membre paie le port** (case « Envoyé » qui expédie tout de suite) :
   faut-il aussi pouvoir séparer dans ce cas, dès le départ ? Sinon, ce sera pour plus tard.
5. **Deux collectes** pour les prochains billets suffiraient-elles ? Si oui, le développement ne
   servirait qu'aux collectes déjà ouvertes, et on peut se demander s'il en vaut la peine.

Il vaut mieux avoir la réponse de Jean-Philippe aux questions 1 et 5 avant de valider.

## Comment ce serait fait

En trois étapes, dont la première ne change rien de visible (le site apprend à lire une inscription
« en deux morceaux », puis on vérifie qu'il se comporte exactement comme avant). Il faudra un
petit changement dans la base, que Cyril jouera. C'est un chantier conséquent : à ne pas mener en
même temps que la demande #81 (envoi libre), qui touche les mêmes écrans.
