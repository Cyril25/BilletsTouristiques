# Demande #86 — en clair

> **Pour qui ce document est écrit.** Pour vous, collecteur ou admin, qui relancez les membres
> qui n'ont pas encore payé. Aucune connaissance technique n'est nécessaire.
> Reflète la version technique du commit `fcfd987` (21/10/2026).

## Ce qui a été demandé

Sébastien ne pouvait pas relancer des frais de port impayés. Dans « Mes collectes » →
« Vérification paiement », l'écran affichait bien deux frais d'envoi en attente, mais les boutons
« Récapitulatif global » et « Relancer individuellement » répondaient « Aucun impayé ».

## Pourquoi ça arrivait

Ces deux boutons ne regardaient que les **billets** impayés. Les frais d'envoi que vous avancez, et
les compléments de prix (quand le prix d'une collecte augmente après coup), étaient oubliés. Chez
Sébastien, ce jour-là, il n'y avait que deux frais d'envoi de 10,94 € : les boutons ne voyaient
donc rien.

## Ce qui change

Les deux boutons comptent désormais **tout ce que l'écran compte**.

- **Relancer individuellement** : Marie doit 10,00 € de billets, 2,20 € de frais d'envoi et 1,50 €
  de complément de prix. Son message liste les trois lignes, et « Total dû : 13,70 € » — le même
  total que celui affiché pour elle à l'écran. Le lien PayPal prend ce montant.
- **Récapitulatif global** : chaque membre a sa ligne avec son total, et le détail quand il doit
  autre chose que des billets, par exemple « DUPONT Marie → 13,70 € (dont 2,20 € de frais d'envoi,
  1,50 € de complément de prix) ». Quand personne ne doit de billet, la liste « Billets à payer »
  n'apparaît plus du tout, au lieu d'être vide.
- Le message de relance commence par « je me permets de te relancer concernant tes paiements en
  attente » au lieu de « tes inscriptions en attente de paiement », qui ne collait plus quand on
  ne relance que des frais d'envoi.

## Ce qui ne change pas

- **Ce que vous devez au membre** (un avoir, quand un prix baisse) n'apparaît pas dans la relance :
  c'est vous qui devez, et l'écran le traite déjà à part.
- Un membre qui a **déclaré** avoir payé reste dans la relance, comme avant pour les billets.
- La relance d'**une** collecte (bouton sur la collecte) ne change pas : des frais d'envoi ne
  dépendent pas d'un billet.

## Ce sur quoi on vous demande de vous prononcer

- Sébastien : avec tes deux frais d'envoi de 10,94 €, les deux boutons te montrent-ils bien les
  deux membres concernés, avec le bon montant ?
- Faut-il **retirer de la relance** les membres qui ont déclaré avoir payé et attendent votre
  vérification ? Ce n'était pas demandé, on n'y a pas touché.
