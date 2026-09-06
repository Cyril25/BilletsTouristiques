# Demande #50 — Écran de composition des notifications

> ⚠ **Pas encore de ligne dans la table `demandes`** (max id = 44 au 06/09/2026). Le numéro
> 50 suit la numérotation des fichiers de spec, qui court déjà au-delà. À créer dans
> `admin-demandes.html` avant le dev, et à renuméroter si l'id attribué diffère.

**État : à cadrer** · Origine : constat de Cyril le 06/09/2026, juste après la bascule #16.

## Le constat

Cyril cherchait l'écran permettant d'adresser une notification à un ou plusieurs membres
précis — ce qu'il pensait être l'objet de la demande #33. Il n'existe pas. La recherche a
montré un trou plus large :

- **`cible_email` n'est écrit qu'à un seul endroit** de tout le code : `admin-demandes.js`,
  fonction `notifierDemandeurSiSuivi`. C'est **automatique** — quand une demande passe
  « À cadrer » ou « À tester », son auteur est prévenu. Personne ne choisit le destinataire,
  il est déduit du champ `demandeur`.
- **Il n'existe aucun écran pour composer une notification**, même de diffusion.
  `notifications.html` est la page de lecture (Nouveautés). Les 15 annonces existantes ont
  **toutes** été écrites à la main, en SQL, dans l'éditeur Supabase.
- Le modèle ne gère pas « plusieurs membres » : `cible_email` est **une seule colonne
  texte**. Plusieurs destinataires = plusieurs lignes de notification.

**Ce n'est pas un bug de #33.** Cette demande a livré la plomberie — la colonne, et la
policy qui rend la notif privée y compris aux admins — plus un usage automatique qui
fonctionne. L'écart est entre l'intention et le périmètre livré, et il est resté invisible
justement parce que la partie automatique marche.

## Ce qui existe déjà et qu'il ne faut pas refaire

| | |
|---|---|
| Table | `notifications (id, type, titre, texte, lien, created_at, cible, cible_email)` |
| Diffusion | `cible` ∈ `tous` / `collecteurs` / (admins via `is_admin_ou_superadmin()`) |
| Privé | `cible_email` non nul → visible du seul destinataire, **masqué aux admins** |
| Policy lecture | `notifications_select`, le `CASE` posé par #33 — **rien à y toucher** |
| Écriture | `notifications_insert/_update/_delete` = `is_admin_ou_superadmin()` |
| Convention | `type = 'nouveaute'`, `lien` = une page du site (13 annonces sur 15 en portent une) |

## Proposition — deux étages, le premier a un intérêt propre

### Étage 1 — composer une notification de diffusion

Un écran admin : **titre**, **texte**, **lien** (liste des pages du site), **cible**
(tous / collecteurs / admins), aperçu, publication. Plus la liste des annonces existantes,
avec modification et suppression.

Cet étage se justifie **seul, sans le ciblage** : aujourd'hui, publier une nouveauté exige
un accès à la base de production. C'est la seule fonctionnalité du produit dans ce cas.

### Étage 2 — cibler un ou plusieurs membres

Un sélecteur de membres (multi-sélection sur l'annuaire). À la publication, **une ligne par
destinataire**, chacune avec son `cible_email`. Aucun changement de schéma nécessaire.

## Critères d'acceptation

- [ ] Un admin publie une annonce de diffusion sans passer par SQL ; elle apparaît dans la
      cloche et sur Nouveautés selon sa cible.
- [ ] Un admin modifie et supprime une annonce existante.
- [ ] Le champ `lien` propose les pages du site plutôt qu'une saisie libre — une URL fautive
      donne une annonce qui mène nulle part.
- [ ] Étage 2 : sélection de N membres → N lignes créées, chacune visible de son seul
      destinataire, **invisible des autres admins** (c'est la règle posée par #33).
- [ ] Une annonce privée n'apparaît pas dans la liste de gestion des autres admins, ou y
      apparaît explicitement marquée — **à trancher, voir ci-dessous**.

## Points à trancher avant le dev

1. **Une annonce privée doit-elle être relisible par son auteur ?** La policy de #33 la
   masque à *tous* les admins, y compris celui qui l'a écrite. Cohérent pour les notifs
   automatiques de demandes ; gênant pour un envoi manuel qu'on voudrait corriger. Modifier
   la policy toucherait le comportement livré par #33 — à faire en connaissance de cause.
2. **Faut-il un accusé de lecture ?** `notifications_vues` existe déjà et donnerait le
   nombre de destinataires ayant vu l'annonce, sans travail de schéma.
3. **Les collecteurs doivent-ils pouvoir écrire à leurs inscrits ?** Ce serait l'usage
   naturel (prévenir d'un retard, d'un changement de prix), mais l'écriture est aujourd'hui
   réservée aux admins et ouvrirait une autre discussion.

## Réalisation

*(à compléter au dev)*
