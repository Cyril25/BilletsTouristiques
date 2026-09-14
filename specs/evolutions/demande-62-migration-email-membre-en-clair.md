# Demande #62 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document) — vous n'avez pas
> besoin de la lire pour valider.
>
> Reflète la version technique du commit `7dd4e4d` (14/09/2026).

## Ce qui a changé

Ce document a été **réécrit le 14 septembre**. La version précédente proposait de faire suivre
l'adresse d'un membre partout où elle est recopiée. **Cyril a choisi une autre voie** : donner à chaque
membre **un numéro**, utilisé partout à la place de son adresse. Il n'y a plus d'urgence, et cette
organisation simplifie et limite les erreurs.

Ce qui avait déjà été décidé reste valable :

- supprimer un membre qui a des données le **désactive** au lieu de l'effacer ;
- **tous les admins** peuvent changer une adresse ;
- le membre **n'est pas prévenu** ;
- **pas de fusion** de deux comptes qui ont chacun des données.

## De quoi il s'agit

De temps en temps, un membre n'arrive plus à se connecter avec son adresse email. Il s'en crée une
nouvelle, revient sur le site... et **ne retrouve rien**. Pour l'application, la personne avec la
nouvelle adresse est **quelqu'un d'autre**. C'est arrivé le 9 septembre : dix ans d'historique dormaient
sous l'ancienne adresse.

La raison : **dans l'application, l'adresse email est l'identité du membre.** Elle est recopiée sur
chaque inscription, chaque billet de sa collection, chaque enveloppe, chaque commentaire — une
vingtaine d'endroits. Changer d'adresse, c'est aujourd'hui les retrouver tous, à la main. En 2024, un
changement fait ainsi en avait oublié un : six enveloppes sont restées au nom de l'ancienne adresse.

## Ce qui est proposé

**Chaque membre reçoit un numéro qui ne change jamais.** Partout où l'application note aujourd'hui
« cette inscription est à telle adresse », elle notera « cette inscription est au membre n° 42 ».
L'adresse ne servira plus qu'à une chose : **reconnaître le membre quand il se connecte avec Google.**

Et changer d'adresse devient trivial : on corrige **l'adresse sur la fiche du membre n° 42**, et
c'est tout. Tout le reste pointe vers le numéro, qui n'a pas bougé. Plus rien à retrouver, plus rien à
oublier.

### Comment ça se passera, pour Marie, admin

Paul s'est créé un deuxième compte avec sa nouvelle adresse Google. Marie ouvre la fiche de Paul dans
Gestion Membres et clique **« Changer l'adresse »**. Elle saisit la nouvelle adresse.

L'application voit que cette adresse a **déjà une fiche** — celle que Paul a créée en se connectant, et
qui est vide. Elle le dit à Marie, **retire la fiche vide**, et met la nouvelle adresse sur la vraie
fiche de Paul. Paul se reconnecte avec sa nouvelle adresse et **retrouve tout**.

Si la fiche de la nouvelle adresse contenait de vraies données — des inscriptions, une collection —,
l'application **refuserait** et dirait ce qui bloque : ce serait une fusion de deux comptes, qui n'est
pas au programme.

## Trois choses qu'on a trouvées en préparant

1. **Le deuxième compte existe presque toujours.** Quand quelqu'un se connecte avec une adresse
   inconnue, le site lui crée une fiche « en attente ». Le membre qui a changé d'adresse a donc déjà une
   fiche vide à la nouvelle adresse. C'est pour ça que l'application doit savoir la retirer, comme dans
   l'exemple de Paul.
2. **L'assistant n'est pas un membre.** Il signe ses réponses dans les fiches des demandes, mais n'a
   pas de fiche. Avec des numéros, il lui en faudra un (question 2).
3. **Certaines « adresses » n'en sont pas.** Les demandes importées d'un ancien tableau portent le nom
   « Import Google Sheet » ; et une quinzaine d'adresses fantômes appartiennent à des membres supprimés
   par le passé. On ne peut pas leur donner un numéro telles quelles (question 3).

## Le prix, et comment on le paie

Le numéro de membre est la bonne organisation, mais il touche **presque tout le site** : plus de
300 endroits dans 17 fichiers, dont une centaine dans « Mes collectes », et la plupart des règles qui
décident qui a le droit de voir quoi.

Pour ne pas tout risquer le même jour, on propose d'avancer **par petites étapes**, chacune essayée
d'abord sur la copie de test du site, puis vérifiée en production, et qu'on peut défaire si quelque
chose cloche :

1. **Préparer** : régler les adresses fantômes et le cas de l'assistant. Rien de visible.
2. **Ajouter les numéros** à côté des adresses, sans rien retirer. Rien de visible.
3. **Faire passer les règles d'accès** par les numéros. Rien de visible si tout va bien.
4. **Reprendre les écrans un par un**, du plus simple au plus gros (« Mes collectes » en dernier).
5. **Retirer les adresses recopiées**, une fois que plus rien ne s'en sert.
6. **Ajouter le bouton** « Changer l'adresse », la désactivation et la réactivation dans Gestion
   Membres.

C'est plus long qu'un grand jour J, mais une erreur ne touche qu'un écran à la fois, et se voit tout de
suite.

## Ce que l'application ne fera PAS

- **Fusionner deux comptes qui ont chacun des données.**
- **Laisser un membre changer son adresse lui-même** : c'est une opération d'admin.
- **Toucher à l'adresse PayPal d'un collecteur** ni aux adresses de ses contacts : ce ne sont pas des
  membres.
- **Prévenir le membre** du changement.

## Ce sur quoi on vous demande de vous prononcer

1. **Avancer par petites étapes** plutôt que tout faire le même jour ? On le recommande.
2. **L'assistant** : lui créer une fiche de membre « technique », désactivée et sans aucun droit, pour
   qu'il garde un numéro comme tout le monde ? On le recommande.
3. **Les adresses fantômes** : leur créer des fiches **désactivées** — comme pour un membre qu'on ne
   peut plus supprimer —, plutôt que d'effacer ce qui leur appartient ? On le recommande : rien ne se
   perd.
4. **Les traces** « modifié par », « bloqué par », « traité par » : elles gardent l'adresse de la
   personne au moment de l'action. Après un changement d'adresse, l'ancienne y resterait. Acceptable
   pour un historique ? On le pense.

Si tout vous va, cochez « J'ai lu et je valide l'analyse » sur la fiche. Sinon, laissez un
commentaire : vous aurez une réponse disant ce qui en a été fait.
