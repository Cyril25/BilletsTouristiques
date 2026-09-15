# Demande #71 — en clair

> **Pour qui ce document est écrit.** Pour vous, collecteur ou admin, qui devez dire si ce qui est
> prévu correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit 7b52bdc (15/09/2026).

## De quoi il s'agit

En haut de « Mes collectes », il y a des onglets : Mes collectes, Vérification paiement, Préparation
des envois, Historique des envois, Liste noire. En arrivant sur la page, **seul « Mes collectes »
affichait un chiffre**. Celui de « Vérification paiement » ou de « Préparation des envois »
n'apparaissait qu'après avoir cliqué dessus. Un membre qui venait de déclarer un paiement passait donc
inaperçu. C'était pareil sur ordinateur et sur téléphone.

## Ce qui change, sur un exemple

Sébastien ouvre « Mes collectes ». Depuis sa dernière visite, Marie a déclaré avoir payé deux billets,
et trois enveloppes attendent d'être préparées. Sans rien toucher, il voit :

- **Vérification paiement 2** — les deux paiements de Marie à confirmer ;
- **Préparation des envois 3** — les trois enveloppes.

Il clique sur « Vérification paiement » : le chiffre ne bouge pas, ce sont bien les deux mêmes. Il
confirme les deux paiements : **le chiffre disparaît**. Avant, il restait affiché jusqu'à ce qu'on
recharge la page.

## Ce qui a été décidé, et pourquoi

- **Le chiffre dit ce qui attend une action, pas ce qui est « nouveau ».** Un paiement déclaré compte
  tant qu'il n'est pas confirmé, même si vous l'avez déjà vu la veille. C'est ce que faisait déjà le
  chiffre une fois l'onglet ouvert : il est simplement affiché plus tôt.
- **Pas de chiffre sur « Historique des envois ».** Sébastien le citait, mais cet onglet n'en a jamais
  eu : le nombre qu'on y voit est écrit à l'intérieur, en titre. C'est une archive, il n'y a rien à y
  faire ; un chiffre qui grossit à chaque envoi attirerait l'œil pour rien. *(Décision de Cyril.)*
- **Les compléments de prix déclarés comptent aussi.** Quand le prix d'une collecte change, un membre
  peut devoir un complément ; s'il déclare l'avoir payé, c'est un paiement à confirmer comme un autre.
  Il n'était pas compté jusqu'ici.
- **« Préparation des envois » compte les enveloppes que vous voyez.** Il comptait aussi, sans les
  montrer, des enveloppes qui ne contenaient aucun billet ; il pouvait même afficher un chiffre au-dessus
  de « Aucune enveloppe en cours ».
- **Arriver sur la page ne modifie rien.** L'onglet « Préparation des envois », quand on l'ouvre, range
  un peu : il crée l'enveloppe d'un membre qui n'en a pas encore, il retire les enveloppes vides. Le
  chiffre affiché à l'arrivée est déjà celui d'après ce rangement, mais le rangement lui-même attend
  toujours qu'on ouvre l'onglet.
- **La page ne doit pas être plus lente.** La liste des collectes s'affiche d'abord, les chiffres
  arrivent juste après.

## Ce qui ne change pas

- Les chiffres ne se mettent pas à jour tout seuls pendant que la page est ouverte : un paiement
  déclaré pendant ce temps apparaît quand on revient à la liste ou qu'on recharge la page.
- Pas de chiffre dans le menu général du site.

## Ce sur quoi on vous demande de vous prononcer

- En arrivant sur « Mes collectes », **voyez-vous tout de suite** qu'un paiement ou une enveloppe vous
  attend ?
- Le chiffre d'un onglet **est-il le même** avant et après avoir cliqué dessus ?
- Sur téléphone, les onglets avec leurs chiffres **restent-ils lisibles** ?
