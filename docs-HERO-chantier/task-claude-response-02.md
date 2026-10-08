# Hero Studio — Lot 1 : la couche données

Je livre en deux lots. Ce lot 1 est la migration, le schéma de validation partagé, les types et l'API, **sans aucun changement visuel** : l'ancien rendu continue de lire les colonnes legacy. Tu pourras lancer la migration et vérifier le résultat avant que je touche au rendu. Le lot 2 sera `HeroSlideView` + `HeroCarousel` + `App.tsx`, avec le critère LCP.

Trois points que ton schéma m'a fait trancher, à valider :

1. **FK `product_id` : `ON DELETE SET NULL` au lieu de `CASCADE`.** Supprimer un produit ne détruira plus un slide composé (HTML, image) en silence. Pour la boutique, le slide devient invisible comme avant.
2. **Bug trouvé dans `heroPromotionsApi.update` (`supabaseApi.ts`).** Un update partiel, comme le bouton œil `{ isActive: false }`, réécrivait aussi `layout → "full"`, `kind → "product"`, `link_url → null` et `tiles → null`, parce que `...sanitizeHeroPhase2(promo)` applique des valeurs par défaut. Ça explique probablement pourquoi ta ligne `7685ca4e…` est un `product/full` vide. Corrigé dans ce lot.
3. **`productId: ""` = slide sans produit côté TypeScript.** La base stocke `NULL`. Ça évite de casser tout le code existant qui attend un `string` (`PromotionsPage`, `App`). On passera à `string | null` au lot 2.

J'ajoute aussi `config.origin: "legacy" | "studio"`. Tant que l'ancien formulaire existe, il régénère la config depuis les colonnes legacy. Dès qu'un slide est édité par le studio (`"studio"`), l'ancien formulaire ne peut plus l'écraser.

---

## 1. Migration (backend, Supabase) — nouveau fichier

