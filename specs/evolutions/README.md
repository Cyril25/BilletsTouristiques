# Épic — Corrections et évolutions

Épic « fourre-tout » qui regroupe les corrections et petites/moyennes évolutions
issues des **demandes d'amélioration** (table `demandes`, écran `admin-demandes.html`),
par opposition aux gros chantiers structurants qui ont leur propre épic/PRD.

## But

Avant de développer une demande passée en **Prêt à dev**, on rédige ici une courte
spec (contexte, analyse/décisions, critères d'acceptation). Une fois développée, on
complète la section **Réalisation** (fichiers touchés + commit). Ça permet de :

- ne pas partir en dev sans avoir un minimum analysé la demande ;
- garder la trace de ce qui a été **spécifié** et **fait**, et de faire le lien
  demande ↔ spec ↔ commit si on doit corriger plus tard.

## Convention

- Un fichier par demande : `demande-<id>-<slug>.md`.
- Le numéro de demande fait le lien avec la table `demandes` (et l'écran admin-demandes).
- Après dev, la demande passe en `a_tester` (voir la convention de traitement des demandes).

## Demandes de complexité « L »

Les demandes estimées **L** sont de gros chantiers : elles ne se traitent jamais « au fil de l'eau »
avec les S/M, et **on n'attaque pas le dev directement**. Marche à suivre :

1. Passer la demande au statut **En cours** (`etat=en_cours`) : le chantier est ouvert, mais en phase d'analyse.
2. Rédiger une **spec détaillée** (nettement plus poussée que pour une S/M), en **posant les questions
   nécessaires** au porteur du projet plutôt qu'en faisant des hypothèses implicites.
3. Utiliser la **méthode BMAD** (PRD, architecture, epics/stories, brainstorming…) si l'ampleur du
   chantier le justifie ; sinon une spec longue dans ce dossier suffit.
4. **Ne démarrer le développement qu'une fois l'analyse considérée comme terminée d'un commun accord.**

## Demandes rattachées

| Demande | Titre | Complexité | Statut | Spec | Commit |
|---|---|---|---|---|---|
| [#5](demande-5-signalement-erreur-billet.md) | Signaler une erreur sur un billet + boîte aux lettres admin | L → M | À tester | ✅ | — |
| [#16](demande-16-refonte-collectes.md) | Refonte collectes : découplage billet ↔ collecte (epic 13 v2) | L | En cours (analyse terminée ✅ — ready for dev) | ✅ | — |
| [#2](demande-2-drapeau-filtre-pays-membres.md) | Drapeau + filtre/compteur par pays (Gestion Membres) | M | À tester | ✅ | `7592acc` |
| [#3](demande-3-bouton-facebook-carte-billet.md) | Bouton Facebook sur la carte billet (admin) | S | À tester | ✅ | `7592acc` |
| [#4](demande-4-somme-due-menu.md) | Somme due dans la barre de menu (membre) | M | À tester | ✅ | `7592acc` |
| [#7](demande-7-export-csv-nom-totaux.md) | Export CSV : nom de fichier (amorce/millésime) + ligne totaux | S | À tester | ✅ | `00ba372` |
| [#8](demande-8-recap-amorce-millesime.md) | Amorce + millésime dans le récap individuel | S | À tester | ✅ | `00ba372` |
| [#9](demande-9-preference-terminaisons.md) | Préférence profil « terminaisons souhaitées » | M | À tester | ✅ | `00ba372` |
| [#10](demande-10-paiements-declares-en-tete.md) | Paiements déclarés en tête (Vérification paiement) | S | À tester | ✅ | `25ddee1` |
| [#11](demande-11-historique-paiements-valides.md) | Historique des paiements validés (date de validation) | M | À tester | ✅ | `25ddee1` |
| [#12](demande-12-bug-date-precollecte.md) | Bug : date pré-collecte en sortant de « Masqué » | S | À tester | ✅ | `25ddee1` |
| [#14](demande-14-archivage-collectes-reparties.md) | Archiver les collectes réparties (section repliable) | M | À tester | ✅ | `5572556` |
| [#15](demande-15-ordre-cheque-contacts.md) | Champ « Ordre du chèque » dans mes contacts | S | À tester | ✅ | `5572556` |
| [#19](demande-19-selection-multiple-envois-recus.md) | Sélection multiple + choix statut distribué/reçu (historique envois) | S | À tester | ✅ | `9d4786e`, `d6dbf0b` |
| [#20](demande-20-annuler-paiement-confirme.md) | Annuler un paiement confirmé (+ refus déclaration existant) | S | À tester | ✅ | `f4b5cce` |
| [#23](demande-23-mode-vacances-profil.md) | Mode « vacances / absent » sur le profil + badge collecteur | M | À tester | ✅ | `e4dde41` |
| [#24](demande-24-collecte-nb-max.md) | Plafond de billets sur une collecte supplémentaire | M | À tester | ✅ | `87156d1` |
| [#25](demande-25-envoi-mode-adresse-prix-auto.md) | Mode d'envoi selon l'adresse + prix auto à l'expédition | M | À tester | ✅ | `eea5267` |
| [#26](demande-26-ecran-stats-admin.md) | Écran de statistiques (admin) | M | À tester | ✅ | `8660c38` |
| [#27](demande-27-vacances-date-fin.md) | Date de fin optionnelle sur le mode vacances | M | À tester | ✅ | `5613657` |
| [#28](demande-28-notifications-membres.md) | Notifications « nouveautés » pour tous les membres + page dédiée | M | À tester | ✅ | `f3a2710` |
| [#29](demande-29-tag-cible-notifications.md) | Badge de cible sur les cartes de nouveautés | S | À tester | ✅ | `0d92625` |
| [#30](demande-30-pagination-notifications.md) | Pagination de la page Nouveautés | S | À tester | ✅ | `d8ab13b` |
