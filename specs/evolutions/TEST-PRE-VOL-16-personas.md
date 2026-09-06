# Test pré-vol #16 — les personas, sur la copie de test

Le seul morceau du chantier #16 jamais exécuté. Tout le reste est fait : dev terminé,
migration jouée et **vérifiée chiffres en main** sur la copie le 31/07/2026, bug de
navigation trouvé et corrigé (`e8c7c92`).

Ce document ne dit que **ce qui reste à éprouver, et pourquoi c'est celui-là**. Le jour J
lui-même est dans [CHECKLIST-JOUR-J-16.md](CHECKLIST-JOUR-J-16.md).

---

## Où ça se passe

| | |
|---|---|
| Base | `ijxajtxnhbczgiarkefo` (la copie jetable, **déjà migrée** : scripts 1 et 2 joués le 31/07) |
| Front | `https://cyril25.github.io/BilletsTouristiques-TestEnv/` |
| Branche du front de test | `test/demande-16-refonte-collectes` — porte bien `e8c7c92` |

⚠ **Ne pas tester depuis la copie de travail locale** : la branche courante
`prepa-bascule-prod-16` a **retiré l'aiguillage `BT_IS_TESTENV`** (E1). Elle pointe sur la
**prod**. Le front de test est celui déployé sur `BilletsTouristiques-TestEnv`, pas celui
qu'on a sous la main.

Vérifié le 06/09/2026 : le front de test est en ligne, sert bien la base de test et porte le
code de la refonte. Il n'y a donc que la base à réveiller.

---

## Ce que la lecture des policies a changé au plan

J'avais recommandé de tester avec **deux comptes membres**, pour vérifier qu'un membre ne
voit pas les inscriptions de l'autre. **Le code dit que c'est inutile**, et la nuance vaut
d'être connue :

```sql
-- migration-5-4-inscriptions.sql, bien avant #16
CREATE POLICY "inscriptions_read_whitelisted" ON inscriptions FOR SELECT
  USING (is_whitelisted());   -- tout membre whitelisté lit TOUTES les inscriptions
```

La lecture est ouverte à tout membre whitelisté **depuis toujours et volontairement** (les
badges du catalogue en dépendent), et le script 2 de #16 **ne touche aucune policy de
SELECT** — il ne crée que `DELETE`, `INSERT` et `UPDATE` pour le collecteur. Un test de
cloisonnement en lecture ne révélerait donc pas un défaut de la bascule : il redécouvrirait
un choix de conception antérieur.

**Ce qui change vraiment avec #16, c'est le périmètre d'écriture du collecteur.** Avant, il
était scopé par `billets.Collecteur` ; désormais par la collecte :

```sql
collecte_id IN (SELECT c.id FROM collectes c
                WHERE c.collecteur IN (SELECT alias FROM collecteurs
                                       WHERE email_membre = auth.jwt() ->> 'email'))
```

C'est **ça** qu'il faut éprouver, et ça ne se voit qu'avec un vrai JWT — `USING` et
`WITH CHECK` ne s'évaluent pas dans l'éditeur SQL, où l'on est `service_role`.

---

## Les tests, dans l'ordre d'importance

### 1. Membre — inscription puis désinscription réelles

Le test qui compte le plus : il traverse `inscriptions_insert_own`
(`membre_email = auth.jwt() ->> 'email'`), les triggers de compteurs, et la policy de
suppression.

- [ ] Se connecter avec un **compte de test membre**, catalogue → une collecte **ouverte**.
- [ ] S'inscrire. L'inscription apparaît dans « Mes inscriptions », quantités et montant justes.
- [ ] Le compteur d'inscrits de la collecte a bougé (côté admin).
- [ ] Se désinscrire. La ligne disparaît, le compteur redescend.
- [ ] **Recharger la page** avant de conclure : le bug `e8c7c92` était précisément une
      écriture perdue parce que la page se déchargeait avant l'envoi. Un écran juste ne
      prouve rien tant qu'on n'a pas rechargé.

### 2. Collecteur — le périmètre d'écriture, dans les deux sens

C'est la logique neuve. Le tester d'un seul côté ne prouve rien : une policy qui laisse tout
passer réussit le test « je peux agir sur ma collecte ».

- [ ] Ses collectes, **et elles seules**, apparaissent dans « Mes collectes ».
- [ ] Sur **une de ses collectes** : modifier une inscription (statut de paiement) — ça passe.
- [ ] Sur **une collecte qui n'est pas la sienne** : la même action doit être **refusée**.
      Si l'interface ne l'offre pas, forcer l'appel depuis la console du navigateur — c'est
      la policy qu'on teste, pas le bouton.
- [ ] Vérification des paiements limitée à ses inscrits.

Le gel des champs est dans le `WITH CHECK` (`membre_email`, `nb_normaux`, `nb_variantes`,
`billet_id`, `collecte_id` ne peuvent pas changer) :

- [ ] Tenter de déplacer une inscription vers une autre collecte → refusé.

### 3. Admin — déjà passé le 31/07, à re-survoler

C'est ce persona qui avait fait sortir `e8c7c92`. À reprendre rapidement :

- [ ] Carte avec statut et compteur, modale groupée par collecte.
- [ ] Ajout d'une inscription sur une collecte précise.
- [ ] **Création d'un billet** → retour à la liste, avec le compte de pré-inscrits dans le toast.

---

## Avant de commencer

- [ ] La base de test répond : `nslookup ijxajtxnhbczgiarkefo.supabase.co` doit résoudre
      (au 06/09 elle était en NXDOMAIN, projet en pause).
- [ ] Le marqueur TEST-ONLY est toujours là :
      `SELECT * FROM public._bt_env;` → doit rendre `TESTENV`.
      *(Un restore le supprimerait — `DROP SCHEMA public CASCADE`.)*
- [ ] La copie est bien dans l'état **migré** : `SELECT COUNT(*) FROM collectes;` → ~5 292,
      et `SELECT COUNT(*) FROM inscriptions WHERE collecte_id IS NULL;` → **0**.

Si la base a été **supprimée** et non mise en pause, le dump du 30/07 est encore sur le
disque (`Documents\Perso\Backups\BilletsTouristiques\2026-07-30_2124`, 4,2 Mo) — mais il
date d'avant la migration : il faudrait rejouer marqueur + scripts 1 et 2 derrière le
restore, comme à la répétition.

---

## Quand c'est vert

Il ne reste que la fenêtre à choisir et à prévenir Geneviève, Laura, Jean-Philippe, Damien
et Vanessa — puis [CHECKLIST-JOUR-J-16.md](CHECKLIST-JOUR-J-16.md).