```sql
-- supabase/migrations/20261034_hero_studio_phase1.sql
-- Hero Studio — Phase 1 : modèle de composition, slides sans produit, planification,
-- compteur de version (trigger), reorder atomique, garde HTML super_admin.
-- Phase 0 (RLS hero_promotions) INCHANGÉE : aucune policy existante n'est touchée.
-- Idempotent : IF NOT EXISTS / DROP IF EXISTS / backfill ciblé (config sans 'layers').

BEGIN;

-- ─── 1) Colonnes ────────────────────────────────────────────────────────
ALTER TABLE public.hero_promotions
  ADD COLUMN IF NOT EXISTS config    jsonb       NOT NULL DEFAULT '{"v":1}'::jsonb,
  ADD COLUMN IF NOT EXISTS html      text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS css       text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at   timestamptz;

-- ─── 2) product_id nullable + FK SET NULL ───────────────────────────────
ALTER TABLE public.hero_promotions ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.hero_promotions DROP CONSTRAINT IF EXISTS hero_promotions_product_id_fkey;
ALTER TABLE public.hero_promotions
  ADD CONSTRAINT hero_promotions_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- ─── 3) Ordre dense 0..n-1 (tes 5 lignes ont des doublons : 1,1,3,4,4) ──
WITH ranked AS (
  SELECT id, (row_number() OVER (ORDER BY "order", id) - 1)::int AS rn
  FROM public.hero_promotions
)
UPDATE public.hero_promotions h
SET "order" = r.rn
FROM ranked r
WHERE h.id = r.id AND h."order" IS DISTINCT FROM r.rn;

-- ─── 4) Backfill kind/layout/tiles → config (couches) ───────────────────
-- Miroir EXACT de buildHeroConfigFromLegacy (src/lib/heroSchema.ts).
-- Seules les lignes sans 'layers' sont traitées (re-jouable sans risque).
WITH s AS (
  SELECT
    h.id, h.kind, h.layout, h.product_id,
    NULLIF(btrim(h.image), '')                     AS image,
    COALESCE(btrim(h.tag), '')                     AS tag,
    COALESCE(h.show_tag, true)                     AS show_tag,
    COALESCE(btrim(h.headline), '')                AS headline,
    COALESCE(btrim(h.sub), '')                     AS sub,
    COALESCE(NULLIF(btrim(h.cta), ''), 'Discover') AS cta,
    NULLIF(btrim(h.link_url), '')                  AS link,
    COALESCE(btrim(h.bg_gradient), '')             AS bg,
    COALESCE((
      SELECT jsonb_agg(
               jsonb_build_object('src', q.src, 'label', q.label, 'link', q.link)
               ORDER BY q.rn)
      FROM (
        SELECT btrim(e.t->>'image')                               AS src,
               left(COALESCE(btrim(e.t->>'label'), ''), 40)       AS label,
               NULLIF(btrim(e.t->>'link'), '')                    AS link,
               row_number() OVER (ORDER BY e.ord)                 AS rn
        FROM jsonb_array_elements(
               CASE WHEN jsonb_typeof(h.tiles) = 'array' THEN h.tiles ELSE '[]'::jsonb END
             ) WITH ORDINALITY AS e(t, ord)
        WHERE jsonb_typeof(e.t) = 'object'
          AND COALESCE(btrim(e.t->>'image'), '') <> ''
      ) q
      WHERE q.rn <= 3
    ), '[]'::jsonb)                                AS tiles
  FROM public.hero_promotions h
  WHERE h.config->'layers' IS NULL
)
UPDATE public.hero_promotions h
SET config = jsonb_build_object(
  'v', 1,
  'origin', 'legacy',
  'sizing', jsonb_build_object(
    'mode', 'fixed', 'width', 'full',
    'height', jsonb_build_object('unit', 'vh', 'value', 78)),
  'background', jsonb_build_object('gradient', s.bg),
  'layers',
    CASE
      WHEN s.kind = 'image' THEN jsonb_build_array(
        jsonb_build_object('type', 'image', 'src', s.image, 'alt', '',
                           'fit', 'cover', 'dim', 1, 'scrim', 'bottom'),
        jsonb_build_object('type', 'text', 'anchor', 'bottom-left', 'tone', 'light',
                           'tag', s.tag, 'showTag', s.show_tag,
                           'headline', s.headline, 'headlineLines', 'first',
                           'sub', '', 'showSub', false, 'fromProduct', true))
      WHEN s.kind = 'grid' THEN jsonb_build_array(
        jsonb_build_object('type', 'tiles',
          'main', jsonb_build_object(
            'src', s.image,
            'link', s.link,
            'label', left(concat_ws(' — ',
                        NULLIF(btrim(split_part(s.headline, E'\n', 1)), ''),
                        NULLIF(s.sub, '')), 60),
            'ctaLabel', s.cta,
            'fromProduct', true),
          'items', s.tiles))
      WHEN s.layout = 'split' THEN jsonb_build_array(
        jsonb_build_object('type', 'card', 'side', 'right', 'src', s.image, 'alt', '',
                           'productId', s.product_id, 'showMeta', false),
        jsonb_build_object('type', 'text', 'anchor', 'left-middle', 'tone', 'auto',
                           'tag', s.tag, 'showTag', s.show_tag,
                           'headline', s.headline, 'headlineLines', 'all',
                           'sub', s.sub, 'showSub', true, 'fromProduct', true))
      ELSE jsonb_build_array(
        jsonb_build_object('type', 'image', 'src', s.image, 'alt', '',
                           'fit', 'cover', 'dim', 0.55, 'scrim', 'left'),
        jsonb_build_object('type', 'text', 'anchor', 'left-middle', 'tone', 'light',
                           'tag', s.tag, 'showTag', s.show_tag,
                           'headline', s.headline, 'headlineLines', 'all',
                           'sub', s.sub, 'showSub', true, 'fromProduct', true))
    END,
  'ctas',
    CASE
      WHEN s.kind = 'grid' THEN '[]'::jsonb
      WHEN s.kind = 'image' THEN jsonb_build_array(
        jsonb_build_object('id', 'cta-1', 'label', s.cta, 'link', s.link, 'style', 'accent',
          'pos', jsonb_build_object(
            'desktop', jsonb_build_object('x', 96, 'y', 82),
            'mobile',  jsonb_build_object('x', 96, 'y', 84))))
      ELSE jsonb_build_array(
        jsonb_build_object('id', 'cta-1', 'label', s.cta, 'link', s.link, 'style', 'accent',
                           'pos', 'null'::jsonb))
    END
)
FROM s
WHERE h.id = s.id;

-- ─── 5) Contraintes (garde-fous serveur, non contournables) ─────────────
ALTER TABLE public.hero_promotions DROP CONSTRAINT IF EXISTS hero_promotions_config_check;
ALTER TABLE public.hero_promotions
  ADD CONSTRAINT hero_promotions_config_check
  CHECK (jsonb_typeof(config) = 'object' AND octet_length(config::text) <= 20000);

-- Plafond ~50 Ko (51 200 octets) de HTML+CSS critique par slide.
ALTER TABLE public.hero_promotions DROP CONSTRAINT IF EXISTS hero_promotions_payload_cap_check;
ALTER TABLE public.hero_promotions
  ADD CONSTRAINT hero_promotions_payload_cap_check
  CHECK (octet_length(html) + octet_length(css) <= 51200);

ALTER TABLE public.hero_promotions DROP CONSTRAINT IF EXISTS hero_promotions_schedule_check;
ALTER TABLE public.hero_promotions
  ADD CONSTRAINT hero_promotions_schedule_check
  CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at);

-- ─── 6) Garde : html/css réservés aux super_admin ───────────────────────
-- INVOKER (pas DEFINER) : current_user = rôle réel de l'appelant
-- (authenticated via PostgREST, service_role via edge, postgres via SQL editor).
CREATE OR REPLACE FUNCTION public.hero_promotions_guard_html()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  changed boolean;
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

-- ─── 7) Compteur de version (trigger, atomique) ─────────────────────────
-- Une ligne unique. last_hook_at / hook_pending : réservés au Deploy Hook (Phase 5).
CREATE TABLE IF NOT EXISTS public.hero_version (
  id           boolean     PRIMARY KEY DEFAULT true CHECK (id),
  version      bigint      NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  last_hook_at timestamptz,
  hook_pending boolean     NOT NULL DEFAULT false
);
INSERT INTO public.hero_version (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.hero_version ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hero_version_select_public ON public.hero_version;
CREATE POLICY hero_version_select_public ON public.hero_version
  FOR SELECT TO anon, authenticated USING (true);

-- Lecture publique limitée à version + updated_at (pas les flags du hook).
REVOKE ALL ON public.hero_version FROM anon, authenticated;
GRANT SELECT (version, updated_at) ON public.hero_version TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.hero_bump_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.hero_version
  SET version = version + 1, updated_at = now(), hook_pending = true
  WHERE id = true;
  RETURN NULL;
END;
$$;

-- STATEMENT-level : un reorder de 20 slides = UN seul bump.
DROP TRIGGER IF EXISTS hero_promotions_bump_version ON public.hero_promotions;
CREATE TRIGGER hero_promotions_bump_version
  AFTER INSERT OR UPDATE OR DELETE ON public.hero_promotions
  FOR EACH STATEMENT EXECUTE FUNCTION public.hero_bump_version();

-- ─── 8) Reorder atomique (remplace les N updates séquentiels) ───────────
-- INVOKER : la RLS update admin s'applique ; is_admin() explicite en plus.
CREATE OR REPLACE FUNCTION public.reorder_hero_promotions(p_ids text[])
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  n int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'reorder_hero_promotions: admin requis' USING ERRCODE = '42501';
  END IF;
  IF p_ids IS NULL OR cardinality(p_ids) = 0 THEN
    RAISE EXCEPTION 'reorder_hero_promotions: liste vide';
  END IF;
  IF cardinality(p_ids) <> (SELECT count(DISTINCT x) FROM unnest(p_ids) AS x) THEN
    RAISE EXCEPTION 'reorder_hero_promotions: identifiants dupliqués';
  END IF;

  UPDATE public.hero_promotions h
  SET "order" = (o.ord - 1)::int
  FROM unnest(p_ids) WITH ORDINALITY AS o(id, ord)
  WHERE h.id = o.id;

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> cardinality(p_ids) THEN
    RAISE EXCEPTION 'reorder_hero_promotions: identifiant(s) inconnu(s)';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_hero_promotions(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_hero_promotions(text[]) TO authenticated;

-- ─── 9) Un bump final : les clients rechargeront le hero ────────────────
UPDATE public.hero_version SET version = version + 1, updated_at = now() WHERE id = true;

NOTIFY pgrst, 'reload schema';

COMMIT;
```

### Vérification (à lancer juste après, puis colle-moi les résultats)

```sql
-- A. Structure : 5 lignes, ordre dense 0..4, origin legacy
SELECT id, kind, layout, "order", is_active,
       config->>'origin'                 AS origin,
       jsonb_array_length(config->'layers') AS nb_layers,
       jsonb_array_length(config->'ctas')   AS nb_ctas
FROM public.hero_promotions
ORDER BY "order", id;

-- B. Détail d'un slide product/full (celui avec "Ligne 1 / ligne 2")
SELECT jsonb_pretty(config) FROM public.hero_promotions
WHERE id = '966d27f9-6588-41b8-988e-b0676dd038c4';

-- C. Détail d'un slide grid (tuiles)
SELECT jsonb_pretty(config) FROM public.hero_promotions
WHERE id = 'c0b77890-83f5-4e68-92cc-5ec3f49b84f3';

-- D. Contraintes, triggers, compteur
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.hero_promotions'::regclass ORDER BY 1;
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'public.hero_promotions'::regclass AND NOT tgisinternal ORDER BY 1;
SELECT version, updated_at FROM public.hero_version;

-- E. Le plafond 50 Ko refuse bien (doit échouer avec "payload_cap_check"), puis annule
BEGIN;
UPDATE public.hero_promotions SET html = repeat('a', 60000)
WHERE id = '966d27f9-6588-41b8-988e-b0676dd038c4';
ROLLBACK;
```

**Résultat attendu pour A** (les ex æquo sont départagés par `id`) :

| id (début) | kind    | order | nb_layers | nb_ctas |
| ---------- | ------- | ----- | --------- | ------- |
| 966d27f9   | product | 0     | 2         | 1       |
| c0b77890   | grid    | 1     | 1         | 0       |
| 7685ca4e   | product | 2     | 2         | 1       |
| 04cafd80   | grid    | 3     | 1         | 0       |
| 76758ad9   | image   | 4     | 2         | 1       |

