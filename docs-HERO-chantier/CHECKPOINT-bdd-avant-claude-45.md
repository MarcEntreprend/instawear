# CHECKPOINT BDD — avant application Claude lots 4-5 (réponse 04)

Date : 2026-10-09. Auteur : opencode (Muse Spark).
But : figer l'état EXACT de la base partagée avant de pousser les migrations
de Claude (`20261035_hero_html_table`, `20261036_hero_sync`), pour pouvoir
REVENIR EN ARRIÈRE à tout moment via la migration rollback §7
(`20261037_rollback_claude_html`), sans perte.

Règle d'or : on ne modifie JAMAIS une migration déjà poussée. L'aller =
`20261035` + `20261036` (fichiers créés sur `style-15-claude`, SANS le bloc
cron — voir §5). Le retour = `20261037` (ci-dessous, prête à pousser).
`main` (prod) ne lit aucune de ces structures : aucun impact boutique
pendant la fenêtre de test, sauf rebuilds Vercel si le secret Vault est
créé (déconseillé : voir §5).

Branches : `style-15` (gelée, lot 1) · `style-15-b` (nous, complet) ·
`style-15-claude` (ICI : réponse 03 appliquée en `61765ab`, réponse 04 à
venir). Toutes partagent LA MÊME base Supabase.

---

## 1. Historique migrations distant (attendu AVANT push)

`supabase migration list` doit montrer Local=Remote pour tout jusqu'à
`20261034` inclus (réconciliation faite le 2026-10-07/08 : `repair` puis
push unique de `20261034`). Rappel :
`SELECT version FROM supabase_migrations.schema_migrations ORDER BY 1;`
doit contenir : 20260813, 20260814, 20260815, 20260908120000,
20260909003000, 20260913000000 → 20260913000004, 20260914000000,
20260914000001, 20261006 → 20261034 (chaque entier, sans trou).

## 2. Inventaire HERO avant push (référence = dump `database-info-07102026.md`
+ sondes live + migrations 20261033/20261034)

### 2.1 `public.hero_promotions` — colonnes
| colonne | type | nullable | défaut |
|---|---|---|---|
| id | text | NO | `uuid_generate_v4()` |
| product_id | text | YES (nullable depuis Phase 1) | null |
| title, headline, sub, cta, bg_gradient, tag, image | text | YES | null |
| "order" | integer | NO | 0 |
| show_tag, show_title, is_active | boolean | YES | true |
| layout | text | NO | `'full'` |
| kind | text | NO | `'product'` |
| link_url | text | YES | null |
| tiles | jsonb | YES | null |
| config | jsonb | NO | `'{"v":1}'` |
| html | text | NO | `''` |
| css | text | NO | `''` |
| starts_at, ends_at | timestamptz | YES | null |

Contraintes : `hero_promotions_pkey`, `hero_promotions_product_id_fkey`
(REFERENCES products(id) **ON DELETE SET NULL**), `hero_promotions_kind_check`,
`hero_promotions_layout_check`, `hero_promotions_config_check`
(jsonb object + ≤ 20000 octets), **`hero_promotions_payload_cap_check`
(octet_length(html)+octet_length(css) <= 51200)**,
`hero_promotions_schedule_check` (ends_at > starts_at si les deux).

Triggers (non internes) : `products_set_slug` (BEFORE I/U),
`hero_promotions_guard_html` (BEFORE I/U : html/css réservés super_admin),
`hero_promotions_bump_version` (AFTER I/U/D statement : +1 version).

Policies RLS (Phase 0, fichier `20261033`) :
- `hero_promotions_select_public` : SELECT TO anon,authenticated USING
  `(is_active = true)` — brouillons jamais lisibles en anon (sondé live).
- `hero_promotions_select_admin` : SELECT TO authenticated USING (is_admin()).
- `hero_promotions_insert_admin` / `update_admin` / `delete_admin` :
  admin-only (is_admin()).

### 2.2 `public.hero_version` — ligne unique + colonnes
`id=true, version=5` (sondé anon le 2026-10-08 :
`[{"version":5,"updated_at":"2026-10-08T15:44:00.834386+00:00"}]`),
`updated_at`, `last_hook_at` (réservé Deploy Hook), `hook_pending=false`
attendu (aucun deploy demandé ; à confirmer §4, l'anon ne peut pas les
lire : GRANT limité à `version, updated_at`).
Policy : `hero_version_select_public` (SELECT anon,authenticated USING
(true)) + `REVOKE ALL` + `GRANT SELECT (version, updated_at)`.
⚠️ Conséquence : toute requête anon qui touche une autre colonne
(`id`, `hook_pending`…) répond **403** — c'est ce qui a cassé notre
`getVersion()` (`.eq("id",…)` retiré, `.limit(1)`).

