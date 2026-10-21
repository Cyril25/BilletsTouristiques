# Demande #81 — Créer un envoi hors collecte

- **Épic :** Corrections et évolutions (complexité **L**)
- **Demande :** #81 de la table `demandes` de production — Sébastien, 2026-10-15, priorité
  *normale*. Publics cités : membres, collecteurs, admins.
- **Statut :** analyse à valider (rédigée le 2026-10-21 par le rituel des demandes).
- **Version en clair :** [demande-81-envoi-hors-collecte-en-clair.md](demande-81-envoi-hors-collecte-en-clair.md)

## Contexte (demande)

> Dans la partie envoi, pouvoir créer manuellement un envoi avec les mêmes informations (numero de
> suivi, prix, bom de la personne etc) que les gens qui attendent un envoi de collecte passés.

**Précisions de Sébastien, en commentaire le 21/10** (réponses aux questions du tri) :

1. il s'agit de **billets vendus ou échangés hors collecte** ;
2. les billets se **choisissent dans le catalogue** (« serait un plus et détaillerait bien le
   contenu de l'enveloppe ») ;
3. le **prix de l'envoi** apparaît dans les paiements à vérifier et dans les relances, comme pour un
   envoi de collecte ;
4. le membre voit l'envoi dans « Mes envois » et peut en confirmer la réception (« que le suivi soit
   des deux côtés ») ;
5. **uniquement des membres du site**.

## Constat

