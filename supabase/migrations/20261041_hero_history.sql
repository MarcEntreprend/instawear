-- supabase/migrations/20261041_hero_history.sql
-- Hero Studio — Lot 9 : historique des slides (config, JAMAIS de HTML), historique HTML
-- (super_admin uniquement) et corbeille. Idempotent. Pas de BEGIN/COMMIT.
-- Numéro 41 : après le 40 (modèles). 37 reste réservé à ton rollback.

-- ─── 1) Résumé léger d'un snapshot (la liste ne charge pas 30 Ko par ligne) ──
CREATE OR REPLACE FUNCTION public.hero_version_meta(snap jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'headline', left(btrim(split_part(COALESCE(snap->>'headline', ''), E'\n', 1)), 80),
    'layers',   CASE WHEN jsonb_typeof(snap->'config'->'layers') = 'array'
                     THEN jsonb_array_length(snap->'config'->'layers') ELSE 0 END,
    'ctas',     CASE WHEN jsonb_typeof(snap->'config'->'ctas') = 'array'
                     THEN jsonb_array_length(snap->'config'->'ctas') ELSE 0 END,
    'active',   COALESCE((snap->>'is_active')::boolean, false),
    'origin',   COALESCE(snap->'config'->>'origin', 'legacy'));
$$;

-- ─── 2) Historique des slides ───────────────────────────────────────────
-- Pas de FK : l'historique survit à la suppression du slide (corbeille).
CREATE TABLE IF NOT EXISTS public.hero_slide_versions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id   text        NOT NULL,
  reason     text        NOT NULL CHECK (reason IN ('create', 'update', 'delete')),
  snapshot   jsonb       NOT NULL
             CHECK (jsonb_typeof(snapshot) = 'object' AND octet_length(snapshot::text) <= 60000),
  meta       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hero_slide_versions_slide_idx
  ON public.hero_slide_versions (slide_id, created_at DESC);

ALTER TABLE public.hero_slide_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hero_slide_versions FROM anon, authenticated;
GRANT SELECT ON public.hero_slide_versions TO authenticated;
DROP POLICY IF EXISTS hero_slide_versions_select_admin ON public.hero_slide_versions;
CREATE POLICY hero_slide_versions_select_admin ON public.hero_slide_versions
  FOR SELECT TO authenticated USING (public.is_admin());

-- ─── 3) Historique HTML : super_admin SEUL (lecture comprise) ───────────
CREATE TABLE IF NOT EXISTS public.hero_html_versions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id   text        NOT NULL,
  op         text        NOT NULL CHECK (op IN ('save', 'delete')),
  html       text        NOT NULL,
  css        text        NOT NULL,
  bytes      integer     GENERATED ALWAYS AS (octet_length(html) + octet_length(css)) STORED,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hero_html_versions_cap CHECK (octet_length(html) + octet_length(css) <= 51200)
);
CREATE INDEX IF NOT EXISTS hero_html_versions_slide_idx
  ON public.hero_html_versions (slide_id, created_at DESC);

ALTER TABLE public.hero_html_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hero_html_versions FROM anon, authenticated;
GRANT SELECT ON public.hero_html_versions TO authenticated;
DROP POLICY IF EXISTS hero_html_versions_select_super ON public.hero_html_versions;
CREATE POLICY hero_html_versions_select_super ON public.hero_html_versions
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- ─── 4) Baseline : une version "create" par slide / HTML existant ───────
INSERT INTO public.hero_slide_versions (slide_id, reason, snapshot, meta)
SELECT h.id, 'create', to_jsonb(h) - 'html' - 'css',
       public.hero_version_meta(to_jsonb(h) - 'html' - 'css')
FROM public.hero_promotions h
WHERE NOT EXISTS (SELECT 1 FROM public.hero_slide_versions v WHERE v.slide_id = h.id);

INSERT INTO public.hero_html_versions (slide_id, op, html, css)
SELECT x.slide_id, 'save', x.html, x.css
FROM public.hero_slide_html x
WHERE NOT EXISTS (SELECT 1 FROM public.hero_html_versions v WHERE v.slide_id = x.slide_id);