Attention : l'ordre des deux slides qui étaient ex æquo change légèrement, tu pourras les réordonner ensuite.

**Rollback** si besoin :

```sql
-- ROLLBACK Phase 1 (à n'utiliser qu'en cas de problème)
BEGIN;
DROP TRIGGER IF EXISTS hero_promotions_bump_version ON public.hero_promotions;
DROP TRIGGER IF EXISTS hero_promotions_guard_html ON public.hero_promotions;
DROP FUNCTION IF EXISTS public.hero_bump_version();
DROP FUNCTION IF EXISTS public.hero_promotions_guard_html();
DROP FUNCTION IF EXISTS public.reorder_hero_promotions(text[]);
DROP TABLE IF EXISTS public.hero_version;
ALTER TABLE public.hero_promotions
  DROP CONSTRAINT IF EXISTS hero_promotions_config_check,
  DROP CONSTRAINT IF EXISTS hero_promotions_payload_cap_check,
  DROP CONSTRAINT IF EXISTS hero_promotions_schedule_check,
  DROP COLUMN IF EXISTS config, DROP COLUMN IF EXISTS html, DROP COLUMN IF EXISTS css,
  DROP COLUMN IF EXISTS starts_at, DROP COLUMN IF EXISTS ends_at;
-- Remettre NOT NULL + CASCADE n'est possible que si aucune ligne n'a product_id NULL.
COMMIT;
```

Ton test garde Phase 0 vérifie que la lecture anonyme de `hero_promotions` reste limitée à `is_active = true`, ce qui n'est pas touché. `hero_version` est une autre table avec une lecture anon volontaire, limitée aux colonnes `version` et `updated_at`. Si ton test scanne toutes les migrations pour `TO anon`, il faudra l'autoriser pour cette table.

---

## 2. Schéma de validation partagé (frontend) — nouveau fichier

