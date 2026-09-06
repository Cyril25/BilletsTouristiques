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

## Trouver les deux inscriptions du test collecteur

Le test « des deux côtés » demande deux cibles : une inscription **sur une collecte du
collecteur testé**, une autre **sur la collecte de quelqu'un d'autre**. Cette requête les
donne d'un coup — remplacer l'e-mail :

```sql
WITH moi AS (SELECT alias FROM collecteurs WHERE email_membre = 'EMAIL_DU_COLLECTEUR')
SELECT 'A MOI (doit passer)' AS cas, i.id AS inscription_id, c.id AS collecte_id, c.nom
  FROM inscriptions i JOIN collectes c ON c.id = i.collecte_id
 WHERE c.collecteur IN (SELECT alias FROM moi) LIMIT 1;

WITH moi AS (SELECT alias FROM collecteurs WHERE email_membre = 'EMAIL_DU_COLLECTEUR')
SELECT 'PAS A MOI (doit etre refuse)' AS cas, i.id, c.id AS collecte_id, c.nom
  FROM inscriptions i JOIN collectes c ON c.id = i.collecte_id
 WHERE c.collecteur IS NOT NULL
   AND c.collecteur NOT IN (SELECT alias FROM moi) LIMIT 1;
```

Au 06/09/2026, la copie porte **21 collecteurs distincts**, dont **11 ont au moins une
collecte avec des inscriptions** — de quoi choisir.

## Forcer l'appel depuis la console

Le front n'utilise pas `supabase-js` : il passe par le helper global `supabaseFetch`, qui
met un **jeton Firebase** en `Authorization` — et c'est le claim `email` de ce jeton que
lisent les policies. Connecté sur le front de test **avec le compte collecteur**, dans la
console :

```js
// Ecrit statut_paiement A L'IDENTIQUE : la policy est traversee pour de vrai,
// mais la donnee ne bouge pas. Rien a remettre en etat apres le test.
async function testePolicy(id) {
  const avant = await supabaseFetch(`/rest/v1/inscriptions?id=eq.${id}&select=statut_paiement`);
  const res = await supabaseFetch(`/rest/v1/inscriptions?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({ statut_paiement: avant[0].statut_paiement })
  });
  console.log(id, res.length ? 'PASSE' : 'REFUSE', res);
}
await testePolicy(<INSCRIPTION_A_MOI>);      // attendu : PASSE
await testePolicy(<INSCRIPTION_D_UN_AUTRE>); // attendu : REFUSE
```

⚠ **Lire le résultat, pas l'absence d'erreur.** Une policy `UPDATE` qui ne matche aucune
ligne **ne lève pas d'erreur** : PostgREST rend une **liste vide**. Un `catch` qui ne se
déclenche pas ne prouve donc rien — c'est `[]` qui prouve le refus, et une ligne rendue qui
prouve le passage. C'est toute la raison du `res.length` ci-dessus.

*(Colonnes vérifiées sur la copie le 06/09 : la table porte `statut_paiement`, pas de
`paiement_valide` ; `id` est un `integer`, `collecte_id` un `uuid`.)*

Pour éprouver le **gel des champs**, même forme avec une valeur qui change vraiment — le
refus attendu vient alors du `WITH CHECK`, pas du périmètre :

```js
// Deplacer une inscription vers une autre collecte : doit etre REFUSE
// meme si les DEUX collectes appartiennent au collecteur.
supabaseFetch('/rest/v1/inscriptions?id=eq.<INSCRIPTION_A_MOI>', {
  method: 'PATCH',
  headers: { 'Prefer': 'return=representation' },
  body: JSON.stringify({ collecte_id: '<AUTRE_COLLECTE_A_MOI_UUID>' })
}).then(r => console.log(r.length ? 'PASSE (anormal)' : 'REFUSE (attendu)', r));
```

## État de la copie — contrôles passés

**✅ Tout vérifié le 06/09/2026, après le réveil du projet** — la base était en *pause*,
pas supprimée, et la copie migrée est intacte :

| Contrôle | Attendu | Mesuré |
|---|---|---|
| Marqueur TEST-ONLY | `TESTENV` | `TESTENV` ✅ |
| `inscriptions` sans `collecte_id` | 0 | **0** ✅ |
| `billets` | ~5 436 | 5 441 |
| `collectes` | ~5 292 | 5 297 |
| `inscriptions` | ~4 230 | 4 242 |
| `billets.Collecteur_deprecated` | présente | présente ✅ |
| Policies `inscriptions_*_collecteur` | 3 | 3 (delete, insert, update) ✅ |
| Billets à plusieurs collectes | 0 | **0** ✅ |

Les écarts avec la répétition du 31/07 sont le **résidu des tests eux-mêmes** (+5 billets,
+5 collectes, +12 inscriptions). Le **+5/+5** est en soi une bonne nouvelle : l'invariant
« une collecte créée par billet créé » tient toujours, y compris sur les billets nés après
la migration.

Le compte à 0 billet multi-collecte confirme aussi que le défaut des **deux règles
concurrentes de « collecte principale »** reste **latent** — rien ne s'est déclenché depuis
juillet.

> ⏱ Le réveil prend ~2 minutes et passe par `521` (origine injoignable) puis `404`
> (PostgREST debout, cache de schéma pas encore chargé) avant le `200`. Ne pas conclure
> à une panne avant d'avoir attendu.

Si la base a été **supprimée** et non mise en pause, le dump du 30/07 est encore sur le
disque (`Documents\Perso\Backups\BilletsTouristiques\2026-07-30_2124`, 4,2 Mo) — mais il
date d'avant la migration : il faudrait rejouer marqueur + scripts 1 et 2 derrière le
restore, comme à la répétition.

---

## Quand c'est vert

Il ne reste que la fenêtre à choisir et à prévenir Geneviève, Laura, Jean-Philippe, Damien
et Vanessa — puis [CHECKLIST-JOUR-J-16.md](CHECKLIST-JOUR-J-16.md).
