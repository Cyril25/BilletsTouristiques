# Checklist jour J — bascule #16 (à cocher en direct)

Le **pourquoi** de chaque étape est dans [RUNBOOK-E-bascule-prod-16.md](RUNBOOK-E-bascule-prod-16.md).
Ce fichier-ci ne dit que **quoi faire, dans quel ordre**. Les `§` renvoient au runbook.

Base de prod : `lhwcoybugdsggcclhtgb` · Front : **`cyril25.github.io/BilletsTouristiques/`** (branche `main`)

> ⚠ **L'URL porte le nom du dépôt.** `cyril25.github.io/` tout court renvoie un 404 —
> corrigé le 06/09/2026, après avoir constaté que les deux `curl` de l'étape 4 tapaient
> cette adresse-là. Sur une page 404, `grep -c` rend `0` : le premier contrôle aurait donc
> échoué et le second réussi **pour la mauvaise raison**, juste après le point de
> non-retour.

---

## 0. Avant de commencer (T-15 min)

- [ ] Prévenir Geneviève, Laura, Jean-Philippe, Damien et Vanessa : « site indisponible de X à Y, n'enregistrez rien ».
- [ ] **VPN Canton NE coupé** (le port 5432 ne passe pas depuis le VPN).
- [ ] **Docker Desktop démarré** (le dump et le rollback en dépendent).
- [ ] SQL Editor ouvert **sur la prod** — vérifier la base sélectionnée. *C'est l'erreur du 2026-07-24.*

---

## 1. Contrôles pré-vol — SQL Editor de la prod (§4.1)

```sql
SELECT (SELECT COUNT(*) FROM billets)                                    AS billets,
       (SELECT COUNT(*) FROM inscriptions)                               AS inscriptions,
       (SELECT COUNT(*) FROM collectes)                                  AS collectes,
       (SELECT COUNT(*) FROM inscriptions WHERE collecte_id IS NOT NULL) AS deja_rattachees,
       (SELECT COALESCE(SUM(nb_normaux), 0) FROM inscriptions)           AS total_normaux,
       (SELECT COALESCE(SUM(nb_variantes), 0) FROM inscriptions)         AS total_variantes;

SELECT COUNT(*) AS doit_etre_zero FROM collectes WHERE nom = 'Collecte initiale';

SELECT COUNT(*) AS doit_etre_zero FROM information_schema.tables
 WHERE table_schema = 'public' AND table_name = '_bt_env';
```

- [ ] Les deux `doit_etre_zero` valent **0**.
- [ ] Les volumes ressemblent à ceux de la répétition (~5 400 billets, ~4 200 inscriptions).

> **GO / NO-GO.** Si un contrôle cloche, on s'arrête ici : rien n'a encore été touché.

---

## 2. Dump de sécurité (§4.2)

- [ ] Lancer [`scripts\backup-supabase.ps1`](../../scripts/backup-supabase.ps1)

```powershell
.\scripts\backup-supabase.ps1
```

- [ ] Contrôle : `data.sql` fait **plusieurs Mo** (~4 Mo), pas quelques Ko.
- [ ] Noter le dossier horodaté produit : `………………………………`

> ⏱ **À partir d'ici l'horloge tourne** : tout ce qui sera écrit en prod ne survivra pas à un restore.

---

## 3. Script 1 — structure (§4.3)

- [ ] Coller **tout** [`scripts\migration-demande-16-1.sql`](../../scripts/migration-demande-16-1.sql) dans le SQL Editor de la prod, exécuter.

À lire dans les `NOTICE` : nombre de collectes créées · bloc REPORTING avec les sommes
d'argent **identiques avant/après** · dérivation rejouée · 7 renommages `_deprecated` ·
3 colonnes droppées · `COMMIT`.