```ts
// src/lib/heroSchema.ts
// Schéma v1 de la composition hero (colonne jsonb hero_promotions.config).
// 100 % PUR, zéro dépendance, pas d'enum/classe : importable en node (tests) comme
// dans le navigateur. Validateurs maison (pattern sanitizeHeroPhase2) : AUCUNE
// exception levée, toute entrée invalide est ramenée à une valeur sûre ou écartée.
// ⚠ buildHeroConfigFromLegacy est le miroir TS du backfill SQL de la migration
// 20261034 : si l'un change, l'autre doit changer (voir tests/hero-schema.test.ts).

export const HERO_SCHEMA_VERSION = 1 as const;
export const HERO_PAYLOAD_CAP_BYTES = 51200; // = CHECK SQL hero_promotions_payload_cap_check
export const HERO_PAYLOAD_WARN_BYTES = 35840; // 35 Ko : avertissement orange
export const HERO_MAX_LAYERS = 8;
export const HERO_MAX_CTAS = 4;
export const HERO_MAX_TILES = 3;

// ─── Types ──────────────────────────────────────────────────────────────
export type HeroWidth = "full" | "contained";
export interface HeroHeight {
  unit: "vh" | "px";
  value: number;
}
/** auto = ratio mesuré par le studio puis figé (zéro JS de mesure au runtime).
 *  fixed = hauteur explicite. Mutuellement exclusifs (union discriminée). */
export interface HeroSizingAuto {
  mode: "auto";
  width: HeroWidth;
  ratio: { desktop: number; mobile: number }; // largeur / hauteur
}
export interface HeroSizingFixed {
  mode: "fixed";
  width: HeroWidth;
  height: HeroHeight;
  heightMobile?: HeroHeight;
}
export type HeroSizing = HeroSizingAuto | HeroSizingFixed;

export type HeroTextAnchor =
  | "left-middle"
  | "right-middle"
  | "center"
  | "bottom-left";
export type HeroTone = "auto" | "light" | "dark";

/** Fond plein cadre. src null = image du produit principal (product_id). */
export interface HeroImageLayer {
  type: "image";
  src: string | null;
  srcMobile?: string;
  srcDark?: string;
  alt: string;
  fit: "cover" | "contain";
  dim: number; // 0..1 (opacité de l'image sur le fond ; legacy "full" = 0.55)
  scrim: "none" | "left" | "bottom";
}
/** Visuel cadré sur un côté (ex-layout split). productId => infos produit live. */
export interface HeroCardLayer {
  type: "card";
  side: "left" | "right";
  src: string | null; // null = image du produit
  srcMobile?: string;
  alt: string;
  productId: string | null;
  showMeta: boolean;
}
export interface HeroTile {
  src: string;
  label: string;
  link: string | null;
}
export interface HeroTilesMain {
  src: string | null; // null = image du produit principal
  link: string | null;
  label: string;
  ctaLabel: string;
  fromProduct: boolean; // label vide => titre produit
}
/** Ex-kind "grid" : visuel principal + jusqu'à 3 tuiles liées. */
export interface HeroTilesLayer {
  type: "tiles";
  main: HeroTilesMain | null;
  items: HeroTile[];
}
export interface HeroTextLayer {
  type: "text";
  anchor: HeroTextAnchor;
  tone: HeroTone; // auto : encre sombre sur fond clair sans image plein cadre
  tag: string;
  showTag: boolean;
  headline: string;
  headlineLines: "all" | "first";
  sub: string;
  showSub: boolean;
  fromProduct: boolean; // champs vides => titre / description du produit principal
}
/** Réservé Phase 4 (contenu dans les colonnes html / css, pas dans config). */
export interface HeroHtmlLayer {
  type: "html";
}
export type HeroLayer =
  | HeroImageLayer
  | HeroCardLayer
  | HeroTilesLayer
  | HeroTextLayer
  | HeroHtmlLayer;

export interface HeroCtaPoint {
  x: number; // % de la largeur, 0..100
  y: number; // % de la hauteur, 0..100
}
export interface HeroCta {
  id: string;
  label: string;
  link: string | null; // null = fiche du produit principal
  style: "accent" | "light" | "dark" | "ghost";
  /** null = "inline" (dans le flux du bloc texte, comportement legacy).
   *  Sinon position libre ; au rendu : left/top = x%/y% + translate(-x%, -y%)
   *  => le bouton ne déborde JAMAIS, même à 0 % ou 100 %. */
  pos: null | { desktop: HeroCtaPoint; mobile?: HeroCtaPoint };
}

export interface HeroConfig {
  v: 1;
  /** legacy = régénérée depuis les colonnes legacy ; studio = source de vérité. */
  origin: "legacy" | "studio";
  sizing: HeroSizing;
  background: { gradient: string };
  layers: HeroLayer[];
  ctas: HeroCta[];
}

// ─── Helpers de validation ──────────────────────────────────────────────
type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function num(v: unknown, min: number, max: number, fallback: number): number {
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string" && v.trim() !== ""
        ? Number(v)
        : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function pick<T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback;
}

const SITE_HOSTS = ["instawear.vercel.app", "localhost", "127.0.0.1"];

/** Lien interne uniquement : "/…" ou URL absolue same-origin réduite au chemin.
 *  Externe / javascript: / data: => null. (Même règle que sanitizeHeroPhase2.) */
export function cleanHeroLink(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.startsWith("/") && !t.startsWith("//") && t.length <= 200) return t;
  const m = t.match(
    /^https?:\/\/([^/:?#]+)(?::\d+)?(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i,
  );
  if (m && SITE_HOSTS.includes(m[1].toLowerCase())) {
    const path = (m[2] || "/") + (m[3] || "") + (m[4] || "");
    return path.length <= 200 ? path : null;
  }
  return null;
}

/** Source d'image : http(s):// ou chemin "/…". Jamais data:, javascript:, "//". */
export function cleanHeroSrc(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > 1000) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/") && !t.startsWith("//")) return t;
  return null;
}

/** Fond CSS : dégradé / couleur uniquement. url(), @import, ;{}<> => rejeté. */
export function cleanHeroBackground(v: unknown): string {
  const t = str(v, 600);
  if (!t) return "";
  if (/url\s*\(|expression\s*\(|@import|[;{}<>]/i.test(t)) return "";
  return /gradient\(|^#|^var\(--|^rgba?\(|^hsla?\(/i.test(t) ? t : "";
}

// ─── Sizing ─────────────────────────────────────────────────────────────
export const HERO_DEFAULT_SIZING: HeroSizingFixed = {
  mode: "fixed",
  width: "full",
  height: { unit: "vh", value: 78 },
};

function sanitizeHeight(raw: unknown, fallback: HeroHeight): HeroHeight {
  if (!isObj(raw)) return { ...fallback };
  const unit = pick(raw.unit, ["vh", "px"] as const, fallback.unit);
  if (unit === "vh") {
    return { unit, value: Math.round(num(raw.value, 30, 100, 78)) };
  }
  return { unit, value: Math.round(num(raw.value, 200, 1200, 520)) };
}

function sanitizeSizing(raw: unknown): HeroSizing {
  if (!isObj(raw)) return { ...HERO_DEFAULT_SIZING };
  const width = pick(raw.width, ["full", "contained"] as const, "full");
  if (raw.mode === "auto") {
    const r: Obj = isObj(raw.ratio) ? raw.ratio : {};
    return {
      mode: "auto",
      width,
      ratio: {
        desktop: round2(num(r.desktop, 0.3, 6, 2.4)),
        mobile: round2(num(r.mobile, 0.3, 6, 0.9)),
      },
    };
  }
  const height = sanitizeHeight(raw.height, HERO_DEFAULT_SIZING.height);
  const out: HeroSizingFixed = { mode: "fixed", width, height };
  if (isObj(raw.heightMobile))
    out.heightMobile = sanitizeHeight(raw.heightMobile, height);
  return out;
}

// ─── Couches ────────────────────────────────────────────────────────────
function sanitizeLayer(raw: unknown): HeroLayer | null {
  if (!isObj(raw)) return null;
  switch (raw.type) {
    case "image": {
      const layer: HeroImageLayer = {
        type: "image",
        src: cleanHeroSrc(raw.src),
        alt: str(raw.alt, 140),
        fit: pick(raw.fit, ["cover", "contain"] as const, "cover"),
        dim: round2(num(raw.dim, 0, 1, 1)),
        scrim: pick(raw.scrim, ["none", "left", "bottom"] as const, "none"),
      };
      const m = cleanHeroSrc(raw.srcMobile);
      if (m) layer.srcMobile = m;
      const d = cleanHeroSrc(raw.srcDark);
      if (d) layer.srcDark = d;
      return layer;
    }
    case "card": {
      const layer: HeroCardLayer = {
        type: "card",
        side: pick(raw.side, ["left", "right"] as const, "right"),
        src: cleanHeroSrc(raw.src),
        alt: str(raw.alt, 140),
        productId: str(raw.productId, 80) || null,
        showMeta: raw.showMeta === true,
      };
      const m = cleanHeroSrc(raw.srcMobile);
      if (m) layer.srcMobile = m;
      return layer;
    }
    case "tiles": {
      const main: HeroTilesMain | null = isObj(raw.main)
        ? {
            src: cleanHeroSrc(raw.main.src),
            link: cleanHeroLink(raw.main.link),
            label: str(raw.main.label, 60),
            ctaLabel: str(raw.main.ctaLabel, 40),
            fromProduct: raw.main.fromProduct === true,
          }
        : null;
      const items: HeroTile[] = [];
      for (const t of Array.isArray(raw.items) ? raw.items : []) {
        if (items.length >= HERO_MAX_TILES) break;
        if (!isObj(t)) continue;
        const src = cleanHeroSrc(t.src);
        if (!src) continue;
        items.push({
          src,
          label: str(t.label, 40),
          link: cleanHeroLink(t.link),
        });
      }
      return { type: "tiles", main, items };
    }
    case "text":
      return {
        type: "text",
        anchor: pick(
          raw.anchor,
          ["left-middle", "right-middle", "center", "bottom-left"] as const,
          "left-middle",
        ),
        tone: pick(raw.tone, ["auto", "light", "dark"] as const, "auto"),
        tag: str(raw.tag, 40),
        showTag: raw.showTag !== false,
        headline: str(raw.headline, 200),
        headlineLines: pick(
          raw.headlineLines,
          ["all", "first"] as const,
          "all",
        ),
        sub: str(raw.sub, 400),
        showSub: raw.showSub !== false,
        fromProduct: raw.fromProduct === true,
      };
    case "html":
      return { type: "html" };
    default:
      return null;
  }
}

function sanitizePoint(raw: unknown): HeroCtaPoint {
  const o: Obj = isObj(raw) ? raw : {};
  return { x: round1(num(o.x, 0, 100, 50)), y: round1(num(o.y, 0, 100, 50)) };
}

function sanitizeCta(raw: unknown, index: number): HeroCta | null {
  if (!isObj(raw)) return null;
  const label = str(raw.label, 40);
  if (!label) return null;
  let pos: HeroCta["pos"] = null;
  if (isObj(raw.pos) && isObj(raw.pos.desktop)) {
    pos = { desktop: sanitizePoint(raw.pos.desktop) };
    if (isObj(raw.pos.mobile)) pos.mobile = sanitizePoint(raw.pos.mobile);
  }
  return {
    id: str(raw.id, 40) || `cta-${index + 1}`,
    label,
    link: cleanHeroLink(raw.link),
    style: pick(
      raw.style,
      ["accent", "light", "dark", "ghost"] as const,
      "accent",
    ),
    pos,
  };
}

// ─── API publique du schéma ─────────────────────────────────────────────
/** Normalise N'IMPORTE QUELLE entrée en config valide (écritures admin). */
export function sanitizeHeroConfig(raw: unknown): HeroConfig {
  const r: Obj = isObj(raw) ? raw : {};

  const layers: HeroLayer[] = [];
  for (const l of Array.isArray(r.layers) ? r.layers : []) {
    if (layers.length >= HERO_MAX_LAYERS) break;
    const s = sanitizeLayer(l);
    if (s) layers.push(s);
  }

  const ctas: HeroCta[] = [];
  const seen = new Set<string>();
  for (const c of Array.isArray(r.ctas) ? r.ctas : []) {
    if (ctas.length >= HERO_MAX_CTAS) break;
    const s = sanitizeCta(c, ctas.length);
    if (!s) continue;
    let id = s.id;
    let n = 2;
    while (seen.has(id)) id = `${s.id}-${n++}`;
    s.id = id;
    seen.add(id);
    ctas.push(s);
  }

  return {
    v: HERO_SCHEMA_VERSION,
    origin: r.origin === "studio" ? "studio" : "legacy",
    sizing: sanitizeSizing(r.sizing),
    background: {
      gradient: cleanHeroBackground(
        isObj(r.background) ? r.background.gradient : "",
      ),
    },
    layers,
    ctas,
  };
}

/** Lecture depuis la base : null si la ligne n'est pas migrée ({"v":1} sans layers),
 *  version inconnue ou forme invalide => l'appelant retombe sur le legacy. */
export function parseHeroConfig(raw: unknown): HeroConfig | null {
  if (!isObj(raw)) return null;
  if (raw.v !== HERO_SCHEMA_VERSION) return null;
  if (!Array.isArray(raw.layers)) return null;
  return sanitizeHeroConfig(raw);
}

// ─── Legacy → config (miroir TS du backfill SQL) ────────────────────────
export interface LegacyHeroFields {
  kind?: string | null;
  layout?: string | null;
  headline?: string | null;
  sub?: string | null;
  cta?: string | null;
  tag?: string | null;
  showTag?: boolean | null;
  image?: string | null;
  bgGradient?: string | null;
  linkUrl?: string | null;
  tiles?: unknown;
  productId?: string | null;
}

export function buildHeroConfigFromLegacy(l: LegacyHeroFields): HeroConfig {
  const kind = l.kind === "image" || l.kind === "grid" ? l.kind : "product";
  const split = l.layout === "split";
  const image = cleanHeroSrc(l.image);
  const tag = str(l.tag, 40);
  const showTag = l.showTag !== false;
  const headline = str(l.headline, 200);
  const sub = str(l.sub, 400);
  const ctaLabel = str(l.cta, 40) || "Discover";
  const link = cleanHeroLink(l.linkUrl);
  const productId = str(l.productId, 80) || null;

  let layers: HeroLayer[];
  let ctas: HeroCta[];

  if (kind === "grid") {
    const items: HeroTile[] = [];
    for (const t of Array.isArray(l.tiles) ? l.tiles : []) {
      if (items.length >= HERO_MAX_TILES) break;
      if (!isObj(t)) continue;
      const src = cleanHeroSrc(t.image);
      if (!src) continue;
      items.push({ src, label: str(t.label, 40), link: cleanHeroLink(t.link) });
    }
    const label = [headline.split("\n")[0].trim(), sub]
      .filter(Boolean)
      .join(" — ")
      .slice(0, 60);
    layers = [
      {
        type: "tiles",
        main: { src: image, link, label, ctaLabel, fromProduct: true },
        items,
      },
    ];
    ctas = [];
  } else if (kind === "image") {
    layers = [
      {
        type: "image",
        src: image,
        alt: "",
        fit: "cover",
        dim: 1,
        scrim: "bottom",
      },
      {
        type: "text",
        anchor: "bottom-left",
        tone: "light",
        tag,
        showTag,
        headline,
        headlineLines: "first",
        sub: "",
        showSub: false,
        fromProduct: true,
      },
    ];
    ctas = [
      {
        id: "cta-1",
        label: ctaLabel,
        link,
        style: "accent",
        pos: { desktop: { x: 96, y: 82 }, mobile: { x: 96, y: 84 } },
      },
    ];
  } else {
    const text: HeroTextLayer = {
      type: "text",
      anchor: "left-middle",
      tone: split ? "auto" : "light",
      tag,
      showTag,
      headline,
      headlineLines: "all",
      sub,
      showSub: true,
      fromProduct: true,
    };
    layers = split
      ? [
          {
            type: "card",
            side: "right",
            src: image,
            alt: "",
            productId,
            showMeta: false,
          },
          text,
        ]
      : [
          {
            type: "image",
            src: image,
            alt: "",
            fit: "cover",
            dim: 0.55,
            scrim: "left",
          },
          text,
        ];
    ctas = [{ id: "cta-1", label: ctaLabel, link, style: "accent", pos: null }];
  }

  return sanitizeHeroConfig({
    v: HERO_SCHEMA_VERSION,
    origin: "legacy",
    sizing: HERO_DEFAULT_SIZING,
    background: { gradient: l.bgGradient ?? "" },
    layers,
    ctas,
  });
}

/** Config effective d'un slide : la config stockée, sinon dérivée du legacy. */
export function resolveHeroConfig(
  p: LegacyHeroFields & { config?: HeroConfig | null },
): HeroConfig {
  return p.config ?? buildHeroConfigFromLegacy(p);
}

// ─── Budget 50 Ko (HTML + CSS critique) ─────────────────────────────────
export type HeroBudgetLevel = "ok" | "warn" | "over";
export interface HeroBudget {
  bytes: number;
  capBytes: number;
  warnBytes: number;
  pct: number; // 0..100+ (peut dépasser 100)
  level: HeroBudgetLevel;
}

export function utf8Bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** Même mesure que le CHECK SQL : octet_length(html) + octet_length(css). */
export function heroPayloadBudget(html: string, css: string): HeroBudget {
  const bytes = utf8Bytes(html || "") + utf8Bytes(css || "");
  const level: HeroBudgetLevel =
    bytes > HERO_PAYLOAD_CAP_BYTES
      ? "over"
      : bytes >= HERO_PAYLOAD_WARN_BYTES
        ? "warn"
        : "ok";
  return {
    bytes,
    capBytes: HERO_PAYLOAD_CAP_BYTES,
    warnBytes: HERO_PAYLOAD_WARN_BYTES,
    pct: Math.round((bytes / HERO_PAYLOAD_CAP_BYTES) * 1000) / 10,
    level,
  };
}

// ─── Planification (filtre runtime) ─────────────────────────────────────
export function isHeroScheduledLive(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  const s = startsAt ? Date.parse(startsAt) : NaN;
  const e = endsAt ? Date.parse(endsAt) : NaN;
  if (!Number.isNaN(s) && now < s) return false;
  if (!Number.isNaN(e) && now >= e) return false;
  return true;
}
```

