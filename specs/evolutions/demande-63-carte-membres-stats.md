# Demande #63 — Carte des membres sur la page Statistiques

**Complexité** M · **Écran** Statistiques (admin) · **Pour qui** admins · **Priorité** basse

## Contexte

La demande : « sur la page des stats, mettre une map de la france (et pouvoir dézoomer sur le
monde) avec un "pin point" pour chaque membre ayant une adresse, quand on clique sur le pin point,
voir le nom prenom du membre en tooltip ».

La page [admin-stats.html](../../admin-stats.html) existe depuis la demande #26. Elle porte
`data-require-admin="true"` : elle est **déjà réservée aux admins**, et le reste.

### Ce que disent les données (relevé du 2026-09-10, 110 membres)

| Mesure | Valeur | Ce que ça implique |
|---|---|---|
| Membres actifs | 109 | |
| Avec adresse complète | **67** | 42 actifs n'auront pas de pin — à dire à l'écran |
| Communes distinctes | **66** | **une seule** en porte deux → aucun regroupement de pins à écrire |
| Hors France | **11** (BE, ES, PT, PL, CZ, SK) | le dézoom monde est utile, et il faut géocoder hors BAN |
| Adresse sans `pays` | 8 | tous CP français à 5 chiffres → défaut France sans risque |
| Avec `nom` **et** `prenom` | 67/67 | la bulle demandée est triviale |
| Coordonnées en base | **aucune** | c'est tout le coût de la demande |

## Décisions

Les trois arbitrages ont été tranchés par Cyril le 2026-09-10 (cf. commentaire de la demande).

### D1 — La carte reste entre admins

Aucune ouverture aux membres. Le champ `qui` de la demande est corrigé de
`membres,collecteurs,admins` en `admins`.

**Conséquence directe, et c'est la bonne nouvelle de l'arbitrage** : pas de vue dédiée, pas de
policy à écrire. Ouverte aux membres, la carte aurait lu les positions de tous via
`membres_read_self_or_actif` — `USING (is_whitelisted() OR email = auth.jwt() ->> 'email')`, donc
tout membre actif lit l'adresse et le téléphone de tous les autres. C'est le point MEDIUM du
backlog sécurité. Brancher une fonctionnalité visible dessus l'aurait figé.

> ⚠ Au passage : le backlog sécurité nomme encore cette policy `membres_read_authenticated` avec
> `USING (auth.jwt() IS NOT NULL)`. Elle a été remplacée par `membres_read_self_or_actif` dans
> [migration-inscription-publique.sql](../../scripts/migration-inscription-publique.sql). Le
> périmètre s'est resserré (membre **actif** au lieu de n'importe quel JWT), **l'exposition des
> adresses entre membres actifs reste**. Le point du backlog tient, son libellé est à corriger.

### D2 — Les pins tombent au centre de la commune

Pas sur la maison. On géocode le couple **code postal + ville**, jamais la rue. Deux raisons :
les membres ont donné leur adresse pour recevoir des billets, et une carte de densité ne gagne
rien à la précision d'un numéro de rue.

Effet de bord accepté : les deux membres de la même commune auront **exactement** la même
position, donc des pins superposés. Avec un cas sur 67, on ne code pas de décalage.

### D3 — La position est enregistrée en base, recalculée quand l'adresse change

Pas de fichier de coordonnées généré à la main : ça aurait vieilli en silence, exactement le
défaut que l'analyse de #62 cherche à éviter. Un membre qui déménage, ou qui arrive, obtient son
pin sans que personne relance quoi que ce soit.

## Modèle de données

```sql
ALTER TABLE membres ADD COLUMN IF NOT EXISTS latitude     DOUBLE PRECISION;
ALTER TABLE membres ADD COLUMN IF NOT EXISTS longitude    DOUBLE PRECISION;
ALTER TABLE membres ADD COLUMN IF NOT EXISTS geo_adresse  TEXT;
```

`geo_adresse` porte la **clé d'adresse normalisée qui a été géocodée** (`cp|ville|pays`, minuscules
sans accents). Elle fait deux choses à elle seule, et c'est pourquoi il n'y a pas de quatrième
colonne `geo_calcule_at` :

