# Demande #67 — Joindre des fichiers de données à une demande

- **Complexité :** L (tri du 2026-09-14).
- **Demande :** #67, déposée par Cyril le 2026-09-14, priorité **haute**. Liée à **#66** (fiabiliser
  les versions des billets par rapprochement avec un export externe).
- **Statut :** analyse écrite le 2026-09-14. **Recommandation : ne pas construire de pièce jointe
  dans l'application pour l'instant**, et utiliser un dossier convenu sur le poste de Cyril. Aucun
  développement commencé.
- **Reprise le même jour (14 h 16)** après la remarque de Cyril : B est retenue sous une forme plus
  simple encore — **le chemin du fichier est écrit dans la demande**, sans dossier imposé ; c'est
  toujours Cyril qui fournit le fichier. C, l'import par le navigateur, est remplacée par le
  parcours que Cyril décrit pour #66. Voir « La remarque de Cyril ».
- Version en clair pour les relecteurs : `demande-67-fichiers-joints-demande-en-clair.md`.

## Contexte (demande)

> Avoir la possibilité de joindre un ou des documents (xlsx, json, xml) à une demande, afin que ces
> docs soient accessibles par Claude au moment de traiter la demande. Ou alors, si c'est trop lourd,
> dis-moi comment faire, si tu as une autre idée. Le but est de fournir de temps en temps un export
> des données de billets (data externes à notre site), pour consolider nos propres données, c'est
> environ 5000 billets donc 5000 lignes si fichier Excel. (voir la demande #66)

La demande ouvre elle-même la porte à une autre solution. C'est la question que cette analyse
traite d'abord : **quel est le moyen le plus léger de faire arriver ce fichier là où il sert ?**

## Le besoin réel, relu avec #66

- **Le fichier** : un export de données de billets venant de l'extérieur, environ 5 000 lignes,
  fourni « de temps en temps ». A priori **aucune donnée de membre** — mais des données d'un tiers,
  qui n'ont pas leur place dans un dépôt public.
- **Qui s'en sert** : le rapprochement de #66. Il compare l'export à la table `billets`, corrige les
  écarts sûrs, et envoie les autres vers un écran où un admin choisit « ignorer » ou « appliquer ».
- **Qui le fournit** : Cyril, d'après la demande. Aucun autre admin n'est mentionné (question Q4).

## L'état du terrain, vérifié le 2026-09-14

| Constat | Conséquence |
|---|---|
| **Aucun stockage de fichiers** dans l'application : aucune trace de Supabase Storage dans les migrations ni dans le code | Une pièce jointe, c'est une brique d'infrastructure neuve, que personne dans l'équipe n'a encore utilisée |
| Le champ `docs` d'une demande n'accepte que des chemins `specs/…/*.md` : contrainte `demandes_docs_chemins_valides` (#58) et `cheminDocValide()` dans `demande.js` | C'est voulu — le commentaire du code : « sans ça, il devient un lecteur de fichiers arbitraire du site » |
| Le dépôt est **public** | Un export de tiers ne peut pas y être versionné |
| Le Worker `supabase-admin-proxy` ne relaie **que** `/rest/v1/` ; la clé de tri n'ouvre que `demandes` (lecture, mise à jour) et `notifications` (création) | Donner à l'assistant l'accès à un fichier stocké exigerait d'élargir le Worker : la décision de sécurité la plus sensible du sujet |
| Le rituel tourne **sur le poste de Cyril**, avec la clé d'administration lue dans `~/.claude/secrets` (`scripts/rituel-demandes.mjs`) | Un fichier posé sur ce poste est **déjà** lisible par l'assistant, sans rien construire |
| Le rituel n'a le droit d'écrire que dans `demandes` et `notifications` ; corriger des billets passe par du SQL joué par Cyril ou par un écran admin | Le rituel n'a de toute façon rien à faire du fichier au-delà de l'analyse |
| Les pages déclarent une `Content-Security-Policy` stricte (scripts externes limités et signés) | Lire un xlsx dans le navigateur demanderait une bibliothèque et une ouverture de la CSP ; CSV et JSON se lisent sans rien ajouter |

## Trois façons de faire

| | Principe | Coût | Pour | Contre |
|---|---|---|---|---|
| **A — pièce jointe dans l'application** | Espace de stockage privé, table de liens vers les demandes, envoi et téléchargement sur la fiche, Worker élargi pour que l'assistant lise les fichiers | **L** : infrastructure neuve, règles d'accès, Worker, script du rituel | N'importe quel admin joint un fichier, depuis n'importe où ; servirait à toute demande future | Nouvelle surface de sécurité, dont une clé de Worker élargie. Aucun autre besoin ne l'utiliserait aujourd'hui |
| **B — un dossier convenu sur le poste** *(recommandée maintenant)* | Cyril dépose le fichier dans un dossier fixé, **hors de tout dépôt git**, un sous-dossier par demande, et le signale sur la fiche (« fichier déposé : export-2026-09.csv ») | **Aucun développement** ; une règle dans la convention | Immédiat. N'ouvre aucun accès nouveau. L'assistant qui analysera #66 travaille sur ce poste | Seul Cyril peut fournir un fichier. Ne tiendrait plus si le rituel tournait un jour dans une routine hébergée |
| **C — l'import dans l'écran de #66** | L'écran « ignorer / appliquer » de #66 accepte lui-même l'export : l'admin choisit le fichier, le navigateur le lit, les écarts calculés sont enregistrés en base pour être arbitrés | Fait partie de **#66**, pas de #67 | Rejouable par n'importe quel admin, sans assistant ni poste. Le fichier n'a pas besoin d'être conservé | Un xlsx exigerait une bibliothèque et une ouverture de la CSP — un CSV ou un JSON, non. **Écartée le 14/09 (14 h 16)** : c'est toujours Cyril qui fournit le fichier, et c'est l'assistant qui l'importe — voir ci-dessous |

## La remarque de Cyril *(14/09, 14 h 16)*

| Ce qu'écrit Cyril | Ce que ça tranche |
|---|---|
| « c'est trop lourd pour garder un fichier, je n'avais pas pensé au fait que je pouvais mettre le fichier sur mon poste » | **Q1** : B est retenue ; A écartée |
| « c'est moi qui le fera (toujours) » | **Q4** : aucun autre admin ne fournira de fichier. L'argument qui aurait justifié C tombe |
| « mettre le chemin du fichier est suffisant » | **Q2** : pas de dossier imposé — **le chemin est écrit dans la demande** |
| « l'IA, quand on lui demandera “traite le fichier des billets de telle source”, lira les datas, les importera dans une table d'import (autre que table billets), mettra un statut (traité, ignoré, à valider, validé, refusé) et la suite se fera sur le module dédié » | Le fichier n'a jamais besoin d'entrer dans le site : c'est l'assistant qui le lit sur le poste et en verse le contenu dans une **table d'import**. **C est remplacée** par ce parcours, qui appartient à **#66** |

~~Q3 (le format de l'export) reste ouverte.~~ Répondue à 14 h 31 : CSV ou JSON. **Toutes les
questions sont tranchées.**

Sur la demande de Cyril, #66 reçoit ce parcours dans son journal : l'assistant ne peut pas modifier
le texte d'une demande, seulement son journal et ses documents.

## Recommandation

1. ~~Maintenant : B, pour la première consolidation, avec un dossier proposé à côté des dépôts.~~
   **Retenue le 14/09 : B**, sans dossier imposé. Cyril écrit dans la demande le chemin du fichier
   sur son poste, où qu'il soit — hors de tout dépôt git.
2. **Le format : CSV en UTF-8 ou JSON plutôt que xlsx** (Q3). Un xlsx est un classeur compressé :
   lisible, mais au prix d'une conversion, où se perdent en silence les zéros en tête (un numéro
   comme `00042` devient `42`), les dates et parfois les accents. Pour un rapprochement ligne à
   ligne, c'est exactement le genre d'écart qu'on ne veut pas fabriquer soi-même.
3. ~~Ensuite : C, dans #66, si le rapprochement doit être rejoué par les admins sans l'assistant.~~
   **Écartée le 14/09** : Cyril fournira toujours le fichier, et c'est l'assistant qui l'importe dans
   une table dédiée (#66).
4. **A : seulement le jour où d'autres demandes ont besoin de pièces jointes.** Pas aujourd'hui.

## Ce que ça veut dire pour cette demande

**B est retenue : #67 ne demande aucun développement.** Il reste à écrire la règle dans
`CONVENTION-DEMANDES.md` : un fichier de données fourni pour une demande reste sur le poste de
Cyril, **hors de tout dépôt**, son chemin est écrit dans la demande (texte ou commentaire), et il est
fourni en **CSV UTF-8 ou JSON** (Q3).
Elle sera écrite une fois l'analyse validée. Le sort de la demande ensuite — terminée ou
abandonnée — revient à Cyril : l'assistant n'a pas le droit de clore une demande.

## Critères d'acceptation (si B)

1. Un fichier dont le chemin est écrit dans la demande est lu par l'assistant quand il traite cette
   demande, sans autre manipulation. *(Formulation du 14/09, 14 h 16 : « déposé dans le dossier
   convenu » est remplacé par « dont le chemin est écrit dans la demande ».)*
2. Aucun fichier de données n'entre dans un dépôt git.
3. La convention dit où écrire le chemin d'un fichier, et qu'il reste hors de tout dépôt.

## Ce que cette spec ne fait pas

- **Pas de stockage dans l'application**, pas de modification du Worker ni des règles d'accès.
- **Pas de rapprochement ni de table d'import** : c'est #66.
- **Pas de lecture de fichier dans le navigateur** : C est écartée.

## Questions ouvertes

| | Question | Pour qui | Recommandation |
|---|---|---|---|
| ~~Q1~~ | ~~B maintenant, C éventuellement dans #66, A seulement si un autre besoin apparaît ?~~ | Cyril | **Répondue le 14/09 : B.** A écartée, C remplacée par le parcours de #66 |
| ~~Q2~~ | ~~Le dossier : celui proposé, ou un autre ?~~ | Cyril | **Répondue : aucun dossier imposé**, le chemin est écrit dans la demande |
| ~~Q3~~ | ~~L'export peut-il sortir en CSV ou en JSON ?~~ | Cyril | **Répondue le 14/09 (14 h 31) : oui**, « au pire je transformerai l'Excel avant de te donner le fichier ». La conversion reste de son côté, où il voit ce qu'il convertit |
| ~~Q4~~ | ~~D'autres admins devront-ils fournir des fichiers ?~~ | Cyril | **Répondue : non**, toujours Cyril |

## Réalisation

Réalisée le 2026-09-14, après validation de l'analyse par Cyril (14 h 51). Aucun code, aucune
migration, aucun redéploiement.

| Fichier | Ce qui change | Commit |
|---|---|---|
| `specs/evolutions/CONVENTION-DEMANDES.md` | Nouvelle section « Fournir un fichier de données pour une demande » : chemin écrit dans la demande, fichier sur le poste de Cyril hors de tout dépôt, CSV UTF-8 ou JSON, lu là où il est | `72bd23d` |

Critères d'acceptation :

1. lu par l'assistant quand le chemin est écrit dans la demande — **se vérifiera au premier usage**,
   avec l'export de #66 ;
2. aucun fichier de données dans un dépôt — écrit dans la règle ;
3. la convention dit où écrire le chemin et que le fichier reste hors de tout dépôt — fait.

Pas de nouveauté à annoncer aux membres : la règle ne concerne que la façon de travailler avec
l'assistant.
