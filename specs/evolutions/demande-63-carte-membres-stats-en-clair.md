# Demande #63 — Une carte des membres, en clair

> Version « en clair » de la spec technique `demande-63-carte-membres-stats.md`,
> commit `c615fed`. Elle dit **ce qu'on veut**, pas comment on le construit.

## Ce qui est demandé

Sur la page Statistiques, une carte de France — qu'on peut dézoomer jusqu'au monde — avec un point
par membre dont on connaît l'adresse. On clique sur un point, on voit qui c'est.

## Ce que ça donnera concrètement

Vous ouvrez la page Statistiques. Sous le graphique « Membres par pays », une carte de France
apparaît, semée de points violets. Vous cliquez sur celui posé sur Marseille : une petite bulle
s'ouvre, avec le prénom, le nom et la ville du membre qui habite là. Vous dézoomez d'un cran, deux crans : la Belgique
entre dans le cadre, puis l'Espagne, le Portugal, la Pologne. Un bouton **« Tout voir »** fait le
travail d'un coup et cadre les 67 points d'un bord à l'autre de l'Europe.

Sous la carte, une ligne dit exactement ce qu'elle montre :
**« 67 membres situés sur 109 · 42 sans adresse renseignée »**.

## Ce qui a été décidé, et pourquoi

### La carte reste entre admins

Vous aviez coché « membres, collecteurs et admins » sur la demande. Après discussion, elle reste
sur la page Statistiques, qui est déjà réservée aux admins.

**Ce n'est pas une restriction de confort, c'est ce qui rend la demande simple.** Ouverte à tous
les membres, la carte aurait exigé de décider ce que chacun a le droit de voir des autres, et se
serait appuyée sur un défaut connu — aujourd'hui, n'importe quel membre actif peut déjà lire
l'adresse et le téléphone de tous les autres, et c'est un point qu'on veut refermer, pas
consolider. Entre les six admins, qui gèrent ces adresses au quotidien, la carte ne révèle rien
de neuf.

### Les points tombent au centre de la commune, pas sur la maison

Un point posé sur l'adresse exacte montrerait la maison de 67 personnes. Un point posé au centre
de la commune répond à la même question — **qui habite où** — sans publier l'adresse de personne.
Les membres ont donné leur adresse pour recevoir des billets ; il paraît juste de s'en tenir là.

Conséquence assumée : deux membres de la même commune auront le même point, exactement superposé.
Le cas existe **une seule fois** sur 67, on n'a pas cherché à l'habiller.

### La carte se tient à jour toute seule

Quand un membre déménage, ou qu'un nouveau membre saisit son adresse, son point se place sans que
personne ait à lancer quoi que ce soit — que l'adresse soit modifiée depuis le profil du membre,
depuis la Gestion Membres, ou depuis la fiche membre d'une collecte.

C'était le vrai choix de fond. L'autre option, calculer les positions une bonne fois et les ranger
dans un fichier, était plus rapide à faire — et se serait périmée en silence, chaque nouveau
membre restant invisible sans que personne s'en aperçoive. C'est exactement le piège que la
demande #62 est en train de payer sur les adresses email.

## Ce que la carte ne montrera pas

**42 membres actifs sur 109 n'ont aucune adresse renseignée.** Ils n'auront pas de point, et rien
ne peut y remédier côté logiciel : l'information n'existe pas.

C'est pour ça que le compte est affiché sous la carte au lieu d'être passé sous silence. Une carte
qui montre six membres sur dix sans le dire se lit de travers : on croit voir la répartition du
groupe, on voit celle des membres qui ont rempli leur adresse. Si le manque vous gêne, il se
comble en demandant aux membres concernés de compléter leur profil — pas ici.

Deux autres limites, mineures : un membre dont la commune ne serait pas reconnue resterait sans
point (il serait compté à part sous la carte), et les points ne bougent pas tant que l'adresse
n'a pas été enregistrée.

## Ce qui est volontairement exclu

- **Pas de filtre, pas de recherche sur la carte.** Pour 67 points, l'œil suffit ; les filtres
  existent déjà dans la Gestion Membres.
- **Pas de regroupement des points proches.** Utile à partir de plusieurs centaines de points
  empilés ; ici il y a un seul doublon.
- **Pas de lien vers la fiche du membre depuis la bulle.** Ça peut s'ajouter plus tard si l'envie
  vient à l'usage — autant voir d'abord si la carte sert.
- **Pas de carte hors ligne.** La page Statistiques n'a de sens qu'en ligne de toute façon.

## Ce sur quoi on vous demande de vous prononcer

1. **La bulle affiche « Prénom NOM — Ville ».** Est-ce ce que vous voulez y lire, ou faut-il autre
   chose (le pseudo, le nombre de billets collectés, le statut de collecteur) ?
2. **Le compteur sous la carte annonce les 42 membres sans adresse.** Confirmez-vous qu'on veut ce
   chiffre affiché en clair sur un écran d'administration ?
3. **La vue s'ouvre sur la France.** Certains préfèrent une vue qui cadre d'emblée tous les
   membres, Pologne comprise, quitte à ce que la France soit plus petite. Le bouton « Tout voir »
   fait ce travail à la demande — est-ce suffisant ?

Rien de tout cela ne bloque le développement : ce sont des réglages d'affichage, modifiables après
coup en quelques minutes.