---

## 3. Tests — nouveau fichier

```ts
// tests/hero-schema.test.ts
// Adapte la ligne d'import au style de tes autres tests (extension .ts ou non).
import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanHeroLink,
  cleanHeroSrc,
  cleanHeroBackground,
  sanitizeHeroConfig,
  parseHeroConfig,
  buildHeroConfigFromLegacy,
  heroPayloadBudget,
  isHeroScheduledLive,
} from "../src/lib/heroSchema";

const IMG = "https://cdn.example.com/a.webp";

test("cleanHeroLink : interne seulement", () => {
  assert.equal(cleanHeroLink("/promotions"), "/promotions");
  assert.equal(cleanHeroLink("//evil.com"), null);
  assert.equal(cleanHeroLink("https://evil.com/x"), null);
  assert.equal(cleanHeroLink("javascript:alert(1)"), null);
  assert.equal(
    cleanHeroLink("https://instawear.vercel.app/faq?x=1"),
    "/faq?x=1",
  );
});

test("cleanHeroSrc : http(s) ou chemin, jamais data:/javascript:/protocol-relative", () => {
  assert.equal(cleanHeroSrc(IMG), IMG);
  assert.equal(cleanHeroSrc("/a.png"), "/a.png");
  assert.equal(cleanHeroSrc("data:image/png;base64,AAAA"), null);
  assert.equal(cleanHeroSrc("javascript:alert(1)"), null);
  assert.equal(cleanHeroSrc("//cdn.x/a.png"), null);
});

test("cleanHeroBackground : dégradé/couleur uniquement", () => {
  assert.equal(
    cleanHeroBackground("linear-gradient(135deg, #fff 0%, #000 100%)"),
    "linear-gradient(135deg, #fff 0%, #000 100%)",
  );
  assert.equal(cleanHeroBackground("url(https://track.me/x.png)"), "");
  assert.equal(cleanHeroBackground("red; background:url(x)"), "");
});

test("sanitizeHeroConfig : entrées pourries => config valide par défaut", () => {
  for (const bad of [null, undefined, "x", 42, [], {}]) {
    const c = sanitizeHeroConfig(bad);
    assert.equal(c.v, 1);
    assert.equal(c.origin, "legacy");
    assert.equal(c.sizing.mode, "fixed");
    assert.deepEqual(c.layers, []);
    assert.deepEqual(c.ctas, []);
  }
});

test("sizing : auto et fixed sont mutuellement exclusifs", () => {
  const a = sanitizeHeroConfig({
    sizing: {
      mode: "auto",
      width: "contained",
      ratio: { desktop: 99, mobile: 0 },
      height: { unit: "px", value: 300 },
    },
  });
  assert.equal(a.sizing.mode, "auto");
  assert.equal("height" in a.sizing, false);
  assert.deepEqual((a.sizing as any).ratio, { desktop: 6, mobile: 0.3 });
  assert.equal(a.sizing.width, "contained");

  const f = sanitizeHeroConfig({
    sizing: {
      mode: "fixed",
      ratio: { desktop: 2, mobile: 1 },
      height: { unit: "vh", value: 5 },
    },
  });
  assert.equal(f.sizing.mode, "fixed");
  assert.equal("ratio" in f.sizing, false);
  assert.deepEqual((f.sizing as any).height, { unit: "vh", value: 30 });

  assert.equal(
    sanitizeHeroConfig({ sizing: { mode: "wat" } }).sizing.mode,
    "fixed",
  );
});

test("CTA : sans label écarté, positions bornées, ids uniques, max 4", () => {
  const c = sanitizeHeroConfig({
    ctas: [
      { id: "a", label: "Go", pos: { desktop: { x: -20, y: 250 } } },
      { id: "a", label: "Two", link: "https://evil.com" },
      { label: "" },
      { label: "Three" },
      { label: "Four" },
      { label: "Five" },
    ],
  });
  assert.equal(c.ctas.length, 4);
  assert.deepEqual(c.ctas[0].pos, { desktop: { x: 0, y: 100 } });
  assert.equal(c.ctas[1].link, null);
  assert.equal(new Set(c.ctas.map((x) => x.id)).size, 4);
});

test("tiles : 3 max, image invalide écartée, lien externe vidé", () => {
  const c = sanitizeHeroConfig({
    layers: [
      {
        type: "tiles",
        main: null,
        items: [
          { src: IMG, link: "/promotions" },
          { src: "javascript:x" },
          { src: IMG, link: "https://evil.com" },
          { src: IMG },
          { src: IMG },
        ],
      },
    ],
  });
  const t: any = c.layers[0];
  assert.equal(t.items.length, 3);
  assert.equal(t.items[1].link, null);
});

test("parseHeroConfig : non migré / mauvaise version => null", () => {
  assert.equal(parseHeroConfig({ v: 1 }), null);
  assert.equal(parseHeroConfig({ v: 2, layers: [] }), null);
  assert.equal(parseHeroConfig(null), null);
  assert.notEqual(parseHeroConfig({ v: 1, layers: [] }), null);
});

test("legacy product/full : image .55 + scrim gauche + texte + CTA inline", () => {
  const c = buildHeroConfigFromLegacy({
    kind: "product",
    layout: "full",
    headline: "Ligne 1\nligne 2",
    sub: "",
    cta: "",
    tag: "",
    showTag: true,
    image: IMG,
    bgGradient: "",
    linkUrl: null,
    tiles: null,
    productId: "p1",
  });
  assert.equal(c.origin, "legacy");
  assert.deepEqual(c.layers[0], {
    type: "image",
    src: IMG,
    alt: "",
    fit: "cover",
    dim: 0.55,
    scrim: "left",
  });
  const t: any = c.layers[1];
  assert.equal(t.type, "text");
  assert.equal(t.tone, "light");
  assert.equal(t.fromProduct, true);
  assert.equal(t.headline, "Ligne 1\nligne 2");
  assert.equal(c.ctas[0].label, "Discover");
  assert.equal(c.ctas[0].pos, null);
});

test("legacy product/split : card à droite, ton auto", () => {
  const c = buildHeroConfigFromLegacy({
    kind: "product",
    layout: "split",
    image: null,
    productId: "p1",
  });
  const card: any = c.layers[0];
  assert.equal(card.type, "card");
  assert.equal(card.side, "right");
  assert.equal(card.src, null);
  assert.equal(card.productId, "p1");
  assert.equal((c.layers[1] as any).tone, "auto");
});

test("legacy image : fond plein, 1re ligne seule, CTA positionné", () => {
  const c = buildHeroConfigFromLegacy({
    kind: "image",
    layout: "split",
    image: IMG,
    headline: "A\nB",
    cta: "Voir",
    linkUrl: "/promotions",
  });
  assert.equal((c.layers[0] as any).scrim, "bottom");
  const t: any = c.layers[1];
  assert.equal(t.headlineLines, "first");
  assert.equal(t.showSub, false);
  assert.deepEqual(c.ctas[0].pos, {
    desktop: { x: 96, y: 82 },
    mobile: { x: 96, y: 84 },
  });
  assert.equal(c.ctas[0].link, "/promotions");
});

test("legacy grid : tuiles valides seulement, label = 1re ligne — sous-texte", () => {
  const c = buildHeroConfigFromLegacy({
    kind: "grid",
    layout: "split",
    image: IMG,
    headline: "abcd\nefg",
    sub: "sub",
    tiles: [
      { image: IMG, label: "T1", link: "/faq" },
      { image: "" },
      { image: IMG, link: "https://evil.com" },
    ],
  });
  const g: any = c.layers[0];
  assert.equal(g.type, "tiles");
  assert.equal(g.main.label, "abcd — sub");
  assert.equal(g.items.length, 2);
  assert.equal(g.items[1].link, null);
  assert.deepEqual(c.ctas, []);
});

test("buildHeroConfigFromLegacy est idempotent via sanitizeHeroConfig", () => {
  for (const kind of ["product", "image", "grid"]) {
    for (const layout of ["full", "split"]) {
      const c = buildHeroConfigFromLegacy({
        kind,
        layout,
        image: IMG,
        headline: "x",
        tiles: [{ image: IMG }],
      });
      assert.deepEqual(sanitizeHeroConfig(c), c);
    }
  }
});

test("budget 50 Ko : mesure en OCTETS UTF-8, plafond inclusif", () => {
  assert.equal(heroPayloadBudget("a".repeat(35839), "").level, "ok");
  assert.equal(heroPayloadBudget("a".repeat(35840), "").level, "warn");
  assert.equal(heroPayloadBudget("a".repeat(51200), "").level, "warn");
  assert.equal(heroPayloadBudget("a".repeat(51201), "").level, "over");
  assert.equal(heroPayloadBudget("é", "").bytes, 2);
  assert.equal(
    heroPayloadBudget("a".repeat(30000), "b".repeat(21201)).level,
    "over",
  );
});

test("planification : fenêtre [starts, ends[", () => {
  const now = Date.parse("2026-11-27T12:00:00Z");
  assert.equal(isHeroScheduledLive(null, null, now), true);
  assert.equal(isHeroScheduledLive("2026-11-28T00:00:00Z", null, now), false);
  assert.equal(isHeroScheduledLive(null, "2026-11-27T12:00:00Z", now), false);
  assert.equal(
    isHeroScheduledLive("2026-11-27T00:00:00Z", "2026-11-28T00:00:00Z", now),
    true,
  );
});
```

