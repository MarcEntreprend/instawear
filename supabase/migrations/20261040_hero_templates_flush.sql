-- supabase/migrations/20261040_hero_templates_flush.sql
-- RENOMMÉ depuis 20261037 (réponse Claude lot 7) : le numéro 20261037 est
-- réservé au rollback (doc CHECKPOINT-bdd-avant-claude-45). Contenu fidèle.
-- Lot 7 : modèles de slides (config SEULE, jamais de HTML) + flush "si changé" appelable
-- par le studio (rebuild sans cron). Idempotent. Pas de BEGIN/COMMIT.

-- ─── 1) Modèles perso ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hero_templates (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  config     jsonb       NOT NULL
             CHECK (jsonb_typeof(config) = 'object' AND octet_length(config::text) <= 20000),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hero_templates FROM anon;

DROP POLICY IF EXISTS hero_templates_select_admin ON public.hero_templates;
CREATE POLICY hero_templates_select_admin ON public.hero_templates
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS hero_templates_insert_admin ON public.hero_templates;
CREATE POLICY hero_templates_insert_admin ON public.hero_templates
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS hero_templates_delete_admin ON public.hero_templates;
CREATE POLICY hero_templates_delete_admin ON public.hero_templates
  FOR DELETE TO authenticated USING (public.is_admin());

-- ─── 2) Flush "si changé" (débounce + empreinte côté serveur) ───────────
-- Sans cron (base partagée) : le studio l'appelle après chaque enregistrement et à
-- l'ouverture. Même garde-fous que le cron : rien ne part si le public n'a rien vu changer.
CREATE OR REPLACE FUNCTION public.hero_flush_if_changed()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'hero_flush_if_changed: admin requis' USING ERRCODE = '42501';
  END IF;
  RETURN public.hero_flush_deploy_hook(false);
END;
$$;

REVOKE ALL ON FUNCTION public.hero_flush_if_changed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hero_flush_if_changed() TO authenticated;

NOTIFY pgrst, 'reload schema';
