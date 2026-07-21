# Demande #15 — Champ « Ordre du chèque » dans mes contacts

- **Épic :** Corrections et évolutions
- **Demande :** #15 · basse / S · membres · Mes contacts
- **Statut :** À tester · **Commit :** `5572556`

## Contexte

> Ajouter un champ « Ordre du chèque » dans mes contacts.
> (Migration : colonne contacts_collecteur + champ modale + affichage carte.)

## Décisions

- **Migration** : `contacts_collecteur.ordre_cheque TEXT`
  (`scripts/migration-demande-15-ordre-cheque.sql`). Carnet privé du membre, RLS inchangée.
- Champ « Ordre du chèque » dans la modale création/édition, affiché sur la carte
  (« Ordre : … »), inclus dans la recherche et l'export CSV.

## Réalisation

- `mes-contacts.html` (champ modale + style carte), `mes-contacts.js`
  (payload, prefill, carte, recherche, export CSV), `sw.js` (`billets-v250`),
  `scripts/migration-demande-15-ordre-cheque.sql`. Commit `5572556`.