**Une enveloppe porte déjà tout le volet « envoi ».** `enveloppes` : `collecteur_alias`,
`membre_id`, `statut` (`en_cours` → `expediee` → `distribuee` → `recue`, ou `annulee`),
`mode_envoi_reel`, `numero_suivi`, `prix_envoi_reel`, `statut_paiement_port`, dates. Dès qu'une
enveloppe a un `prix_envoi_reel` non payé, ce port apparaît **sans rien ajouter** dans :
« Vérification paiement » du collecteur (`loadVerificationPaiement`), le récapitulatif et les
relances (#86, depuis ce matin), les frais d'envoi du membre dans « Mes inscriptions »
(déclaration de paiement), la somme due du menu (`global.js`). La réception (#19, « Mes envois »)
et l'historique (#82) suivent aussi le statut de l'enveloppe.

**Ce qui manque, c'est le contenu.** Le contenu d'une enveloppe, ce sont aujourd'hui **des
inscriptions** (`inscriptions.enveloppe_id`), donc des billets d'une collecte. Un billet vendu ou
échangé hors collecte n'a pas d'inscription.

**Un précédent de création directe** : l'expédition directe d'une collecte à port payé
(`confirmerExpeditionDirecte()`) crée déjà une enveloppe et l'expédie en un geste. Le trigger des
enveloppes (#64) ne limite que ce que le **membre** peut modifier ; le collecteur peut créer une
enveloppe.

## Options pour le contenu

**A. Fausse collecte et fausses inscriptions.** Écartée : les collectes pilotent le statut dérivé
du billet et s'affichent sur sa carte et sa fiche (« Autres collectes de ce billet ») ; une
inscription est unique par collecte et par membre ; les écrans de paiement compteraient le prix
des billets.

**B. Une table de lignes de contenu — recommandée.** `enveloppe_billets` (`id`, `enveloppe_id` →
`enveloppes` ON DELETE CASCADE, `billet_id` → `billets`, `nb_normaux`, `nb_variantes`, `created_at`).
Le contenu d'une enveloppe devient : ses inscriptions **et** ses lignes hors collecte. Plus une
colonne `enveloppes.hors_collecte BOOLEAN NOT NULL DEFAULT false` pour reconnaître ces envois
(libellé, filtres).

**C. Un texte libre** (`enveloppes.contenu_libre`). Le moins cher, mais sans lien au catalogue,
ce que Sébastien souhaite. Peut **compléter** B pour ce qui n'est pas au catalogue (Q3).

## Proposition détaillée (option B)

### 1. Le parcours du collecteur

Dans « Mes collectes » → « Historique des envois », un bouton **« Nouvel envoi hors collecte »**
ouvre un formulaire :

- **le membre** (recherche parmi les membres actifs, comme la fenêtre « inscrire un membre ») —
  son adresse s'affiche, à copier ;
- **les billets** : recherche dans le catalogue (amorce, millésime, nom), puis quantités de normaux
  et de variantes selon les versions du billet ; une ligne par billet, retirable ;
- **l'envoi** : mode, numéro de suivi, prix du port — les mêmes champs que le formulaire
  d'expédition (`ouvrirFormulaireExpedition`), prix proposé d'après la grille des frais de port
  au nombre de billets et à la destination.

Valider crée l'enveloppe **directement expédiée** (`statut = 'expediee'`, `date_expedition = now`,
`hors_collecte = true`, `statut_paiement_port = 'non_paye'`) puis ses lignes. Pas d'enveloppe en
cours : la contrainte « une seule enveloppe en cours par collecteur et membre » et le ménage des
enveloppes vides (incident du 16/10) ne sont pas concernés.

### 2. Ensuite, la vie normale d'un envoi

Rien de nouveau à écrire pour : le port dans les paiements à vérifier et les relances, la
déclaration de paiement par le membre, la somme due, « distribué » / « reçu » (y compris en groupe,
#19), la section « En cours » / « Terminés » de l'historique (#82).

### 3. Les lectures à compléter

- **Historique des envois** (carte) : une mention « hors collecte ».
- **Détail d'un envoi passé** (`openEnveloppePassee` / `renderEnveloppePasseeDetail`) : ses lignes,
  en plus des inscriptions.
- **« Mes envois » du membre** (`loadMesEnvois` / `renderMesEnvois`, `mes-inscriptions.js`) : charger
  les lignes de ses enveloppes et les afficher comme les billets de collecte ; le bouton « Confirmer
  la réception » existe déjà.
- **Annuler un envoi** (`executerAnnulationEnvoi`) : pour un envoi hors collecte, l'annulation
  supprime l'enveloppe et ses lignes (il n'y a rien à « remettre à répartir ») — avec
  confirmation, et refusée si le port a été déclaré ou payé.
- **Fusion / changement d'adresse d'un membre** (#62, `users.js`) : les enveloppes suivent le
  numéro de membre, les lignes suivent l'enveloppe — rien à faire, à vérifier.

### 4. Base de données (migration à jouer par Cyril)

- `ALTER TABLE enveloppes ADD COLUMN hors_collecte BOOLEAN NOT NULL DEFAULT false` ;
- `CREATE TABLE enveloppe_billets (…)` + index sur `enveloppe_id`, CHECK quantités ≥ 0 et somme > 0 ;
- **règles d'accès** (jamais `TO authenticated`, `is_admin_ou_superadmin()`, `mon_membre_id()` comme
  depuis #62) : lecture par le collecteur de l'enveloppe, par son destinataire, par les admins ;
  écriture par le collecteur de l'enveloppe seulement, et seulement sur une enveloppe
  `hors_collecte` ;
- à vérifier : que les règles d'insertion d'enveloppe permettent de créer une enveloppe déjà
  `expediee` (l'expédition directe le fait en deux temps : création en cours, puis expédition) ;
  sinon reprendre ce chemin en deux temps ;
- scripts habituels : constat, migration, contrôle, retour arrière.

### 5. Découpage

1. Base + formulaire de création + détail d'un envoi passé côté collecteur.
2. « Mes envois » côté membre, mention dans l'historique, annulation.

Vérification sur le banc PostgREST + jsdom (`scripts/banc-62/`), règles d'accès comprises (un
membre ne lit que ses lignes, ne les modifie pas ; un collecteur ne touche pas aux envois d'un
autre).

## Questions ouvertes (reprises dans la version en clair)

- **Q1 — Même enveloppe que des billets de collecte ?** La proposition crée un envoi à part. Si ces
  billets partent souvent **avec** des billets de collecte, il faudrait pouvoir les ajouter à
  l'enveloppe en préparation — ce qui fait entrer les lignes dans le ménage des enveloppes vides,
  la préparation des envois, le récapitulatif #84 et le calcul du port. Second temps, si besoin.
- **Q2 — Le prix des billets** vendus : seul le port est réclamé par le site (c'est ce qui a été
  demandé). Le prix des billets reste réglé hors du site ?
- **Q3 — Hors catalogue** : faut-il aussi un champ libre (jetons, billet absent du catalogue) ?
- **Q4 — Où** : bouton dans « Historique des envois » (proposé) ou dans « Préparation des envois » ?
- **Q5 — La valeur pour l'assurance** (#40) : les billets hors collecte n'ont pas de prix ; faut-il
  pouvoir saisir une valeur déclarée ?

## Hors périmètre

- Les destinataires qui ne sont pas membres du site (précision 5 de Sébastien).
- Réclamer le prix des billets vendus (Q2).
- **Lien avec #83** (normaux et variantes dans des enveloppes différentes) : les deux changent ce
  qu'« contenir une enveloppe » veut dire. À développer **l'un après l'autre**, en faisant passer
  toutes les lectures du contenu par une même fonction (les « parts » de #83 + les lignes de #81).