- **idempotence** — si `geo_adresse` égale la clé courante et que `latitude` n'est pas nulle, il n'y
  a rien à recalculer : on n'appelle pas le géocodeur à chaque enregistrement de profil (le mode
  vacances, par exemple, passe par le même PATCH) ;
- **distinguer l'échec de l'absence** — `geo_adresse` renseignée et `latitude` nulle = « on a
  essayé, le géocodeur n'a pas trouvé ». Les deux nulles = jamais tenté.

**Aucune policy RLS à ajouter.** `membres_update_own_profile` autorise déjà un membre actif à
patcher sa propre ligne (role et statut exceptés), et les écrans admin/collecteur patchent déjà
l'adresse. Les nouvelles colonnes suivent.

Migration : [scripts/migration-demande-63-position-membres.sql](../../scripts/migration-demande-63-position-membres.sql)
(gitignoré comme toutes les migrations, reproduit ci-dessus en entier).

## Géocodage

### Deux sources, choisies par le pays

| Cas | Service | Requête |
|---|---|---|
| France (`pays` vide ou « France ») | `api-adresse.data.gouv.fr` | `/search/?q=<cp> <ville>&type=municipality&limit=1` |
| Étranger | `nominatim.openstreetmap.org` | `/search?format=json&limit=1&postalcode=<cp>&city=<ville>&countrycodes=<iso2>` |

La BAN est gratuite, sans clé, sans quota gênant, et son `type=municipality` donne **exactement**
le centre de commune voulu par D2 — c'est la bonne source pour les 56 membres français. Elle ne
connaît pas l'étranger, d'où Nominatim pour les 11 autres : volume négligeable, compatible avec sa
politique d'usage.

`countrycodes` se déduit de l'existant : `window.paysCode(pays)` ([global.js](../../global.js))
rend déjà l'ISO2 à partir du nom français du pays, via la table des drapeaux. Rien à écrire.

Le `pays` vide vaut France (D : les 8 cas ont un CP français à 5 chiffres).

### Déclenchement — un seul point d'entrée

Trois écrans enregistrent une adresse, avec le même PATCH sur `/rest/v1/membres?email=eq.…` :

| Écran | Fichier | Qui |
|---|---|---|
| Mon profil | [profil.js](../../profil.js) `:522` | le membre lui-même |
| Gestion Membres | [users.js](../../users.js) `:568` | admin |
| Détail collecte → fiche membre | [mes-collectes.js](../../mes-collectes.js) `:4652` | collecteur / admin |

Plutôt que de tripler la logique, **un seul helper dans `global.js`** :

```js
window.majPositionMembre(email)   // → Promise, ne rejette jamais
```

Il lit lui-même `code_postal, ville, pays, latitude, geo_adresse` de la ligne, décide s'il y a
quelque chose à faire, géocode, puis PATCHe `latitude/longitude/geo_adresse`. Les trois appelants
se contentent d'un `majPositionMembre(email)` après leur enregistrement réussi — ils n'ont pas à
savoir ce qu'est un géocodeur.

**Toujours en meilleur effort.** L'enregistrement de l'adresse est déjà confirmé à l'utilisateur
quand le géocodage part ; s'il échoue (réseau, service indisponible, commune introuvable), la
sauvegarde reste valide et le membre n'apprend rien d'une panne qui ne le concerne pas. Le défaut
se voit là où il compte : le compteur « sans position » de la carte.

### Rattrapage des 67 adresses existantes

[scripts/geocode-membres-63.py](../../scripts/geocode-membres-63.py) — à jouer **une fois**, par
Cyril, via le Worker `supabase-admin-proxy`. Une requête par seconde, `User-Agent` explicite (sans
quoi Cloudflare répond 1010 et Nominatim refuse), `--dry-run` pour voir avant d'écrire.

## La carte

Leaflet 1.9.4 depuis cdnjs, avec SRI. `cdnjs.cloudflare.com` est **déjà** autorisé en `script-src`
et en `style-src` sur cette page : rien à ouvrir de ce côté.

