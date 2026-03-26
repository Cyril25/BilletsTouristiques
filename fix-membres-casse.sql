-- Correction de la casse des données existantes dans la table membres
-- Nom et Ville → MAJUSCULES
-- Prénom → Première lettre de chaque mot en majuscule (Title Case)

-- 1) Nom en majuscules
UPDATE membres
SET nom = UPPER(nom)
WHERE nom IS NOT NULL
  AND nom <> UPPER(nom);

-- 2) Ville en majuscules
UPDATE membres
SET ville = UPPER(ville)
WHERE ville IS NOT NULL
  AND ville <> UPPER(ville);

-- 3) Prénom en Title Case (initcap gère les espaces, tirets, apostrophes)
UPDATE membres
SET prenom = INITCAP(prenom)
WHERE prenom IS NOT NULL
  AND prenom <> INITCAP(prenom);
