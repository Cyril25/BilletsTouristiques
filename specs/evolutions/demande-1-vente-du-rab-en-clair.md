# Demande #1 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
>
> *Reflète la version technique du commit `b771672` (10/09/2026).*

## De quoi il s'agit

Quand une collecte se termine, il reste souvent des billets sur les bras du collecteur — **le
« rab »**. Aujourd'hui il les revend sur Facebook : quelqu'un se manifeste, ils conviennent d'un
prix, et **plus rien n'en garde la trace**. Le collecteur doit se souvenir tout seul de qui lui
doit combien et à qui il doit envoyer quoi. Les commentaires des anciennes collectes en portent la
marque : « voir JP pour le rab », « inscriptions closes, voir René ».

Il y a aussi le cas des **numéros spéciaux** : un billet qui porte un joli numéro de série, vendu à
un prix convenu pour ce numéro-là.

L'idée : le collecteur enregistre la vente dans l'application, **le billet part dans l'enveloppe
habituelle**, et l'argent suit le même chemin que le reste — le membre déclare avoir payé, le
collecteur confirme.

## Ce que ça changera concrètement

Jean-Philippe a 3 billets en trop d'une collecte terminée. Marie en veut un, et veut précisément le
**n° 00042**. Ils conviennent de **8 €**.

1. **JP enregistre la vente** depuis « Mes collectes » : pour Marie, 1 billet, 8 €, et — s'il le
   souhaite — le numéro `00042`.
2. **Marie reçoit une notification** et voit la proposition dans « Mes inscriptions » :
   *« Vente proposée par JP — billet n° 00042 : 8,00 € »*, avec **J'accepte / Je refuse**.
   **Tant qu'elle n'a pas accepté, la somme n'apparaît nulle part dans ce qu'elle doit.**
3. **Marie accepte.** Les 8 € rejoignent son « vous devez », et se règlent comme n'importe quel
   paiement de collecte : elle déclare avoir payé, JP confirme.
4. **Le billet part dans son enveloppe** chez JP, suivi comme les autres.
5. Si Marie refuse, JP est prévenu et la vente ne compte jamais.

**Le point important** : personne ne se voit attribuer une somme à payer sans l'avoir acceptée.
C'est une règle qu'on s'impose — aujourd'hui, aucun montant n'apparaît chez un membre sans qu'il
se soit inscrit lui-même, et on ne veut pas créer d'exception.

## Ce qui a été décidé, et pourquoi

| Décision | La raison |
|---|---|
| **Le membre doit accepter** avant que la vente compte | Voir ci-dessus : rien n'entre dans ce que quelqu'un doit sans un geste de sa part. |
| **Le numéro de série est facultatif** | Le collecteur vend tantôt « 2 billets du rab » sans précision, tantôt « le billet n° 00042 ». Les deux doivent marcher. |
| **La vente s'affiche à part du billet** | Le membre verra le billet, puis une ligne « Vente du rab — billet n° 00042 : 8,00 € ». Deux lignes plutôt qu'une, mais aucun risque de facturer deux fois. |
| **Le règlement suit le chemin habituel** | Déclarer, puis validation par le collecteur : exactement ce que tout le monde connaît déjà. Rien de nouveau à apprendre. |

## Ce que l'application ne fera PAS

- **Elle ne fait pas l'inventaire du rab.** Le collecteur sait ce qui lui reste ; l'application ne
  le lui demande pas. La vente se négocie toujours sur Facebook, l'application enregistre ce qui a
  été convenu.
- **Elle ne gère pas les ventes entre deux membres ordinaires** — c'est la demande #22.
- **Elle ne reprend pas les ventes passées.**

## Une dépendance à connaître

**Cette demande attend maintenant que la demande #22 ait posé sa première brique.**

La raison, sans technique : #1 et #22 ont besoin **exactement de la même chose** — un moyen
d'enregistrer « cette personne doit tant à cette autre », et de confirmer le règlement. On avait
d'abord cru que les deux demandes n'avaient rien en commun, parce qu'on pensait que #22 ne toucherait
pas à l'argent. Ce n'est plus vrai.

Construire cette brique **une fois pour les deux** évite de la construire deux fois, puis de devoir
tout reprendre pour les réconcilier. L'ordre devient donc :

> **la fondation de #22 → puis #1 → puis les annonces de #22**

**#1 reste la petite des deux.** Une fois la fondation posée, il ne lui reste que son écran de
vente côté collecteur et son bloc d'acceptation côté membre.

## Ce sur quoi on vous demande de vous prononcer

- Est-ce que **le parcours décrit** correspond à la façon dont vous vendez votre rab aujourd'hui ?
- Le fait que le membre **doive accepter** avant que la somme compte : est-ce bien ce qu'on veut,
  ou est-ce une lourdeur inutile entre gens qui se sont déjà mis d'accord sur Facebook ?
- Le **numéro de série facultatif** couvre-t-il vos cas, ou faut-il autre chose ?

Si tout vous va, cochez « J'ai lu et je valide l'analyse » sur la fiche. Sinon, laissez un
commentaire : il sera pris en compte et vous aurez une réponse disant ce qui en a été fait.