-- ─── 5) Trigger : enregistre chaque changement de slide ─────────────────
CREATE OR REPLACE FUNCTION public.hero_record_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snap jsonb;
  prev jsonb;
  sid  text;
  rsn  text;
  who  text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    snap := to_jsonb(OLD) - 'html' - 'css';
    sid := OLD.id;
    rsn := 'delete';
  ELSIF TG_OP = 'INSERT' THEN
    snap := to_jsonb(NEW) - 'html' - 'css';
    sid := NEW.id;
    rsn := 'create';
  ELSE
    snap := to_jsonb(NEW) - 'html' - 'css';
    sid := NEW.id;
    rsn := 'update';
    SELECT v.snapshot INTO prev
    FROM public.hero_slide_versions v
    WHERE v.slide_id = sid
    ORDER BY v.created_at DESC
    LIMIT 1;
    -- Réordonner (ou ré-enregistrer à l'identique) ne crée pas d'entrée.
    IF prev IS NOT NULL AND (prev - 'order') = (snap - 'order') THEN
      RETURN NULL;
    END IF;
  END IF;

  who := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email';

  INSERT INTO public.hero_slide_versions (slide_id, reason, snapshot, meta, created_by)
  VALUES (sid, rsn, snap, public.hero_version_meta(snap), who);

  -- Rétention : 30 versions par slide ; slides supprimés : 60 jours.
  DELETE FROM public.hero_slide_versions v
  WHERE v.slide_id = sid
    AND v.id NOT IN (
      SELECT id FROM public.hero_slide_versions
      WHERE slide_id = sid ORDER BY created_at DESC LIMIT 30);
  DELETE FROM public.hero_slide_versions v
  WHERE v.created_at < now() - interval '60 days'
    AND NOT EXISTS (SELECT 1 FROM public.hero_promotions h WHERE h.id = v.slide_id);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS hero_promotions_record_version ON public.hero_promotions;
CREATE TRIGGER hero_promotions_record_version
  AFTER INSERT OR UPDATE OR DELETE ON public.hero_promotions
  FOR EACH ROW EXECUTE FUNCTION public.hero_record_version();

-- ─── 6) Trigger : enregistre chaque changement de HTML ──────────────────
-- Déclenché aussi par la suppression en cascade d'un slide : le HTML reste récupérable.
CREATE OR REPLACE FUNCTION public.hero_record_html_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid     text;
  h       text;
  c       text;
  o       text;
  last_op text;
  last_h  text;
  last_c  text;
  who     text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    sid := OLD.slide_id;
    h := OLD.html;
    c := OLD.css;
    o := 'delete';
  ELSE
    sid := NEW.slide_id;
    h := NEW.html;
    c := NEW.css;
    o := 'save';
    SELECT v.op, v.html, v.css INTO last_op, last_h, last_c
    FROM public.hero_html_versions v
    WHERE v.slide_id = sid
    ORDER BY v.created_at DESC
    LIMIT 1;
    IF last_op = 'save' AND last_h IS NOT DISTINCT FROM h AND last_c IS NOT DISTINCT FROM c THEN
      RETURN NULL;
    END IF;
  END IF;

  who := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email';

  INSERT INTO public.hero_html_versions (slide_id, op, html, css, created_by)
  VALUES (sid, o, h, c, who);

  -- Rétention : 15 versions par slide ; slides supprimés : 60 jours.
  DELETE FROM public.hero_html_versions v
  WHERE v.slide_id = sid
    AND v.id NOT IN (
      SELECT id FROM public.hero_html_versions
      WHERE slide_id = sid ORDER BY created_at DESC LIMIT 15);
  DELETE FROM public.hero_html_versions v
  WHERE v.created_at < now() - interval '60 days'
    AND NOT EXISTS (SELECT 1 FROM public.hero_promotions p WHERE p.id = v.slide_id);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS hero_slide_html_record_version ON public.hero_slide_html;
CREATE TRIGGER hero_slide_html_record_version
  AFTER INSERT OR UPDATE OR DELETE ON public.hero_slide_html
  FOR EACH ROW EXECUTE FUNCTION public.hero_record_html_version();

-- ─── 7) Corbeille : lister et récupérer les slides supprimés (admin) ────
CREATE OR REPLACE FUNCTION public.hero_deleted_slides()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'hero_deleted_slides: admin requis' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC)
    FROM (
      SELECT DISTINCT ON (v.slide_id)
             v.id AS version_id, v.slide_id, v.meta, v.created_by, v.created_at
      FROM public.hero_slide_versions v
      WHERE v.reason = 'delete'
        AND NOT EXISTS (SELECT 1 FROM public.hero_promotions h WHERE h.id = v.slide_id)
      ORDER BY v.slide_id, v.created_at DESC
    ) d), '[]'::jsonb);
END;
$$;

-- Recrée le slide avec son id d'origine, TOUJOURS en brouillon (is_active = false),
-- à la fin de la file. Le HTML se récupère ensuite via l'historique HTML (super_admin).
CREATE OR REPLACE FUNCTION public.hero_restore_deleted(p_version_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.hero_slide_versions%ROWTYPE;
  r public.hero_promotions%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'hero_restore_deleted: admin requis' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v FROM public.hero_slide_versions
  WHERE id = p_version_id AND reason = 'delete';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'hero_restore_deleted: version introuvable';
  END IF;
  IF EXISTS (SELECT 1 FROM public.hero_promotions h WHERE h.id = v.slide_id) THEN
    RAISE EXCEPTION 'hero_restore_deleted: ce slide existe déjà';
  END IF;

  SELECT * INTO r FROM jsonb_populate_record(NULL::public.hero_promotions, v.snapshot);

  INSERT INTO public.hero_promotions
    (id, product_id, title, headline, sub, cta, bg_gradient, tag, image, "order",
     show_tag, show_title, is_active, layout, kind, link_url, tiles, config, starts_at, ends_at)
  VALUES
    (r.id,
     (SELECT p.id FROM public.products p WHERE p.id = r.product_id),
     r.title, r.headline, r.sub, r.cta, r.bg_gradient, r.tag, r.image,
     COALESCE((SELECT max(h."order") + 1 FROM public.hero_promotions h), 0),
     COALESCE(r.show_tag, true), COALESCE(r.show_title, true), false,
     COALESCE(r.layout, 'full'), COALESCE(r.kind, 'product'), r.link_url, r.tiles,
     COALESCE(r.config, '{"v":1}'::jsonb), r.starts_at, r.ends_at);

  RETURN r.id;
END;
$$;

REVOKE ALL ON FUNCTION public.hero_deleted_slides() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.hero_restore_deleted(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hero_deleted_slides() TO authenticated;
GRANT EXECUTE ON FUNCTION public.hero_restore_deleted(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
