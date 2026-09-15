# Demande #73 — Retirer le QR code des images de billets

- **Complexité :** S — Prêt à dev au tri du 2026-09-15.
- **Demande :** #73, déposée par Cyril le 2026-09-15, priorité normale.
- **Concerne :** membres, collecteurs et admins — liste des billets (`app-new.js`), Ma collection
  (`ma-collection.js`), fiche billet (`billet.js`, `billet.html`), fenêtre « Partager » de la gestion
  des billets (`admin.js`).
- Version en clair : `demande-73-retirer-qr-code-images-en-clair.md`.

## Contexte (demande)

> Sur la page les billets, on affiche pas l'originale qu'on a importé, mais une image (retaillé si je
> me souviens bien ?) avec un qr code dessus qui mène à notre site. Comme un vendeur n'aime pas nos qr
> code, on va devoir les enlever (partout sur le site pour être cohérent), de quelle manière peut on
> procéder ? Arrive on a les supprimer de manière simple ?

## Constat

Le QR code n'est enregistré dans **aucune** image : les originaux restent intacts dans Cloudinary ou
Google Drive. Il est ajouté à l'affichage, à quatre endroits :

| Endroit | Mécanisme |
|---|---|
| Liste des billets (`app-new.js`, `resolveImageUrl`) | Couche Cloudinary `l_fetch:<base64 de l'URL qrserver>` insérée dans l'URL de transformation, après `f_auto,q_auto,w_800` |
| Ma collection (`ma-collection.js`, `resolveImageUrl`) | Même constante `QR_OVERLAY`, recopiée |
| Fiche billet (`billet.js`, `burnQrIntoImage`) | Image Cloudinary sans couche, puis QR tiré de `api.qrserver.com` et **dessiné dans un canvas** avec quatre libellés ; l'`<img>` reçoit le `toDataURL` pour qu'« Enregistrer sous » garde le QR |
| Fenêtre « Partager » de la gestion des billets (`admin.js`) | Même couche Cloudinary (`QR_OVERLAY_SHARE`) sur l'image à `w_1200` qui sert d'aperçu et de lien dans le texte à copier pour Facebook |

Le bouton de téléchargement (`resolveDownloadUrl`) renvoie déjà l'original, sans QR.

**Hors périmètre, confirmé par Cyril le 15/09** : la page « Partager le site » (`partager.html`,
`partager.js`) fabrique une affiche avec un QR code vers le site, sans image de billet. Elle garde son
QR.

## Décisions

### D1 — Retirer la couche, garder la transformation

Les URLs perdent seulement le segment `QR_OVERLAY` ; `f_auto,q_auto,w_<taille>` reste. La réduction
de taille et le format automatique accélèrent la page, la demande ne les vise pas.

### D2 — Fiche billet : afficher l'image Cloudinary directement

`burnQrIntoImage()` et `getQrUrl()` disparaissent, avec les constantes de proportion `QR_REF_*` et
`SITE_BASE` qui ne servaient qu'à eux. L'`<img>` reçoit l'URL de `resolveImageUrl(b, 1000)`. Effets de
bord voulus : plus de requête vers `api.qrserver.com`, plus de canvas, l'image s'affiche dès son
chargement au lieu d'attendre deux images. `api.qrserver.com` sort de la CSP `img-src` de
`billet.html` (seule `partager.html` s'en sert encore) et la méta description ne parle plus de QR.

### D3 — Rien en base, rien dans les images

Pas de migration, pas de retraitement des fichiers. Les images déjà enregistrées ou déjà publiées sur
Facebook gardent leur QR : c'est hors d'atteinte.

## Critères d'acceptation

1. Liste des billets : aucune image ne porte de QR ; les images restent réduites (URL en `w_800`).
2. Ma collection : idem.
3. Fiche billet : image sans QR ni libellés « Flashez-moi » ; « Enregistrer sous » donne l'image sans
   QR.
4. Gestion des billets, fenêtre « Partager » : l'aperçu et le lien dans le texte à copier pointent vers
   une image sans QR.
5. Billets à image Drive (sans `ImageUrl`) : même résultat sur les quatre écrans.
6. La page « Partager le site » du menu garde son QR.

## Ce que cette spec ne fait pas

- Les images déjà enregistrées ou publiées (D3).
- La page « Partager le site ».

## Réalisation

Développée le 2026-09-15 — commit `316cdf2` (spec `b544321`).

| Fichier | Ce qui change |
|---|---|
| `app-new.js` | `QR_OVERLAY` supprimée ; `resolveImageUrl()` garde `f_auto,q_auto,w_<taille>` sans la couche |
| `ma-collection.js` | Idem (copie locale de `resolveImageUrl()`) |
| `billet.js` | `getQrUrl()`, `burnQrIntoImage()`, `SITE_BASE` et `QR_REF_*` supprimés ; `renderBillet()` pose l'URL de `resolveImageUrl(b, 1000)` sur l'`<img>` |
| `billet.html` | `api.qrserver.com` retiré de `img-src` ; méta description sans « QR code » |
| `admin.js` | Fenêtre « Partager » : `QR_OVERLAY_SHARE` supprimée, image en `w_1200` sans couche |
| `sw.js` | `CACHE_NAME` : `billets-v310` → `billets-v311` |

**Vérifié** : `node --check` sur les quatre JS ; banc Node **30/30** sur les fonctions réellement
présentes dans les fichiers (extraites, pas recopiées), appliquées à deux vrais billets — `#5604`
(image Cloudinary) et `#5292` (image Drive seule) : aucune URL ne porte plus de couche, la réduction
attendue est conservée (800 / 1000 / 1200), et **Cloudinary répond 200** (`image/jpeg`) pour chacune des
huit URLs. Plus aucune mention de `l_fetch`, `qrserver` ni QR dans les cinq fichiers ; `partager.js`
garde la sienne (critère 6).

**Pas encore vérifié** : le rendu dans un vrai navigateur (dont « Enregistrer sous » sur la fiche) et
sur téléphone. `menu.html` non touché : pas de bump du `?v=` de `global.js`.