---

## 4. `src/admin/adminTypes.ts` (frontend) — 2 modifications

**4.a** Juste après la toute première ligne du fichier `//src\admin\adminTypes.ts`, ajoute :

```ts
import type { HeroConfig } from "../lib/heroSchema";
```

**4.b** Remplace le bloc qui **commence** par `export interface HeroPromotion {` et qui **se termine** par la ligne `tiles?: Array<{ image: string; label?: string; link?: string }> | null;` suivie de `}` (juste avant `// ─── Product Review (Phase 1)`). Ce qui change : `isActive` passe de `Boolean` à `boolean`, et on ajoute `config`, `html`, `css`, `startsAt`, `endsAt`.

```ts
export interface HeroPromotion {
  id: string;
  /** "" = slide sans produit (product_id NULL en base). Voir mapHeroPromotion. */
  productId: string;
  title?: string; // override product title (optional)
  headline?: string;
  sub?: string;
  cta?: string;
  bgGradient?: string;
  tag?: string;
  image?: string;
  order: number;
  showTag?: boolean; // whether to display the tag/badge
  showTitle?: boolean; // whether to display the product title
  isActive?: boolean;
  /** Mise en page du slide : full-bleed historique (défaut) ou split. */
  layout?: "full" | "split";
  /** Phase 2 : product (produit imposé, défaut) | image (visuel custom) | grid (tuiles liées). */
  kind?: "product" | "image" | "grid";
  /** Lien interne (doit commencer par "/") : image/grid ou CTA custom. Vide = fiche produit. */
  linkUrl?: string | null;
  /** Tuiles kind grid : [{image, label, link}] (max 3 affichées). */
  tiles?: Array<{ image: string; label?: string; link?: string }> | null;
  /** Hero Studio : composition v1 (jsonb). null = ligne non migrée → dérivée du legacy
   *  via resolveHeroConfig(). */
  config?: HeroConfig | null;
  /** HTML/CSS collés (Phase 4). undefined = non chargés (liste publique : jamais). */
  html?: string;
  css?: string;
  /** Planification (ISO). null = pas de borne. Filtre appliqué au runtime. */
  startsAt?: string | null;
  endsAt?: string | null;
}
```