- [ ] Aucun `ERROR`. *(Si `ERROR` : transaction annulée, rien n'a bougé, la prod est intacte — pas besoin de restore.)*
- [ ] `WARNING [A9.7]` éventuel : **noter la liste**, non bloquant.

Contrôles immédiats :

```sql
SELECT COUNT(*) FROM collectes;                              -- ~ nb de billets actifs
SELECT COUNT(*) FROM inscriptions WHERE collecte_id IS NULL; -- doit valoir 0
SELECT COUNT(*) FROM billets WHERE "Prix" IS NOT NULL;       -- doit ERREURER (colonne renommée)
```

- [ ] Les trois se comportent comme annoncé.

> 🔴 **Point de non-retour.** L'ancien front ne fonctionne plus. Seul retour possible : le restore du dump.
> **Enchaîner immédiatement sur l'étape 4, sans pause.**

---

## 4. Front — déploiement (§4.4)

Le E1 (retrait du TEST-ONLY) est **déjà fait** sur `prepa-bascule-prod-16`. Le merge est un
fast-forward, sans conflit.

```
git checkout main
git merge prepa-bascule-prod-16
git push origin main
```

- [ ] Poussé. Attendre ~1 min que GitHub Pages reconstruise.
- [ ] Vérifier que le JS servi est bien le neuf :

```
curl -s https://cyril25.github.io/BilletsTouristiques/global.js | grep -c versionsOuvertesCollecte
curl -s https://cyril25.github.io/BilletsTouristiques/global.js | grep -c ijxajtxnhbczgiarkefo
```

- [ ] Le premier renvoie **≥ 1**, le second **0** (aucune trace de la copie de test).

---

## 5. Fumée en lecture, avant le script 2

- [ ] Le **catalogue** s'affiche : prix, dates et collecteurs présents ; la phrase « Par X au prix de Y euros… » est complète.

> Si le catalogue est cassé ici, ne pas jouer le script 2 : corriger ou décider du restore.

---

## 6. Script 2 — RLS et collecteur (§4.5)

Le garde-fou a été **inversé le 2026-07-31** : le script tourne directement sur la prod et
refuse désormais la copie de test. Plus rien à retirer à la main.

- [ ] Coller [`scripts\migration-demande-16-2.sql`](../../scripts/migration-demande-16-2.sql) dans le SQL Editor de la prod, exécuter.

```sql
SELECT polname FROM pg_policy WHERE polrelid = 'inscriptions'::regclass ORDER BY 1;
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'billets' AND column_name LIKE 'Collecteur%';   -- Collecteur_deprecated
```

- [ ] Les policies `inscriptions_*_collecteur` sont là, `Collecteur_deprecated` aussi.

---

## 7. Checklist de fumée complète (§6) — 3 personas

- [ ] **Membre** : catalogue · fiche billet (statut, collecteur, prix, dates) · mes inscriptions (dont un billet **variante**) · bouton PayPal hors pré-collecte.
- [ ] **Membre** : **s'inscrire sur une collecte ouverte**. *Seul test qui valide RLS + triggers de bout en bout.* ⚠ Le membre **ne se désinscrit pas** (règle produit) : c'est le **collecteur** qui le retire depuis « Mes collectes » — et ce retrait est du même coup le test de la policy `inscriptions_delete_collecteur`.
- [ ] **Collecteur** : ses collectes **et elles seules** · détail · vérification des paiements limitée à ses inscrits.
- [ ] **Admin** : carte avec statut et compteur · modale groupée par collecte · ajout d'une inscription sur une collecte précise · **création d'un billet** → retour à la liste avec le compte de pré-inscrits.

---

## 8. Après la bascule (§4.6)

- [ ] Jouer [`scripts\migration-demande-33-notif-ciblee-membre.sql`](../../scripts/migration-demande-33-notif-ciblee-membre.sql) (en attente depuis le 25).
- [ ] Créer la notification « nouveautés » pour les membres (cible `tous`).
- [ ] Supprimer le projet jetable `ijxajtxnhbczgiarkefo`, le Worker `supabase-admin-proxy-test` et ses secrets, le dépôt `BilletsTouristiques-TestEnv`.
- [ ] Garder le dump quelques jours, puis le supprimer (données personnelles).
- [ ] **NE PAS** dropper les colonnes `*_deprecated` — ce sont elles qui rendent un retour envisageable.

---

## Si ça tourne mal (§5)

**On corrige en avant** si c'est un affichage, un écran admin, ou un cas isolé : le correctif
se pousse en minutes. **On restaure** si les montants dus sont faux, si des inscriptions ont
disparu, ou si le catalogue / mes inscriptions est inutilisable pour les membres.

- **Le script 2 seul a mal tourné** → [`scripts\rollback-prod-demande-16-2.sql`](../../scripts/rollback-prod-demande-16-2.sql).
  Remet policies, trigger et colonne à l'identique, sans toucher aux données.
- **Retour complet avant le script 1** → hors VPN, Docker démarré :

  ```powershell
  .\scripts\restore-prod-supabase.ps1
  ```

  N'accepte que la prod, affiche l'âge du dump, demande la référence du projet puis la phrase
  `RESTAURER LA PRODUCTION`. Le contrôle final doit montrer `collectes` disparue et
  `Prix`/`Collecteur` revenues sur `billets`. Puis redéployer l'ancien `main` et prévenir
  l'équipe que les écritures postérieures au dump sont perdues.