### 2.3 Données hero (vérifiées SQL le 2026-10-08)
5 slides, `order` 0–4 dense, `origin=legacy` partout, couches 2/1/2/1/2,
`payload_bytes=0` pour les 5 (colonnes html/css VIDES — aucune donnée à
perdre au DROP, c'est ce qui rend l'aller-retour sûr) :
- `966d27f9-…` product/full 0 · `c0b77890-…` grid/split 1 ·
  `7685ca4e-…` product/full 2 · `04cafd80-…` grid/split 3 ·
  `76758ad9-…` image/split 4. Tous `is_active=true`.

### 2.4 Objets Phase 1 (fichier `20261034`, vivent en base)
Fonctions : `hero_promotions_guard_html()` (INVOKER),
`hero_bump_version()` (DEFINER, search_path=public),
`reorder_hero_promotions(text[])` (EXECUTE TO authenticated, REVOKE anon).
Pas d'autres fonctions hero. Extensions : pg_cron/pg_net **non requis**
jusqu'ici (ne rien activer pour le test sauf besoin).

## 3. Snapshot AVANT push (à coller dans l'éditeur SQL, garder les sorties)

```sql
-- S1. Colonnes html/css (attendu : 2 lignes, vides partout)
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='hero_promotions'
  AND column_name IN ('html','css') ORDER BY 1;
SELECT count(*) AS lignes_non_vides FROM public.hero_promotions
WHERE html <> '' OR css <> '';

-- S2. Garde + plafond + triggers lot 1 (attendu : 1,1,2 lignes)
SELECT conname FROM pg_constraint
WHERE conrelid='public.hero_promotions'::regclass
  AND conname IN ('hero_promotions_payload_cap_check','hero_promotions_config_check')
ORDER BY 1;
SELECT tgname FROM pg_trigger
WHERE tgrelid='public.hero_promotions'::regclass AND NOT tgisinternal
  AND tgname LIKE 'hero_%' ORDER BY 1;

-- S3. Policies hero_promotions (attendu : 5, cf §2.1)
SELECT policyname, cmd FROM pg_policies
WHERE schemaname='public' AND tablename='hero_promotions' ORDER BY 1;

-- S4. hero_version complet (rôle postgres/éditeur : attendu version=5,
-- hook_pending=false ; last_hook_at NULL tant qu'aucun deploy)
SELECT version, hook_pending, last_hook_at, updated_at
FROM public.hero_version WHERE id = true;

-- S5. Absence objets Claude (attendu : 0 partout)
SELECT count(*) FROM information_schema.tables
WHERE table_schema='public' AND table_name='hero_slide_html';
SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('get_hero_snapshot','hero_public_fingerprint',
    'hero_flush_deploy_hook','hero_sync_status','hero_request_rebuild',
    'hero_slide_html_touch');
SELECT count(*) FROM cron.job WHERE jobname='hero-deploy-hook';
```

## 4. Ce que ses migrations vont changer (diff prévu, rien d'autre)

`20261035` : + table `hero_slide_html` (+5 policies +2 triggers) ;
− trigger `guard_html`, − CHECK `payload_cap`, − colonnes `html/css`
(VIDES : 0 octet perdu) ; +1 bump version. Phase 0 intacte.
`20261036` : + colonne `hero_version.last_fingerprint` ; +5 fonctions
(snapshot/fingerprint/flush/status/rebuild) ; + grants ciblés ;
init `last_fingerprint` ; **SANS le bloc cron** (retiré volontairement :
job par minute sur base partagée = bruit + flips `hook_pending` ; test
manuel par `SELECT hero_flush_deploy_hook(...)` à la place).
Ni Vault ni secret créés (flush répond `no-secret`, prévu par lui).

## 5. Règles de la fenêtre de test (base partagée !)

