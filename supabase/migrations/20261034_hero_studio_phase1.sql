-- supabase/migrations/20261034_hero_studio_phase1.sql
-- Hero Studio — Phase 1 : modèle de composition, slides sans produit, planification,
-- compteur de version (trigger), reorder atomique, garde HTML super_admin.
-- Phase 0 (RLS hero_promotions, 20261033) INCHANGÉE : aucune policy existante n'est touchée.
-- Idempotent : IF NOT EXISTS / DROP IF EXISTS / backfill ciblé (config sans 'layers').
-- NOTE : pas de BEGIN/COMMIT explicite — `supabase db push` encapsule déjà
-- chaque migration dans une transaction.

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

-- ─── 3) Ordre dense 0..n-1 (les 5 lignes ont des doublons : 1,1,3,4,4) ──
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
