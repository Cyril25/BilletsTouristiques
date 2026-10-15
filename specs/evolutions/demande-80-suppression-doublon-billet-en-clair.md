# Demande #80 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui créez et supprimez des billets.
> Aucune connaissance technique n'est nécessaire.
> Reflète la version technique du commit `af20f21` (15/10/2026).

## Ce qui a été demandé

Cyril n'arrivait pas à supprimer une fiche en double, XEADL 2026 version 1 (« 450 JAHRE EVANGELISCHE
KIRCHE SCHWEBHEIM »). Le site répondait « ce billet porte des collectes », alors que la fiche n'en
avait aucune. Il demandait aussi qu'on ne puisse plus créer deux fiches pour le même billet.

## Pourquoi la suppression était refusée

La fiche en trop n'avait ni collecte ni inscription. Mais **deux membres l'avaient marquée « pas
intéressé »** dans leur collection. Le site refuse de supprimer un billet qui figure dans la
collection d'un membre, et il affichait alors toujours le même message, celui des collectes. Le
message était faux, la fiche conservée n'y était pour rien.

## Ce qui change

**À la suppression d'un billet**, le site vérifie d'abord ce qui y est rattaché, puis dit la vraie
raison s'il refuse :

- le billet a une collecte : « supprimez-la d'abord depuis sa fiche » (comme avant, mais seulement
  quand c'est vrai) ;
- **un membre a coché ce billet comme possédé** dans sa collection (ou y a noté des doubles, ou un
  numéro) : la suppression est refusée, avec le nom du membre. La supprimer effacerait sa saisie.
  Demandez-lui de la reporter sur la bonne fiche, puis recommencez ;
- **des membres l'ont seulement marqué « pas intéressé »** : la suppression se fait, et ces marques
  partent avec la fiche supprimée.

La fiche XEADL en trop pourra donc être supprimée.

**À la création d'un billet**, si un billet existe déjà avec **la même amorce, le même millésime et la
même version**, l'enregistrement est refusé. Le message dit lequel, par exemple : « Ce billet existe
déjà : XEADL 2026-1 450 JAHRE EVANGELISCHE KIRCHE SCHWEBHEIM ». Un lien ouvre sa fiche dans un nouvel
onglet, sans perdre ce que vous étiez en train de saisir. Les majuscules et les espaces ne comptent
pas : « xeadl » est la même amorce que « XEADL ».

Un nouveau tirage d'un billet qui existe déjà s'ajoute comme **nouvelle collecte** sur sa fiche :
c'est ce que permet la fiche unique avec ses collectes, depuis la refonte des collectes.

- **« Dupliquer »** un billet reste possible, mais la copie ne s'enregistre qu'après avoir changé
  l'amorce, le millésime ou la version (en général la version).
- **En modification**, le même contrôle s'applique si vous changez l'amorce, le millésime ou la
  version d'une fiche.

## Ce qui ne change pas

- **Les doublons qui existent déjà restent.** Il y en a 95 (262 fiches), surtout d'anciens billets
  « Terminé » du temps où chaque collecte avait sa fiche. On peut toujours les modifier, tant qu'on
  ne change pas leur amorce, leur millésime ou leur version.
- Le site ne fusionne pas deux fiches : il n'y a pas de bouton pour reporter les collectes ou les
  collections de l'une sur l'autre.
- Quand un membre a marqué « pas intéressé » sur les deux fiches d'un doublon, sa marque reste sur
  la fiche conservée. S'il ne l'avait marquée que sur la fiche supprimée, il verra de nouveau la
  fiche conservée comme non marquée.

## Ce sur quoi on vous demande de vous prononcer

- Refuser la création **même quand la fiche existante est « Masqué » ou « Terminé »**, ça vous va ?
  L'idée : un nouveau tirage est une nouvelle collecte sur cette fiche, pas une deuxième fiche.
- Refuser la suppression quand un membre **possède** le billet, plutôt que d'effacer sa saisie : ça
  vous va ? Aujourd'hui, aucune fiche en double n'est dans ce cas.
