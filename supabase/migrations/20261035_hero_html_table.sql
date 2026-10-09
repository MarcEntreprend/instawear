-- supabase/migrations/20261035_hero_slide_html_claudetest.sql
-- Variante TEST (branche style-15-claude uniquement, jamais merger) de la
-- réponse Claude lots 4-5 (20261035_hero_html_table.sql).
-- DIFFÉRENCES VOLONTAIRES avec son script (voir CHECKPOINT §4/§5) :
-- - §3 DROP (trigger, CHECK, colonnes html/css) RETIRÉ : ces structures sont
--   du code vivant (branche 15-b + garde super_admin) ; les colonnes restent.
-- - §2 reprise : conservée (no-op prouvé : colonnes vides).
-- Le reste est fidèle à son script. Idempotent. Pas de BEGIN/COMMIT.

-- ─── 1) Table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hero_slide_html (
  slide_id   text        PRIMARY KEY REFERENCES public.hero_promotions(id) ON DELETE CASCADE,
  html       text        NOT NULL DEFAULT '',
  css        text        NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hero_slide_html_cap_check
    CHECK (octet_length(html) + octet_length(css) <= 51200)
);

-- ─── 2) Reprise d'un éventuel contenu des colonnes legacy ───────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'hero_promotions' AND column_name = 'html'
  ) THEN
    INSERT INTO public.hero_slide_html (slide_id, html, css)
    SELECT id, html, css FROM public.hero_promotions WHERE html <> '' OR css <> ''
    ON CONFLICT (slide_id) DO NOTHING;
  END IF;
END $$;

-- ─── 4) RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.hero_slide_html ENABLE ROW LEVEL SECURITY;

-- Lecture publique : UNIQUEMENT le HTML des slides publiés (c'est ce que la boutique affiche).
DROP POLICY IF EXISTS hero_slide_html_select_public ON public.hero_slide_html;
CREATE POLICY hero_slide_html_select_public ON public.hero_slide_html
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hero_promotions h
    WHERE h.id = slide_id AND h.is_active = true
  ));

-- Brouillons : super_admin seulement.
DROP POLICY IF EXISTS hero_slide_html_select_super ON public.hero_slide_html;
CREATE POLICY hero_slide_html_select_super ON public.hero_slide_html
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- Écriture : super_admin seulement (aucune exception de rôle, contrairement à un trigger).
DROP POLICY IF EXISTS hero_slide_html_insert_super ON public.hero_slide_html;
CREATE POLICY hero_slide_html_insert_super ON public.hero_slide_html
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS hero_slide_html_update_super ON public.hero_slide_html;
CREATE POLICY hero_slide_html_update_super ON public.hero_slide_html
  FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS hero_slide_html_delete_super ON public.hero_slide_html;
CREATE POLICY hero_slide_html_delete_super ON public.hero_slide_html
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ─── 5) Triggers : updated_at + compteur de version ─────────────────────
CREATE OR REPLACE FUNCTION public.hero_slide_html_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hero_slide_html_touch ON public.hero_slide_html;
CREATE TRIGGER hero_slide_html_touch
  BEFORE UPDATE ON public.hero_slide_html
  FOR EACH ROW EXECUTE FUNCTION public.hero_slide_html_touch();

DROP TRIGGER IF EXISTS hero_slide_html_bump_version ON public.hero_slide_html;
CREATE TRIGGER hero_slide_html_bump_version
  AFTER INSERT OR UPDATE OR DELETE ON public.hero_slide_html
  FOR EACH STATEMENT EXECUTE FUNCTION public.hero_bump_version();

UPDATE public.hero_version SET version = version + 1, updated_at = now() WHERE id = true;

NOTIFY pgrst, 'reload schema';
