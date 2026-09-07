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
| [#16](demande-16-refonte-collectes.md) | Refonte collectes : découplage billet ↔ collecte (epic 13 v2) | L | **Terminée** (prod 2026-09-06) | ✅ | merge `prepa-bascule-prod-16` (69 commits) |
| [#44 (prod)](demande-44-solde-membre-collecteur.md) | Solde membre ↔ collecteur après un changement de prix | L | **En cours** — analyse, 3 questions ouvertes | ✅ | — |
| [#22](demande-22-et-1-cadrage-doubles-et-vente.md) | Gestion des doubles : vendre et échanger entre membres | L | **En cours** — cadrage commun avec #1, 7 questions ouvertes | ✅ | — |
| [#1](demande-22-et-1-cadrage-doubles-et-vente.md) | Vente du rab / numéros spéciaux (collecteur) | L | **En cours** — cadrage commun avec #22, 7 questions ouvertes | ✅ | — |
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
| [#24](demande-24-collecte-nb-max.md) | Plafond de billets sur une collecte (initiale comprise) | M → S | À tester (repris le 2026-09-06) | ✅ | `87156d1` + `e27c519` |
| [#25](demande-25-envoi-mode-adresse-prix-auto.md) | Mode d'envoi selon l'adresse + prix auto à l'expédition | M | À tester | ✅ | `eea5267` |
| [#26](demande-26-ecran-stats-admin.md) | Écran de statistiques (admin) | M | À tester | ✅ | `8660c38` |
| [#27](demande-27-vacances-date-fin.md) | Date de fin optionnelle sur le mode vacances | M | À tester | ✅ | `5613657` |
| [#28](demande-28-notifications-membres.md) | Notifications « nouveautés » pour tous les membres + page dédiée | M | À tester | ✅ | `f3a2710` |
| [#29](demande-29-tag-cible-notifications.md) | Badge de cible sur les cartes de nouveautés | S | À tester | ✅ | `0d92625` |
| [#30](demande-30-pagination-notifications.md) | Pagination de la page Nouveautés | S | À tester | ✅ | `5c1f1e1` |
| [#31](demande-31-export-exclure-billets-projet.md) | Export xlsx : exclure les billets « Jamais édité, projet » | S | À tester | ✅ | `49f18cd` |
| [#33](demande-33-notification-ciblee-membre.md) | Notification ciblée à un membre (par email) + suivi des demandes | S | À tester | ✅ | `a2cec3a` |
| [#36](demande-36-collecte-base-doublon-carte-admin.md) | Bug : collecte de base en double sur la carte admin (multi-collecte) | S | À tester | ✅ | `cae0736` |
| [#38](demande-38-modifier-collecte.md) | Modifier une collecte existante (page d'édition billet) | S | À tester | ✅ | `2ba34c5` |
| [#39](demande-39-filtre-collecteur-billets.md) | Bug : filtre collecteur vide sur billets.html | S | À tester | ✅ | `e3d1301` |
| [#40](demande-40-badge-statut-par-collecte.md) | Badge de statut cliquable par collecte + statut billet dérivé | M | À tester | ✅ | `0e6e5f4` |
| [#41](demande-41-page-billet-statut-modale.md) | Statut « hérité » à la création + édition collecte en modale | M | À tester | ✅ | `0e6e5f4` |
| [#43](demande-43-affichage-billets.md) | Cadrage affichage billets.html (unicité, surfaçage, multi-collecte) | L | À tester | ✅ | — |
| [#44](demande-44-affichage-billet-vs-collecte.md) | Dissocier billet / collecte(s) : 2 plans, accordéon multi-collecte, anti-double-inscription | L | À tester | ✅ | `be1a9b0`, `0a44038`, `606aa63` |
| [#45](demande-45-changement-statut-collecte-inline.md) | Changement de statut collecte : mini-formulaire inline cohérent (mono & multi) | M | À tester | ✅ | `ea284c7` |
| [#46](demande-46-message-prix-collecte-catalogue.md) | Bug : message prix / version / FDP absent sur les collectes « variante » + quantites/montants (mes-inscriptions, mes-collectes) | S → M | À tester | ✅ | `22257a0`, `b08331c` |
| [#47](demande-47-lisibilite-tag-precollecte-accordeon.md) | Bug : tag « Pré collecte » illisible dans l'accordéon « autres collectes » (+ couleur unifiée sur les 3 surfaces) | S | À tester | ✅ | `2377ee1`, `c060ce3` |
| [#48](demande-48-inscriptions-par-collecte.md) | Inscriptions par collecte côté admin + fin du rattachement au billet dans les vues collecteur | M | À tester | ✅ | `91055d1` |
| [#49](demande-49-audit-billet-vs-collecte.md) | Audit « billet vs collecte » : blacklist destructive, bénéficiaire, gardes de paiement, ouvert/fermé, formulaire rapide | M | À tester | ✅ | `5b21f3b` |
| [#40 (prod)](demande-40-valeur-enveloppe-assurance.md) | Valeur des billets de l'enveloppe, pour choisir l'assurance | S | À tester | ✅ | `e27c519` |
| [#34 (prod)](demande-34-ordre-fige-verification-paiement.md) | Ne pas re-trier la vérification paiement après une validation | S | À tester | ✅ | `e27c519` |
| [#36 (prod)](demande-36-entete-inscriptions-amorce-millesime.md) | Amorce + millésime-version + nom dans l'entête des inscriptions | S | À tester | ✅ | `e27c519` |
| [#37 (prod)](demande-37-numero-suivi-cliquable.md) | Numéro de suivi cliquable vers le suivi La Poste | S | À tester | ✅ | `e27c519` |
| [#38 (prod)](demande-38-liste-pays-drapeau.md) | Liste déroulante de pays + drapeau (profil et gestion des membres) | S | À tester | ✅ | `e27c519` |
| [#39 (prod)](demande-39-date-du-statut-carte-admin.md) | Date du statut courant sur la carte billet (admin) | S | À tester | ✅ | `e27c519` |
| [#41 (prod)](demande-41-pays-obligatoire-creation-billet.md) | Pays obligatoire à la création d'un billet | S | À tester | ✅ | `e27c519` |
| [#43 (prod)](demande-43-export-xlsx-billets-filtres.md) | Export Excel de la liste de billets affichée | S | À tester | ✅ | `e27c519` |
| [#32 (prod)](demande-32-tri-par-amorce.md) | Trier par amorce dans Mes collectes et Mes inscriptions | M | À tester | ✅ | `5b9c984` |
| [#35 (prod)](demande-35-heure-de-validation-paiement.md) | Heure de validation dans l'historique des paiements | S | À tester | ✅ | `b482cc0` |
| [#45 (prod)](demande-45-perimetre-frais-de-port-expedition.md) | Périmètre des versions dans le formulaire d'expédition (nb de billets / frais de port) | S | À tester | ✅ | `00c6ce6` |
| [#42 (prod)](demande-42-historique-paiements-chronologique.md) | Historique des paiements par date (absorbe #47) | M | À tester | ✅ | — |
| [#46 (prod)](demande-46-cloche-accroche-et-ancre.md) | Cloche : accroche tronquée + clic vers la page Nouveautés ancrée | S | À tester | ✅ | — |
| [#48 (prod)](demande-48-cloture-par-le-demandeur.md) | Seul le demandeur clôt sa demande | S | À tester | ✅ | — |
| [#49 (prod)](demande-49-qui-doit-tester.md) | Voir qui doit tester, sans survoler | S | À tester | ✅ | — |
| [#50](demande-50-icones-image-et-fiche-carte-billet.md) | Deux icônes sur la carte billet : l'image en modale, la fiche toujours accessible | S | À tester | ✅ | — |
| [#51](demande-51-ecran-composition-notifications.md) | Écran de composition des notifications (diffusion + envoi ciblé) | M | À tester — ⚠ **migration à jouer** pour l'envoi ciblé | ✅ | `5a6d966` + — |

> ⚠ **Deux séries de numéros cohabitent dans ce dossier.** Les specs `demande-36` et
> `demande-38` à `demande-49` viennent de la table `demandes` de la **copie de test** utilisée
> pendant le cycle #16 (juillet 2026), dont la numérotation a divergé de la production. Toutes
> les autres viennent de la table de **production**. En cas de doute, l'en-tête de chaque spec
> précise l'origine. Les numéros de prod déjà repris ici sous une autre demande sont suffixés
> « (prod) » dans ce tableau.
