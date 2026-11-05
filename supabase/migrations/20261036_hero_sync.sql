-- supabase/migrations/20261036_hero_sync_claudetest.sql
-- Variante TEST (branche style-15-claude uniquement, jamais merger) de la
-- réponse Claude lots 4-5 (20261036_hero_sync.sql).
-- DIFFÉRENCE VOLONTAIRE : §6 cron RETIRÉ (job par minute sur base partagée
-- = bruit + flips hook_pending ; test manuel par SELECT à la place).
-- Vault/pg_net : code conservé tel quel (répond 'no-secret', prévu par lui).
-- Le reste est fidèle à son script. Idempotent. Pas de BEGIN/COMMIT.

-- ─── 1) Empreinte du dernier build déclenché ────────────────────────────
ALTER TABLE public.hero_version ADD COLUMN IF NOT EXISTS last_fingerprint text;

-- ─── 2) Snapshot public : version + slides dans UNE requête / UNE transaction ──
-- INVOKER : la RLS s'applique (anon = slides publiés seulement). Pas de html/css ici.
CREATE OR REPLACE FUNCTION public.get_hero_snapshot()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'version', (SELECT version FROM public.hero_version LIMIT 1),
    'slides',  COALESCE(
      (SELECT jsonb_agg(to_jsonb(h) ORDER BY h."order", h.id) FROM public.hero_promotions h),
      '[]'::jsonb)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_hero_snapshot() TO anon, authenticated;

-- ─── 3) Empreinte de ce que le PUBLIC voit MAINTENANT (slides publiés, fenêtre de
--        planification, HTML, produits liés). Change aussi quand un slide entre/sort
--        de sa fenêtre : le prerender se met à jour sans action humaine. ──────
CREATE OR REPLACE FUNCTION public.hero_public_fingerprint()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT md5(COALESCE((
    SELECT string_agg(
      concat_ws('|',
        h.id, h."order"::text, COALESCE(h.product_id, ''), h.config::text,
        COALESCE(h.image, ''), COALESCE(h.headline, ''), COALESCE(h.sub, ''),
        COALESCE(h.cta, ''), COALESCE(h.tag, ''), COALESCE(h.bg_gradient, ''),
        h.kind, h.layout, COALESCE(h.link_url, ''), COALESCE(h.tiles::text, ''),
        COALESCE(p.title, ''), COALESCE(p.description, ''), COALESCE(p.image, ''),
        COALESCE(p.is_active::text, ''),
        COALESCE(x.html, ''), COALESCE(x.css, '')),
      E'\n' ORDER BY h."order", h.id)
    FROM public.hero_promotions h
    LEFT JOIN public.products p        ON p.id = h.product_id
    LEFT JOIN public.hero_slide_html x ON x.slide_id = h.id
    WHERE h.is_active = true
      AND (h.starts_at IS NULL OR h.starts_at <= now())
      AND (h.ends_at   IS NULL OR h.ends_at   >  now())
  ), ''));
$$;

-- ─── 4) Déclencheur du Deploy Hook (débounce 10 min, leading + trailing) ──
-- L'URL du hook vit dans Vault (secret 'vercel_deploy_hook_url'), JAMAIS dans git.
CREATE OR REPLACE FUNCTION public.hero_flush_deploy_hook(p_force boolean DEFAULT false)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v        public.hero_version%ROWTYPE;
  fp       text;
  hook_url text;
  min_gap  interval := interval '10 minutes';
BEGIN
  SELECT * INTO v FROM public.hero_version WHERE id = true FOR UPDATE;
  IF NOT FOUND THEN RETURN 'no-row'; END IF;

  fp := public.hero_public_fingerprint();

  -- Rien n'a changé pour le public : aucun build.
  IF NOT p_force AND v.last_fingerprint IS NOT DISTINCT FROM fp THEN
    IF v.hook_pending THEN
      UPDATE public.hero_version SET hook_pending = false WHERE id = true;
    END IF;
    RETURN 'unchanged';
  END IF;

  -- Débounce : un build récent → on réessaiera (le cron repasse chaque minute).
  IF NOT p_force AND v.last_hook_at IS NOT NULL AND now() - v.last_hook_at < min_gap THEN
    IF NOT v.hook_pending THEN
      UPDATE public.hero_version SET hook_pending = true WHERE id = true;
    END IF;
    RETURN 'debounced';
  END IF;

  BEGIN
    EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = $1 LIMIT 1'
      INTO hook_url USING 'vercel_deploy_hook_url';
  EXCEPTION WHEN OTHERS THEN
    hook_url := NULL;
  END;
  IF hook_url IS NULL OR hook_url = '' THEN
    UPDATE public.hero_version SET hook_pending = true WHERE id = true;
    RETURN 'no-secret';
  END IF;

  BEGIN
    PERFORM net.http_post(url := hook_url, body := '{}'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    RETURN 'error: ' || SQLERRM;
  END;

  UPDATE public.hero_version
  SET last_hook_at = now(), last_fingerprint = fp, hook_pending = false
  WHERE id = true;
  RETURN 'triggered';
END;
$$;

REVOKE ALL ON FUNCTION public.hero_public_fingerprint() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.hero_flush_deploy_hook(boolean) FROM PUBLIC, anon, authenticated;

-- Pas de build "fantôme" à l'installation : on part de l'état actuel du public.
UPDATE public.hero_version
SET last_fingerprint = public.hero_public_fingerprint()
WHERE id = true AND last_fingerprint IS NULL;

-- ─── 5) RPC admin : état + "republier maintenant" ───────────────────────
CREATE OR REPLACE FUNCTION public.hero_sync_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v          public.hero_version%ROWTYPE;
  configured boolean := false;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'hero_sync_status: admin requis' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v FROM public.hero_version WHERE id = true;
  BEGIN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = $1)'
      INTO configured USING 'vercel_deploy_hook_url';
  EXCEPTION WHEN OTHERS THEN
    configured := false;
  END;
  RETURN jsonb_build_object(
    'version', v.version,
    'lastHookAt', v.last_hook_at,
    'pending', v.last_fingerprint IS DISTINCT FROM public.hero_public_fingerprint(),
    'hookConfigured', configured);
END;
$$;

CREATE OR REPLACE FUNCTION public.hero_request_rebuild()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'hero_request_rebuild: admin requis' USING ERRCODE = '42501';
  END IF;
  RETURN public.hero_flush_deploy_hook(true);
END;
$$;

REVOKE ALL ON FUNCTION public.hero_sync_status()    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.hero_request_rebuild() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hero_sync_status()    TO authenticated;
GRANT EXECUTE ON FUNCTION public.hero_request_rebuild() TO authenticated;

NOTIFY pgrst, 'reload schema';
