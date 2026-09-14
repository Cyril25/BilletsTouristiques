# Demande #67 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `54da13b` (14/09/2026).

## De quoi il s'agit

Cyril veut pouvoir fournir de temps en temps **un fichier de données sur les billets**, venu de
l'extérieur — environ 5 000 lignes —, pour vérifier et compléter nos propres fiches. C'est ce qui
servira à la demande #66 : repérer les billets dont on ne sait pas s'ils existent en doré, en
anniversaire, ou sans variante.

La demande proposait de **joindre ce fichier à la demande**, sur le site. Et elle ajoutait : « si
c'est trop lourd, dis-moi comment faire ». C'est cette question que l'analyse a regardée en premier.

## Ce qu'on a trouvé

- **Le site ne sait aujourd'hui garder aucun fichier.** Les « documents » attachés à une demande
  sont les analyses que vous lisez en ce moment, rangées avec le code du site — qui est public. On
  ne peut pas y ranger les données de quelqu'un d'autre.
- **L'assistant ne lit les demandes que par un passage volontairement étroit**, qui ne mène à aucun
  fichier. L'élargir, c'est ouvrir un nouvel accès, et ça se pèse.
- **Mais l'assistant travaille déjà sur l'ordinateur de Cyril.** Un fichier que Cyril y dépose est
  lisible tout de suite, sans rien construire.

## Ce qui est proposé

**Pour l'instant, ne rien développer.** Cyril dépose le fichier dans **un dossier convenu** de son
ordinateur — un dossier par demande, en dehors du code du site — et l'indique sur la fiche : « fichier
déposé : export-septembre.csv ». L'assistant va l'y chercher quand il traite la demande.

**Plus tard, si c'est utile** : quand l'écran de la demande #66 existera (celui où un admin choisit
« ignorer » ou « appliquer » pour chaque écart), il pourra accepter le fichier directement. N'importe
quel admin pourrait alors refaire la vérification, sans passer par l'assistant ni par l'ordinateur de
Cyril. C'est à décider dans l'analyse de #66.

**Une vraie pièce jointe sur le site** ne se justifierait que si d'autres demandes en avaient besoin.
Ce n'est pas le cas aujourd'hui.

## Un conseil sur le format

**Un fichier CSV ou JSON plutôt qu'un fichier Excel**, si la source le permet. Un classeur Excel se
lit, mais il faut le convertir, et la conversion abîme sans prévenir : un numéro comme « 00042 »
devient « 42 », une date change de forme. Pour comparer 5 000 billets ligne à ligne, ce sont
exactement les faux écarts qu'on ne veut pas fabriquer.

## Ce que l'application ne fera PAS

- **Elle ne gardera pas de fichiers**, pour l'instant.
- **Elle n'ouvrira aucun nouvel accès** à l'assistant.
- **Cette demande ne fait pas la vérification elle-même** : c'est la demande #66.

## Ce sur quoi on vous demande de vous prononcer

- **Pour Cyril** : le dossier convenu maintenant, l'import dans l'écran de #66 plus tard, et pas de
  pièce jointe sur le site tant qu'aucun autre besoin n'apparaît — d'accord ?
- **Pour Cyril** : l'export peut-il sortir en CSV ou en JSON ?
- **Pour tous** : d'autres admins que Cyril devront-ils fournir ce genre de fichier ? Si oui, c'est
  l'import dans l'écran de #66 qui y répondra.

Si la proposition est retenue, cette demande ne demande aucun développement : il restera à écrire
la règle « où déposer un fichier » dans la convention des demandes, puis Cyril décidera de la clore.
Vos remarques sont bienvenues : laissez un commentaire, vous aurez une réponse disant ce qui en a été
fait.
