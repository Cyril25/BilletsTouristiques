# Demande #60 — Une spec en deux registres : « en clair » et « technique »

- **Épic :** corrections et évolutions (complexité **M**)
- **Demande :** #60 de la table `demandes` de production — Cyril, 2026-09-10, priorité **haute**.
- **Concerne :** les admins (6 personnes).
- **Statut :** **À tester.** Développée le 2026-09-10.
- **Pourquoi la priorité haute :** elle **bloque la validation de #22 et #1**, qui attendent une
  relecture que personne ne peut faire tant que les documents sont illisibles.

## Contexte (demande)

Un admin, devant une spec attachée à une demande :

> « C'est pas mon domaine, c'est du charabia pour moi. »

> L'idée d'avoir mis la spec est qu'elle puisse être validée par des admins qui ne sont pas du
> métier, donc il faut que ce soit lisible par n'importe qui. […] On peut peut-être mettre un genre
> de switch, par défaut « Spec en clair », et qu'on puisse basculer sur « Spec technique ».
> D'ailleurs même dans tes commentaires, fais bien attention à ne pas être trop technique.

**C'est le même angle mort que la fois précédente.** #58 a rendu les specs lisibles *techniquement*
(elles s'affichent), #59 a rendu visible qu'elles attendaient une relecture — et il restait que le
relecteur n'y comprenait rien. On a construit la plomberie, pas l'usage. Trois fois de suite, le
défaut était au bout de la chaîne, chez la personne censée s'en servir.

## Le principe : ce n'est pas une traduction

Les deux documents **ne répondent pas à la même question** :

| Document | Question à laquelle il répond | Lecteur |
|---|---|---|
| **Technique** | *Comment on le construit ?* | celui qui développe |
| **En clair** | *Est-ce bien ce qu'on veut ?* | l'admin qui valide |

**Un admin qui valide répond à la seconde.** C'est ce qui rend l'exercice tenable : la version en
clair n'est pas une version édulcorée section par section — c'est un document plus court, écrit
pour une autre question. Concrètement, elle contient un **parcours avec des prénoms et des
montants**, ce qui a été décidé et **pourquoi**, ce qui est **volontairement exclu** (le plus utile
à valider), ce qui reste ouvert, et **ce sur quoi on demande au relecteur de se prononcer**.

Elle ne contient **ni schéma de table, ni RLS, ni SQL, ni nom de fonction**.

### Le risque, et la parade

Deux documents qui finissent par dire des choses différentes, c'est **pire** qu'un seul document
difficile. La version en clair porte donc en en-tête **le commit de la version technique dont elle
découle** :

> *Reflète la version technique du commit `b771672` (10/09/2026).*

Un écart devient visible au lieu de s'installer.

## Les décisions du cadrage (2026-09-10)

| | Décision |
|---|---|
| **Structure** | **Deux fichiers** : `demande-<id>-<slug>.md` et `demande-<id>-<slug>-en-clair.md`. |
| **Libellés** | **« En clair »** (par défaut) / **« Technique »**. Dit le registre et non la langue — les deux documents sont en français, et « Spec Français » aurait dérouté. |
| **Reprise** | **#22 et #1 tout de suite** : ce sont les deux qui attendent une validation. #58 et #59 sont closes, on ne les reprend pas. |

## Ce qui est construit

### Aucun changement de schéma

La paire se reconnaît au **suffixe `-en-clair` du nom de fichier**. Les deux chemins vivent dans la
colonne `docs` existante (#58), et l'écran les regroupe. **Pas de migration, pas de colonne, pas de
convention à retenir côté base** — juste un nom de fichier.

C'est ce qui fait de cette demande une M et non une L : tout le travail est dans l'écran et dans
l'écriture des documents.

### Le regroupement

`grouperDocs()` range les chemins attachés par nom de base. Un document ayant ses deux registres
s'affiche avec la bascule ; **un document qui n'en a qu'un s'affiche seul, sans bascule** — on ne
montre pas un bouton qui ne mène nulle part.

Quand plusieurs documents sont attachés (cas de #1 et #22, qui portent aussi le cadrage commun),
les onglets de document restent à gauche et la bascule de registre passe à droite. Elle a un style
distinct des onglets pour qu'on ne la confonde pas avec « un autre document ».

### Le registre par défaut

**« En clair » dès qu'il existe.** C'est tout le motif de la demande : le relecteur non technique
ne doit pas avoir à chercher sa version.

## Critères d'acceptation

1. Une demande portant les deux registres affiche **« En clair » d'emblée**, avec une bascule.
2. La bascule change le document sans recharger la page, et l'onglet actif reste visible.
3. Un document qui n'a **qu'un** registre s'affiche **sans bascule**.
4. Plusieurs documents attachés : les onglets de document **et** la bascule cohabitent sans qu'on
   les confonde, **y compris sur téléphone** où la bascule passe pleine largeur.
5. Le tout reste lisible **en mode sombre**.
6. #22 et #1 affichent leur version en clair par défaut.
7. Un admin non technique peut lire la version en clair de #22 **de bout en bout** et dire s'il est
   d'accord — c'est le seul critère qui compte vraiment, et il se teste en la faisant lire.

## Ce que cette demande ne fait pas

- **Pas de reprise de #58 et #59** : elles sont closes.
- **Pas de génération automatique** de la version en clair. Elle s'écrit à la main, après la
  version technique. Un résumé automatique dirait ce que le document *contient*, pas ce que le
  relecteur doit *décider*.
- **Pas de contrôle automatique de la dérive** : le commit cité en en-tête est posé et relu à la
  main. À automatiser si l'écart devient un vrai problème.

## Réalisation

Développée le **2026-09-10**.

| Fichier | Ce qui a changé |
|---|---|
| `demande.js` | `grouperDocs()`, `afficherGroupe()`, `basculerRegistre()`, `rendreDocCourant()` — le rendu passe par un groupe et un registre au lieu d'un chemin. |
| `style.css` | Section « bascule En clair / Technique », en jetons de #54, avec un rendu pleine largeur sous 600 px. |
| `specs/evolutions/CONVENTION-DEMANDES.md` | Section « Une spec, deux documents » : la règle, le principe des deux questions, la parade contre la dérive, l'ordre de travail, et l'extension aux commentaires de réponse. |
| `specs/evolutions/demande-22-…-en-clair.md` | **Nouveau** — 7,8 Ko contre 27 Ko pour la version technique. |
| `specs/evolutions/demande-1-…-en-clair.md` | **Nouveau** — 6,0 Ko contre 26 Ko. |
| `sw.js` | `CACHE_NAME` v300 → v301. |

**Vérifié** : syntaxe JS, rendu des deux nouveaux documents par le convertisseur de #58 (tableaux,
listes et citations équilibrés), et cohérence identifiants / fonctions / classes CSS.
**Non vérifié** : le rendu réel dans un navigateur, la bascule, et le mode sombre.

---

*Spec du 2026-09-10. Sa propre version en clair existe — c'est la moindre des choses pour une
demande qui impose la règle.*
