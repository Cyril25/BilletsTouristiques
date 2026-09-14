# Demande #67 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
> Reflète la version technique du commit `46f0bbf` (14/09/2026, après la remarque de Cyril).

## Ce qui a changé depuis la première version

Cyril a relu et **validé l'idée** : pas de fichier gardé sur le site. Il l'a même simplifiée : pas de
dossier imposé, **le chemin du fichier sera simplement écrit dans la demande**. C'est toujours lui
qui fournira ces fichiers, et c'est l'assistant qui en versera le contenu dans une table de
vérification — ce qui relève de la demande #66.

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

**Ne rien développer.** Cyril garde le fichier sur son ordinateur, en dehors du code du site, et
**écrit son chemin dans la demande**. L'assistant va l'y lire quand il traite la demande.

~~Plus tard, si c'est utile, l'écran de #66 pourrait accepter le fichier directement, pour que
n'importe quel admin refasse la vérification.~~ **Écarté par Cyril** : c'est toujours lui qui
fournira le fichier. La suite — verser les données dans une table de vérification, puis les
examiner dans un écran dédié — est décrite dans la demande #66.

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

Cyril a déjà répondu aux questions de la première version : la proposition lui convient, le chemin
sera écrit dans la demande, et c'est lui seul qui fournira les fichiers. Reste :

- **Pour Cyril, sans urgence** : l'export peut-il sortir en CSV ou en JSON ? La question servira
  surtout à #66.
- **Pour tous** : cette façon de faire vous convient-elle ?

Cette demande ne demande aucun développement : une fois validée, il restera à écrire dans la
convention des demandes la règle « le chemin du fichier est écrit dans la demande, le fichier reste
hors du code du site », puis Cyril décidera de la clore.
Vos remarques sont bienvenues : laissez un commentaire, vous aurez une réponse disant ce qui en a été
fait.
