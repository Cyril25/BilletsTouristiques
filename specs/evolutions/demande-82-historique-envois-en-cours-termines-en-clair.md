# Demande #82 — en clair

> **Pour qui ce document est écrit.** Pour vous, collecteur, qui suivez vos envois dans « Mes
> collectes ». Aucune connaissance technique n'est nécessaire.
> Reflète la version technique du commit `4eeeff9` (21/10/2026).

## Ce qui a été demandé

Sébastien : dans l'historique des envois, séparer les envois **en cours** des envois **terminés**,
en deux sections. Jusqu'ici, tout était dans une seule liste, du plus récent au plus ancien, et il
fallait lire le badge de chaque envoi pour savoir où il en était.

## Ce qui change

Dans « Mes collectes » → onglet « Historique des envois », la liste est coupée en deux :

- **En cours** : les envois expédiés dont le membre n'a pas encore confirmé la réception. Par
  exemple, l'enveloppe envoyée à Marie le 20/10, encore « Pas de retour », et celle de Luc, que La
  Poste donne pour « Distribuée » le 17/10 mais que Luc n'a pas encore confirmée.
- **Terminés** : les envois reçus. Par exemple, celle de Paul, reçue le 19/10.

Chaque section a son nombre d'envois dans son titre, et reste classée du plus récent au plus
ancien. Une section vide n'apparaît pas.

## Ce qui ne change pas

- La **recherche** cherche dans les deux sections. Si elle ne trouve que des envois reçus, seule
  la section « Terminés » s'affiche.
- Les **cases à cocher** et le bouton « Marquer comme reçu / distribué » marchent comme avant. Les
  cases n'existaient déjà que sur les envois pas encore reçus : elles sont donc toutes dans
  « En cours ». Un envoi marqué reçu passe aussitôt dans « Terminés ».
- Le nombre total d'envois, le **total payé** et l'**export CSV** portent toujours sur tous les
  envois.
- Côté membre, l'onglet « Mes envois » séparait déjà ses envois : on n'y touche pas.

## Ce sur quoi on vous demande de vous prononcer

- **Un envoi « distribué » est rangé dans « En cours »** : La Poste l'a livré, mais le membre n'a
  pas confirmé. Si pour vous il est terminé, dites-le : c'est un réglage d'une ligne.
- La section « Terminés » va grandir avec le temps. Faut-il pouvoir la **replier** ? Ce n'était pas
  demandé.