- **Pins en `L.circleMarker`**, pas en `L.marker`. Les marqueurs par défaut de Leaflet chargent
  leurs images depuis le CDN (`images/marker-icon.png`), ce qui obligerait à ouvrir `img-src` vers
  cdnjs et casse en silence quand on l'oublie. Un `circleMarker` est du SVG : aucune image, aucune
  URL, et c'est plus lisible pour une carte de densité.
- **Bulle au clic** (`bindPopup`) : « Prénom NOM » et la ville. C'est le « tooltip » demandé ;
  en vocabulaire Leaflet un `tooltip` s'ouvre au survol et n'existe pas au doigt.
- **Vue initiale France** (`setView([46.6, 2.4], 5)`), `minZoom: 2` pour laisser dézoomer jusqu'au
  monde comme demandé, et un bouton **« Tout voir »** qui `fitBounds` sur les pins — le geste est
  utile précisément parce que 11 membres sont hors de France.
- **Compteur honnête** sous la carte : « 67 membres situés sur 109 · 42 sans adresse ·
  N sans position ». Une carte qui montre six membres sur dix sans le dire se lit de travers.

### Mode sombre

Les tuiles OSM sont claires par nature. Filtre CSS sur le seul calque des tuiles, les pins étant
dans un autre calque, donc intacts :

```css
[data-theme="dark"] .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(.9) contrast(.9); }
```

### Téléphone

Deux pièges, tous deux traités :

- molette — `scrollWheelZoom: false`, sinon la page cesse de défiler dès qu'on passe sur la carte ;
- doigt — sur mobile la carte démarre avec `dragging: false` et un bouton **« Activer la carte »**
  par-dessus. Sans ça, un glissement destiné à faire défiler la page déplace la carte et l'écran
  se bloque. C'est la leçon de #53 : ce genre de détail ne se voit qu'au doigt, sur un vrai
  téléphone.

## CSP et service worker

| Fichier | Changement | Pourquoi |
|---|---|---|
| `admin-stats.html` | `img-src` += `https://*.tile.openstreetmap.org` | sans ça la carte reste **vide, sans message d'erreur** |
| `profil.html`, `users.html`, `mes-collectes.html` | `connect-src` += `https://api-adresse.data.gouv.fr https://nominatim.openstreetmap.org` | les trois écrans qui géocodent |
| `sw.js` | `NETWORK_ONLY_ORIGINS` += `tile.openstreetmap.org`, `api-adresse.data.gouv.fr`, `nominatim.openstreetmap.org` | sinon tout ça tombe dans la branche **Cache First** : des centaines de tuiles entassées dans le cache du site, et des réponses d'API servies depuis le cache |
| `sw.js` | `CACHE_NAME` → `v303` | après déploiement |

## Critères d'acceptation

1. La page Statistiques affiche une carte centrée sur la France, avec un pin par membre ayant une
   adresse — 67 aujourd'hui.
2. Un clic sur un pin ouvre une bulle portant le prénom, le nom et la ville du membre.
3. On peut dézoomer jusqu'au monde entier ; « Tout voir » cadre d'un coup les 67 pins, Pologne et
   Portugal comprises.
4. Sous la carte, le nombre de membres situés, le nombre sans adresse et le nombre sans position.
5. Les pins sont au centre de la commune : deux membres d'une même commune se superposent.
6. Modifier l'adresse d'un membre depuis **chacun** des trois écrans met sa position à jour sans
   intervention, et un géocodage en échec **ne fait pas échouer** l'enregistrement.
7. Enregistrer un profil **sans changer l'adresse** n'appelle pas le géocodeur.
8. En mode sombre la carte est sombre et les pins restent lisibles.
9. Sur téléphone, un glissement fait défiler la page tant que la carte n'a pas été activée.
10. La carte reste inaccessible à un non-admin (hérité de `data-require-admin`).

## Ce que le développement a appris

Trois choses que l'analyse n'avait pas vues, et qui valaient d'être corrigées avant la mise en
ligne plutôt qu'après.

### Les champs « ville » des membres étrangers sont sales — la requête structurée ne suffit pas

