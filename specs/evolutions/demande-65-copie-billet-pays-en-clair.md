# Demande #65 — en clair

> **Pour qui ce document est écrit.** Pour vous, admin, qui devez dire si ce qui est prévu
> correspond bien à ce qu'on veut. Aucune connaissance technique n'est nécessaire.
> La version technique existe à côté (bascule « Technique » en haut du document).
>
> *Reflète la version technique du commit `99f4290` (11/09/2026).*

## De quoi il s'agit

Quand on copie un billet dans Gestion Billets, la page de création s'ouvre avec les informations
du billet d'origine — pour n'avoir à changer que le millésime, la version ou le nom. **Le pays
disparaissait**, et en le remettant, **le département partait avec**.

## Ce qui se passait, sur un exemple

Vous copiez le billet « Le Mont-Saint-Michel » 2025-6 pour créer le 2026-7.

1. La page s'ouvre : nom, référence, ville (Mont-Saint-Michel), code postal (50170),
   département (FR-50), thème… tout est là. **Le pays aussi, pendant une fraction de seconde.**
2. Puis la liste des pays finit de se charger et, en se remplissant, **elle efface le pays**. Le
   champ revient sur « — Sélectionner un pays — ».
3. Vous cliquez sur Sauvegarder : refusé, le pays est obligatoire.
4. Vous choisissez « France ». Et l'appli, croyant vous aider, remplace le département par
   « FR- » : **le 50 est perdu**. Si vous ne le retapez pas, le billet est enregistré avec « FR- ».

C'est apparu avec la nouvelle page d'édition des billets, début septembre : avant, la liste des
pays était déjà chargée au moment de la copie.

## Ce qui change

- **Le pays reste affiché**, quel que soit le moment où la liste des pays arrive.
- **Choisir le pays qui correspond déjà au département ne l'efface plus.** « FR-50 » reste
  « FR-50 » si l'on choisit France. L'aide reste là où elle sert : si le département est vide, ou
  s'il appartient à un autre pays, l'appli pose toujours le début du code (« CH- » pour la Suisse…).

## Et la ville, et le code postal ?

**Ils étaient déjà bien recopiés.** On l'a vérifié sur les billets copiés ces dernières semaines :
le Mont-Saint-Michel 2026-7, par exemple, a exactement la même ville et le même code postal que le
2025-6. Les billets récents qui n'ont ni ville ni code postal (une série de billets italiens) ont
été saisis de zéro, pas copiés.

**Jean-Philippe, si vous avez vu un billet précis perdre sa ville ou son code postal à la copie,
dites-nous lequel** : ce serait un autre défaut, qu'on n'a pas trouvé.

## Un défaut plus discret, corrigé en même temps

Le même problème existait **en modification** : en ouvrant un billet existant, le pays pouvait
s'effacer tout seul. Et comme le pays n'est pas obligatoire en modification (pour ne pas bloquer
les très anciens billets qui n'en ont pas), **on pouvait enregistrer sans s'en rendre compte et
effacer le pays du billet**. C'est très probablement ce qui est arrivé à « Tours de Notre-Dame de
Paris » 2026-2, qui n'a plus de pays.

## Ce qui ne change pas

- La copie continue volontairement de **ne pas recopier** l'image, le lien Facebook, le
  commentaire, les dates et le collecteur : ils décrivent une émission précise, pas le billet.
- Les billets déjà abîmés **ne sont pas réparés automatiquement**. Quelques-uns ont été repérés
  (Notre-Dame de Paris 2026-2 sans pays, et quatre billets dont le département a raccourci, comme
  « CH-CH » devenu « CH ») ; ils seront regardés un par un, car certains changements ont pu être
  voulus.

## Ce sur quoi on vous demande de vous prononcer

- En copiant un billet, **retrouvez-vous bien tout ce que vous attendez** ?
- Faudrait-il qu'une information **aujourd'hui volontairement laissée de côté** (le commentaire,
  par exemple) soit elle aussi recopiée ?