---

## 5. `src/api/supabaseApi.ts` (frontend, couche API) — 3 modifications

**5.a** Juste après la ligne `import { sumRevenue } from "../admin/orderStatusLabels";`, ajoute :

```ts
import {
  parseHeroConfig,
  sanitizeHeroConfig,
  buildHeroConfigFromLegacy,
  type LegacyHeroFields,
} from "../lib/heroSchema";
```

**5.b** Remplace le bloc qui **commence** par `const mapHeroPromotion = (row: any): HeroPromotion => ({` et qui **se termine** par `tiles: Array.isArray(row.tiles) ? row.tiles : null,` suivi de `});` (juste avant `// ─── API ───`) :

```ts
const mapHeroPromotion = (row: any): HeroPromotion => ({
  id: row.id,
  // product_id est NULL pour un slide sans produit : "" côté TS (type string inchangé).
  productId: row.product_id ?? "",
  title: row.title,
  headline: row.headline,
  sub: row.sub,
  cta: row.cta,
  bgGradient: row.bg_gradient,
  tag: row.tag,
  image: row.image,
  order: row.order,
  showTag: row.show_tag,
  showTitle: row.show_title,
  isActive: row.is_active,
  layout: row.layout === "split" ? "split" : "full",
  kind: row.kind === "image" || row.kind === "grid" ? row.kind : "product",
  linkUrl: typeof row.link_url === "string" ? row.link_url : null,
  tiles: Array.isArray(row.tiles) ? row.tiles : null,
  config: parseHeroConfig(row.config),
  // html/css absents des requêtes publiques : undefined (jamais "" → un update
  // spreadé depuis la liste ne peut PAS écraser un HTML existant).
  html: typeof row.html === "string" ? row.html : undefined,
  css: typeof row.css === "string" ? row.css : undefined,
  startsAt: row.starts_at ?? null,
  endsAt: row.ends_at ?? null,
});
```

**5.c** Remplace le bloc qui **commence** par `export const heroPromotionsApi = {` et qui **se termine** par le `};` situé juste au-dessus de `export const reviewApi = {`. Garde le commentaire `// ─── Hero Promotions ───` au-dessus.