- Tester son studio UNIQUEMENT avec des slides `is_active=false`
  (créés pour l'occasion, supprimés après) ; ne jamais réordonner ni
  toucher les 5 slides live (prod + polling 15-b les verraient).
- Ne pas tester les chemins HTML de `15-b` pendant la fenêtre (`getHtml`
  et save HTML répondent 400 tant que les colonnes sont absentes ;
  la boutique dégrade gracieusement, sans HTML).
- Ne pas créer le secret Vault (sinon chaque edit déclenche de vrais
  rebuilds Vercel de prod). Ne pas recréer le cron à la main.
- `main` : aucun impact (son code ignore ces structures).

## 6. Rollback — migration `20261037_rollback_claude_html.sql` (PRÊTE,
-- à pousser pour revenir ; ne JAMAIS éditer 20261035/36 après push)

```sql
-- supabase/migrations/20261037_rollback_claude_html.sql
-- Retour à l'état §2 : re-crée colonnes + garde + plafond, rapatrie le
-- contenu écrit dans hero_slide_html pendant la fenêtre, puis démonte
-- TOUT ce que 20261035/36 ont ajouté. Idempotent.

-- ─── 1) Colonnes (elles étaient vides avant ; le §2 rapatrie la fenêtre)
ALTER TABLE public.hero_promotions
  ADD COLUMN IF NOT EXISTS html text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS css  text NOT NULL DEFAULT '';

-- ─── 2) Rapatriement table → colonnes (écrits du studio Claude testés)
UPDATE public.hero_promotions h
SET html = x.html, css = x.css
FROM public.hero_slide_html x
WHERE x.slide_id = h.id AND (x.html <> '' OR x.css <> '');

-- ─── 3) Garde super_admin (texte exact du lot 1, fichier 20261034)
CREATE OR REPLACE FUNCTION public.hero_promotions_guard_html()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE changed boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    changed := (COALESCE(NEW.html, '') <> '' OR COALESCE(NEW.css, '') <> '');
  ELSE
    changed := (NEW.html IS DISTINCT FROM OLD.html OR NEW.css IS DISTINCT FROM OLD.css);
  END IF;
  IF changed
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role')
     AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'hero_promotions: html/css réservés aux super_admin'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS hero_promotions_guard_html ON public.hero_promotions;
CREATE TRIGGER hero_promotions_guard_html
  BEFORE INSERT OR UPDATE ON public.hero_promotions
  FOR EACH ROW EXECUTE FUNCTION public.hero_promotions_guard_html();

-- ─── 4) Plafond 50 Ko (lot 1)
ALTER TABLE public.hero_promotions DROP CONSTRAINT IF EXISTS hero_promotions_payload_cap_check;
ALTER TABLE public.hero_promotions
  ADD CONSTRAINT hero_promotions_payload_cap_check
  CHECK (octet_length(html) + octet_length(css) <= 51200);

-- ─── 5) Démonter le cron (si recréé à la main malgré §5)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    DELETE FROM cron.job WHERE jobname = 'hero-deploy-hook';
  END IF;
END $$;

-- ─── 6) Démonter ses fonctions (table encore là pour l'ordre des drops)
DROP FUNCTION IF EXISTS public.hero_request_rebuild();
DROP FUNCTION IF EXISTS public.hero_sync_status();
DROP FUNCTION IF EXISTS public.hero_flush_deploy_hook(boolean);
DROP FUNCTION IF EXISTS public.hero_public_fingerprint();
DROP FUNCTION IF EXISTS public.get_hero_snapshot();
DROP FUNCTION IF EXISTS public.hero_slide_html_touch();

-- ─── 7) Démonter la table (policies + triggers suivent)
DROP TABLE IF EXISTS public.hero_slide_html;

-- ─── 8) Colonne d'empreinte (ajout 20261036, inutile hors test)
ALTER TABLE public.hero_version DROP COLUMN IF EXISTS last_fingerprint;

NOTIFY pgrst, 'reload schema';
```

Ordre de retour : `supabase db push` (n'applique que 20261037, l'historique
étant réconcilié) → relancer S1–S5 (attendus §2/§3 : colonnes revenues,
garde+plafond présents, table/fonctions/cron à 0) → re-tester `/admin`
15-b (save HTML super_admin OK, plus de 400).

## 7. Modèle attendu APRÈS rollback = §2 à l'identique

Colonnes, contraintes, triggers, policies, fonctions : cf §2.1–§2.4.
Données : les 5 slides + tout contenu HTML écrit pendant la fenêtre
(rapatrié §6.2, jamais perdu). `hero_version.version` aura avancé
(bumps normaux : +1 par migration, +1 par écriture) — c'est un compteur,
pas un état à restaurer.
