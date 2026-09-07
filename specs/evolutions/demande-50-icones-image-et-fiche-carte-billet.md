# Demande #50 — Deux icônes distinctes sur la carte billet : l'image et la fiche

- **Épic :** Corrections et évolutions
- **Demande :** #50 de la table `demandes` de **production** — Cyril, priorité normale.
  Liée à **#5** (signaler une erreur sur un billet).
- **Concerne :** membres
- **Écran :** Les billets (catalogue, mode Collecte)
- **Complexité :** **S** (estimée au cadrage — la demande n'en portait pas)
- **Statut :** développée le 07/09/2026

> ⚠ Ne pas confondre avec `demande-51-ecran-composition-notifications.md`, dont le fichier
> de spec s'était d'abord appelé `demande-50` en devinant son numéro.

## Contexte (demande)

> lié à la demande #5 pour la gestion de l'erreur d'un billet. pour signaler une erreur sur un
> billet on est obligé de cliquer sur la fiche billet, mais pour avoir une fiche, un billet doit
> avoir une image. Ne serait-il pas plus pertinent d'avoir une icône pour afficher l'image du
> billet (disons avec une popup modale), et une icône pour afficher la fiche du billet (avec
> l'image également s'il y en a une). ça permettra de signaler par exemple un billet qui n'a pas
> d'image là où actuellement on ne peut pas

## La prémisse est exacte, et la cause est d'une seule ligne

Vérifié dans le code : sur la carte du catalogue, le lien vers la fiche est **conditionné à la
présence d'une image** (`app-new.js`, rendu mode Collecte) :

```js
(imgUrl
    ? '<a href="…billet.html?id=…" class="icon-btn ico-dl" title="Voir la fiche du billet">
         <i class="fa-solid fa-image"></i></a>'
    : '')
```

Deux défauts dans ces trois lignes :

1. **Pas d'image ⇒ pas de lien ⇒ pas de fiche ⇒ pas de signalement.** Exactement ce que décrit
   la demande. Or **la fiche n'a jamais eu besoin d'une image** : `billet.js` se contente de
   masquer la balise `<img>` (`imgEl.style.display = 'none'`) et affiche toutes les informations
   *plus* le bouton « Signaler une erreur » de #5. La page marche déjà parfaitement sans image ;
   c'est seulement la porte d'entrée qui était fermée.
2. **Une icône pour deux choses.** L'icône est une image (`fa-image`) mais son titre dit « Voir la
   fiche du billet ». Le membre qui veut juste regarder le billet change de page ; celui qui veut
   la fiche doit deviner qu'il faut cliquer sur une icône d'image.

### Ce que ça représente

| Mesure (2026-09-07) | |
|---|---|
| Billets au catalogue | 5 507 |
| **Billets sans aucune image** (ni `ImageUrl` ni `ImageId`) | **77** (1,4 %) |
| … dont « Terminé » | 63 |
| … dont « Masqué » | 8 |
| … dont **actifs** (« Collecte » / « Pré collecte ») | **4** |

77 billets étaient donc **impossibles à signaler** — et ce sont précisément ceux dont le défaut le
plus probable est « il manque l'image ». Le cas que le formulaire de signalement ne pouvait pas
recevoir était celui qui le motivait.

### Les deux autres modes d'affichage

- **Galerie** : la tuile pointe déjà vers la fiche **même sans image** (elle affiche « Image
  manquante » dans le lien). Rien à corriger — et c'est la preuve que la fiche sans image est un
  cas déjà prévu ailleurs.
- **Liste** : le tableau ne propose **aucun** lien vers la fiche, quel que soit le billet. Même
  cause de fond, mais hors du périmètre décrit par la demande → **laissé de côté, signalé à
  Cyril** plutôt que corrigé en douce.

## La bonne surprise : la modale existe déjà

`app-new.js` contient `openModal(imgUrl)` / `closeModal()`, et `billets.html` contient le
conteneur `#image-modal` / `#modal-image` avec son CSS. La fonction gère même le passage en
résolution supérieure (`w_800` → `w_1600` pour Cloudinary, `sz=w800` → `sz=w1600` pour Drive).

**Personne ne l'appelle** : c'est du code mort depuis que la tuile de galerie a été rebranchée sur
la fiche. La « popup modale » demandée était donc déjà construite — il ne manquait que le
déclencheur.

## Décisions

| | Décision | Motif |
|---|---|---|
| **D1** | **Deux icônes** : `fa-image` → l'image en modale, `fa-file-lines` → la fiche | C'est la demande, mot pour mot. |
| **D2** | **L'icône « fiche » est affichée sans condition** | C'est le cœur du problème. Un billet sans image doit rester atteignable — c'est même celui qu'on a le plus besoin de signaler. |
| **D3** | **L'icône « image » n'apparaît que s'il y a une image** | Ouvrir une modale vide n'apprend rien. L'absence d'icône est elle-même l'information. |
| **D4** | **Réemploi de `openModal`**, pas de nouvelle modale | Elle existe, elle est testée, elle gère déjà le zoom. |
| **D5** | L'id du billet transite dans le `onclick`, **pas l'URL de l'image** | `ImageUrl` est saisi par un admin : l'injecter dans un attribut `onclick` rouvrirait le type de faille corrigé en SEC-02/SEC-03. Un id est un entier. |
| **D6** | Motif de signalement `image` relibellé **« Image incorrecte ou manquante »** | Le membre arrive maintenant sur la fiche d'un billet sans image ; « Image incorrecte » ne décrit pas son cas. Changement de **libellé seul** — le code stocké reste `image`, aucune reprise de données. |

## Critères d'acceptation

- [x] Sur la carte d'un billet **avec** image : deux icônes. L'icône image ouvre la modale
      (sans quitter le catalogue), l'icône fiche ouvre `billet.html`.
- [x] Sur la carte d'un billet **sans** image : l'icône fiche est présente et fonctionne ;
      l'icône image est absente.
- [x] Depuis la fiche ainsi atteinte, « Signaler une erreur » (#5) est disponible — y compris
      pour un billet sans image.
- [x] La modale se ferme au clic sur le fond et rétablit le défilement de la page.
- [x] Le libellé du motif `image` mentionne le cas « manquante ».
- [x] Aucune régression des icônes existantes (sondage, Excel, Facebook) ni de leur ordre.

## Réalisation

Développée le 07/09/2026. Commit : *(en attente de validation avant push — le site se
déploie sur `main`)*.

| Fichier | Nature |
|---|---|
| `app-new.js` | icône scindée en deux dans le rendu mode Collecte ; nouvelle fonction `openModalBillet(id)` qui résout l'image depuis les données au lieu de la passer dans l'attribut |
| `style.css` | remise à plat de `button.icon-btn` (une icône cliquable est désormais un bouton, pas seulement un lien) + couleur de `.ico-fiche` |
| `global.js` | libellé du motif `image` (D6) |
| `sw.js` | rien de propre à #50 — le `CACHE_NAME` a déjà été porté à **v291** dans la même session par #51 ; un seul incrément suffit pour un déploiement commun |

**Aucune migration SQL, aucun changement de schéma.**

> ⚠ **Couplage à connaître avant de déployer.** `sw.js` installe son cache par
> `cache.addAll(STATIC_ASSETS)` : **un seul fichier manquant fait échouer l'installation
> entière**, et le service worker ne s'active pas du tout. Or `STATIC_ASSETS` contient
> désormais `admin-notifications.html` / `.js` (ajoutés par #51). Donc : si #51 est
> abandonnée, **il faut retirer ces deux lignes de `sw.js`** en même temps. Les deux
> chantiers partent ensemble, ou `sw.js` doit être nettoyé.

### Vérification

Rejouée par un harnais Node à stub DOM (même approche que #51) sur le rendu des cartes :
présence des deux icônes avec image, présence de la seule icône fiche sans image, id du billet
correctement transmis, non-régression des icônes sondage / Excel / Facebook, et résolution de
l'URL par `openModalBillet` pour les deux sources d'image (Cloudinary et Drive).

### Reste à signaler à Cyril

Le **mode Liste** ne donne accès à la fiche d'aucun billet. Même défaut de fond, hors du
périmètre de cette demande — à traiter comme une demande à part s'il le souhaite.