```ts
// Colonnes de la liste (boutique ET admin). html/css EXCLUS : jusqu'à 50 Ko par slide,
// chargés à la demande (getFull) — jamais dans le chemin LCP public.
const HERO_LIST_COLUMNS =
  "id, product_id, title, headline, sub, cta, bg_gradient, tag, image, order, show_tag, show_title, is_active, layout, kind, link_url, tiles, config, starts_at, ends_at";

// Champs "contenu legacy" : si l'ancien formulaire en modifie un, la config
// (origin "legacy") est régénérée depuis les colonnes legacy fusionnées.
const HERO_LEGACY_CONTENT_KEYS = [
  "productId",
  "title",
  "headline",
  "sub",
  "cta",
  "bgGradient",
  "tag",
  "image",
  "showTag",
  "layout",
  "kind",
  "linkUrl",
  "tiles",
] as const;

function heroLegacyFields(
  h: Partial<HeroPromotion>,
  p2: { kind: string; link_url: string | null; tiles: unknown },
): LegacyHeroFields {
  return {
    kind: p2.kind,
    layout: h.layout,
    headline: h.headline,
    sub: h.sub,
    cta: h.cta,
    tag: h.tag,
    showTag: h.showTag,
    image: h.image,
    bgGradient: h.bgGradient,
    linkUrl: p2.link_url,
    tiles: p2.tiles,
    productId: h.productId,
  };
}

export const heroPromotionsApi = {
  async list(): Promise<HeroPromotion[]> {
    const { data, error } = await supabase
      .from("hero_promotions")
      .select(HERO_LIST_COLUMNS)
      .order("order", { ascending: true })
      .order("id", { ascending: true }); // départage les ex æquo : ordre déterministe
    if (error) throw error;
    return (data ?? []).map(mapHeroPromotion);
  },
  /** Slide complet (html/css inclus) — édition admin uniquement. */
  async getFull(id: string): Promise<HeroPromotion | null> {
    const { data, error } = await supabase
      .from("hero_promotions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return mapHeroPromotion(data);
  },
  async create(promo: Omit<HeroPromotion, "id">): Promise<HeroPromotion> {
    const p2 = sanitizeHeroPhase2(promo);
    const layout = promo.layout === "split" ? "split" : "full";
    const config = sanitizeHeroConfig(
      promo.config && promo.config.origin === "studio"
        ? promo.config
        : buildHeroConfigFromLegacy(heroLegacyFields({ ...promo, layout }, p2)),
    );
    const { data, error } = await supabase
      .from("hero_promotions")
      .insert({
        product_id: promo.productId || null,
        title: promo.title,
        headline: promo.headline,
        sub: promo.sub,
        cta: promo.cta,
        bg_gradient: promo.bgGradient,
        tag: promo.tag,
        image: promo.image,
        layout,
        ...p2,
        config,
        starts_at: promo.startsAt ?? null,
        ends_at: promo.endsAt ?? null,
        ...(promo.html !== undefined ? { html: promo.html } : {}),
        ...(promo.css !== undefined ? { css: promo.css } : {}),
        order: promo.order,
        is_active: promo.isActive !== false,
        show_tag: promo.showTag,
        show_title: promo.showTitle,
      })
      .select(HERO_LIST_COLUMNS)
      .maybeSingle();
    if (error) throw error;
    return mapHeroPromotion(data);
  },
  /**
   * Update PARTIEL SÛR : seules les clés présentes (≠ undefined) sont écrites.
   * (Avant : { isActive:false } réécrivait aussi layout/kind/link_url/tiles.)
   * - Contenu legacy modifié + config origin "legacy" => config régénérée depuis
   *   les colonnes legacy fusionnées (l'ancien formulaire reste cohérent).
   * - config origin "studio" fournie => écrite telle quelle (source de vérité).
   * - config origin "studio" déjà en base => jamais écrasée par le legacy.
   */
  async update(
    id: string,
    promo: Partial<HeroPromotion>,
  ): Promise<HeroPromotion> {
    const patch: Record<string, unknown> = {};
    if (promo.productId !== undefined)
      patch.product_id = promo.productId || null;
    if (promo.title !== undefined) patch.title = promo.title;
    if (promo.headline !== undefined) patch.headline = promo.headline;
    if (promo.sub !== undefined) patch.sub = promo.sub;
    if (promo.cta !== undefined) patch.cta = promo.cta;
    if (promo.bgGradient !== undefined) patch.bg_gradient = promo.bgGradient;
    if (promo.tag !== undefined) patch.tag = promo.tag;
    if (promo.image !== undefined) patch.image = promo.image;
    if (promo.order !== undefined) patch.order = promo.order;
    if (promo.showTag !== undefined) patch.show_tag = promo.showTag;
    if (promo.showTitle !== undefined) patch.show_title = promo.showTitle;
    if (promo.isActive !== undefined) patch.is_active = promo.isActive;
    if (promo.startsAt !== undefined) patch.starts_at = promo.startsAt;
    if (promo.endsAt !== undefined) patch.ends_at = promo.endsAt;
    if (promo.html !== undefined) patch.html = promo.html;
    if (promo.css !== undefined) patch.css = promo.css;

    const explicit =
      promo.config && promo.config.origin === "studio" ? promo.config : null;
    if (explicit) patch.config = sanitizeHeroConfig(explicit);

    if (HERO_LEGACY_CONTENT_KEYS.some((k) => promo[k] !== undefined)) {
      const { data: cur, error: curErr } = await supabase
        .from("hero_promotions")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (curErr || !cur) throw curErr || new Error("Slide introuvable");
      const defined = Object.fromEntries(
        Object.entries(promo).filter(([, v]) => v !== undefined),
      ) as Partial<HeroPromotion>;
      const merged: HeroPromotion = { ...mapHeroPromotion(cur), ...defined };
      const p2 = sanitizeHeroPhase2(merged);
      patch.layout = merged.layout === "split" ? "split" : "full";
      patch.kind = p2.kind;
      patch.link_url = p2.link_url;
      patch.tiles = p2.tiles;
      const curIsStudio = isStudioConfigRow(cur.config);
      if (!explicit && !curIsStudio) {
        patch.config = sanitizeHeroConfig(
          buildHeroConfigFromLegacy(heroLegacyFields(merged, p2)),
        );
      }
    }

    if (Object.keys(patch).length === 0) {
      const cur = await this.getFull(id);
      if (!cur) throw new Error("Slide introuvable");
      return cur;
    }

    const { data, error } = await supabase
      .from("hero_promotions")
      .update(patch)
      .eq("id", id)
      .select(HERO_LIST_COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Slide introuvable ou non modifiable");
    return mapHeroPromotion(data);
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("hero_promotions")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
  /** Réordonnancement ATOMIQUE : 1 appel RPC (transaction unique, 1 seul bump de
   *  version) au lieu de N updates séquentiels non atomiques. */
  async reorder(ids: string[]): Promise<void> {
    const { error } = await supabase.rpc("reorder_hero_promotions", {
      p_ids: ids,
    });
    if (error) throw error;
  },
};

function isStudioConfigRow(raw: unknown): boolean {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as { origin?: unknown }).origin === "studio"
  );
}
```

Ton fichier de test Phase 0/1 (`promo-hero-p1.test.ts`) a peut-être des gardes statiques qui cherchent des chaînes précises dans `supabaseApi.ts`, par exemple `...sanitizeHeroPhase2(promo)`. J'ai gardé cet appel dans `create`, mais l'`update` n'utilise plus ce spread. Si un test échoue, colle-moi le message, je l'adapte.

---

## 6. À faire dans cet ordre

1. Lancer la migration, puis les requêtes A à E, et me coller les résultats.
2. Ajouter `src/lib/heroSchema.ts` et `tests/hero-schema.test.ts`, puis appliquer les modifications 4 et 5.
3. `npm run lint` et `npm test`.
4. Dans l'admin, ouvrir Promotions et cliquer l'œil sur un slide `grid` ou `image`. Son `kind`, `layout` et ses tuiles doivent **rester intacts** (avant : ils étaient réécrits).
5. Ouvrir la boutique : aucun changement visuel attendu.

Ensuite, lot 2 : `HeroSlideView.tsx` (rendu unifié) + `HeroCarousel.tsx` + `App.tsx`. Il inclura le montage lazy actif+suivant, la correction `banners.length` vs `slides.length`, le filtre de planification, le `refresh()` de `PromotionsPage` qui ne doit plus désactiver les slides sans produit, `<picture>` desktop/mobile et la mesure LCP.

**Option planification (non incluse)** : si tu veux qu'un slide programmé pour plus tard ne soit pas lisible via l'API avant son lancement (ton HTML de Black Friday, par exemple), la policy anon peut ajouter le filtre de date. Tu l'avais décidé « au runtime côté client », donc je ne l'ai pas touchée. Dis-moi si tu veux que je te la prépare.