Le géocodeur a été éprouvé sur les **vraies** adresses, pas sur des exemples. Résultat du premier
jet : **BAN 14/14**, dont les 8 membres sans pays renseigné — la règle « pays vide = France » est
confirmée. Mais **Nominatim 7/11**, et les 4 échecs venaient tous du champ `ville` :

| Donnée réelle | Ce qui cloche |
|---|---|
| `4300` / `4300 - WAREMME` | le code postal recopié dans la ville |
| `28934` / `MOSTOLES MADRID` | la province collée au nom |
| `46460` / `SILLA -VALENCIA` | la province collée, avec un tiret |
| `45692` / `MALPICA DE TAJO ( TOLEDO` | parenthèse ouverte, **et un code postal faux d'un chiffre** |

D'où la **cascade à trois essais** : structuré (`postalcode` + `city` + `countrycodes`), puis code
postal seul, puis texte libre. Le code postal seul rattrape 3 cas ; le texte libre rattrape le
quatrième, celui dont le code postal est faux — seul le nom de la ville permettait de le retrouver.
Après cascade : **25/25** sur l'échantillon réel (11 étrangers + 8 sans pays + 6 français).

La leçon vaut au-delà de cette demande : sur ces 14 colonnes d'adresse saisies à la main depuis
des années, **tout ce qui suppose un format propre échouera sur une ligne sur quatre**.

### Les contrôles de Leaflet passaient par-dessus le menu

`.leaflet-top` / `.leaflet-bottom` sont à `z-index: 1000` ; `#menu-placeholder` est collant à
`z-index: 900`. Les boutons de zoom et l'attribution flottaient donc **au-dessus du menu** dès
qu'on faisait défiler la page. Corrigé par un `position: relative; z-index: 0` sur le conteneur de
la carte : sur un élément positionné, `z-index: 0` crée un contexte d'empilement et enferme tous
les `z-index` de Leaflet dedans.

### Une carte construite dans un conteneur masqué se cadre de travers

`#app-content` reste en `display: none` jusqu'à la vérification du rôle. Une carte construite
pendant ce temps mesure 0 sur 0 : `invalidateSize()` la remet à la bonne taille, mais **ne rejoue
pas le cadrage**, et le `fitBounds` initial avait été calculé sur une taille nulle. La vue France
est donc posée **quand la carte a une taille réelle** (`ResizeObserver`), avec un `setView` de
repli à la construction pour le cas où elle n'en aurait jamais.

## Réalisation

Commit **`8572c0b`** (code) — cache `v303`.

| Fichier | Ce qui change |
|---|---|
| [global.js](../../global.js) | `cleGeoAdresse`, `geocoderCommune` (cascade), `majPositionMembre` |
| [admin-stats.js](../../admin-stats.js) | requête des positions isolée, section carte, `initCarteMembres()` |
| [admin-stats.html](../../admin-stats.html) | Leaflet 1.9.4 + SRI, styles de la carte, `img-src` des tuiles |
| [profil.js](../../profil.js), [users.js](../../users.js), [mes-collectes.js](../../mes-collectes.js) | appel à `majPositionMembre()` après enregistrement |
| [profil.html](../../profil.html), [users.html](../../users.html), [mes-collectes.html](../../mes-collectes.html) | `connect-src` des deux géocodeurs |
| [sw.js](../../sw.js) | tuiles et géocodeurs en `NETWORK_ONLY`, `CACHE_NAME` → `v303` |
| `scripts/migration-demande-63-position-membres.sql` | les 3 colonnes (gitignoré, reproduit plus haut) |
| `scripts/geocode-membres-63.py` | rattrapage des 67 adresses (gitignoré) |

### ⚠ Dans cet ordre, sinon la carte ne montre rien

1. **Jouer la migration** dans l'éditeur SQL Supabase. Avant ça, la page des stats fonctionne mais
   la carte affiche « migration non jouée » en nommant le script.
2. **Lancer le rattrapage** : `python scripts/geocode-membres-63.py --dry-run` pour voir, puis sans
   l'option pour écrire. Compter un peu plus d'une minute (une requête par seconde). Sous VPN,
   `set BT_CA_BUNDLE=%USERPROFILE%\.claude\secrets\ne-ca-bundle.pem`.
3. **Puis tester la carte.**
