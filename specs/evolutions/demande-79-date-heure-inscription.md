# Demande #79 — Date et heure d'inscription sur les collectes

- **Épic :** Corrections et évolutions (complexité **S**)
- **Demande :** #79 de la table `demandes` de production — Jean-Philippe, 2026-10-05, priorité
  *normale*. Publics cités : membres, collecteurs, admins.
- **Statut :** en cours (dev), lancé par Cyril le 2026-10-08.
- **Version en clair :** [demande-79-date-heure-inscription-en-clair.md](demande-79-date-heure-inscription-en-clair.md)

## Contexte (demande)

> sur les collectes peux tu ajouter la date et l heure de l inscription d'un membre

## Constat

- `inscriptions.date_inscription TIMESTAMPTZ NOT NULL DEFAULT NOW()` (migration 5-4) : posée à la
  création, jamais réécrite. Le recalcul des inscriptions automatiques (`recalculerAutoInscriptions`,
  `admin.js`) fait un upsert `merge-duplicates` **sans** cette colonne : une ligne existante garde
  sa date, une ligne créée prend l'heure du recalcul.
- Les deux tableaux d'inscrits ne l'affichent pas : détail d'une collecte dans « Mes collectes »
  (`renderCollecteDetail`) et fenêtre admin des inscriptions d'un billet
  (`renderInscriptionsModalContent`). « Mes inscriptions » affiche le **jour seul**
  (`toLocaleDateString`).
- Les trois écrans chargent déjà la colonne (`select=*`) : **aucune requête à ajouter, aucune
  migration**.

**Mesuré le 08/10 en production** (5 793 inscriptions, lecture seule des dates) :

- aucune sans date ; la plus ancienne est du 15/03/2026 ;
- **805 dans la même minute, le 31/03/2026 à 06:44 UTC** : la reprise de l'ancien fichier (le
  commit `8b57d49`, 27 minutes plus tard, range les fichiers de données d'inscriptions). **488** sur
  46 collectes « Terminé », **317 sur 26 collectes encore en « Pré collecte »** ;
- ensuite, des pics de 12 à 26 inscriptions dans une même minute : recalculs d'inscriptions
  automatiques ou imports ponctuels par billet (commande `import-inscriptions`).

## Décisions

1. **Une seule fonction**, `libelleDateInscription(iso)` dans `global.js` (§ 1d bis), appelée par
   les trois écrans : « 05/10/2026 à 08:13 », à l'heure locale du navigateur. C'est le format de
   `libelleHorodatage()` déjà utilisé dans « Mes collectes ».
2. **La reprise du 31/03** — fenêtre [06:44, 06:45[ UTC — s'affiche **« avant le 31/03/2026 »**. La
   vraie date de ces inscriptions est inconnue. Montrer l'heure de la reprise ferait croire à 805
   inscriptions simultanées ; sur les 317 encore en pré-collecte, ce serait fausser l'ordre
   d'arrivée, qui est justement ce qu'on regarde quand une collecte a un nombre limité (#24).
   Aujourd'hui déjà, « Mes inscriptions » leur affiche « 31/03/2026 ».
3. **Mes collectes** : colonne « Inscrit le » après « Adresse », avec son `data-label` pour la vue
   téléphone (une ligne « Inscrit le » dans la carte). Classe `td-date-inscription` : pas de retour à
   la ligne, même taille et même couleur discrète que l'adresse. Le `colspan` de la ligne de
   commentaire prend une colonne de plus.
4. **Fenêtre admin** : colonne « Inscrit le » après « Membre ».
5. **Mes inscriptions** : la date existante devient date et heure, par la même fonction.
6. **Tri inchangé** (nom puis prénom) : un tri par date n'est pas demandé.

## Hors périmètre

- Le récapitulatif « Vérification paiement » de « Mes collectes » garde le jour seul après le nom
  du billet.
- **Distinguer une inscription automatique d'une inscription faite par le membre** : aucune donnée
  fiable (`changed_by` est réécrit à chaque modification).
- **Les imports ponctuels par billet** se confondent avec un recalcul : ils portent l'heure de
  l'import.
- L'export CSV d'une collecte.

## Critères d'acceptation

1. « Mes collectes », détail d'une collecte : chaque inscrit montre « JJ/MM/AAAA à HH:MM » dans la
   colonne « Inscrit le » ; au téléphone, une ligne « Inscrit le » dans sa carte.
2. Fenêtre admin des inscriptions d'un billet : même colonne, dans chaque collecte.
3. « Mes inscriptions » : chaque carte affiche le jour et l'heure.
4. Une inscription de la reprise du 31/03 affiche « avant le 31/03/2026 » sur les trois écrans.
5. La ligne de commentaire d'un inscrit couvre toujours toute la largeur du tableau.
6. Mode sombre : la date reste lisible (même couleur que l'adresse, déjà vérifiée).

## Réalisation

*(à compléter après dev : fichiers touchés + commit)*
