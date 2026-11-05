-- supabase/migrations/20261042_hero_stats.sql
-- Hero Studio — Lot 10 : événements hero_impression / hero_click + RPC de statistiques (admin).
-- Idempotent. Pas de BEGIN/COMMIT. 42 > 41 ; le 37 reste réservé à ton rollback.

-- ─── 1) Étendre le CHECK de event_type (nom du CHECK existant inconnu : on le retrouve) ──
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.engagement_events'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%event_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.engagement_events DROP CONSTRAINT %I', c.conname);
  END LOOP;

  ALTER TABLE public.engagement_events
    ADD CONSTRAINT engagement_events_event_type_check
    CHECK (event_type IN (
      'section_impression', 'product_click', 'search', 'filter_applied',
      'add_to_cart', 'favourite', 'hero_impression', 'hero_click'));
END $$;

-- ─── 2) Index partiel : les statistiques hero ne scannent que les lignes hero ──
CREATE INDEX IF NOT EXISTS engagement_events_hero_idx
  ON public.engagement_events (entity_id, created_at)
  WHERE entity_type = 'hero_slide';

-- ─── 3) Statistiques (admin) : par slide, par variante, par bouton, par jour ──
-- Exclut les administrateurs connectés (leurs visites ne polluent pas les chiffres).
CREATE OR REPLACE FUNCTION public.hero_stats(p_days integer DEFAULT 14)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d   integer := GREATEST(1, LEAST(COALESCE(p_days, 14), 90));
  res jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'hero_stats: admin requis' USING ERRCODE = '42501';
  END IF;

  WITH ev AS (
    SELECT e.entity_id AS slide_id, e.event_type, e.session_id,
           COALESCE(NULLIF(e.context->>'v', ''), '?')   AS v,
           COALESCE(NULLIF(e.context->>'cta', ''), '?') AS cta,
           e.created_at
    FROM public.engagement_events e
    WHERE e.entity_type = 'hero_slide'
      AND e.event_type IN ('hero_impression', 'hero_click')
      AND e.created_at >= now() - make_interval(days => d)
      AND NOT EXISTS (
        SELECT 1
        FROM auth.users u
        JOIN public.admin_users a ON lower(a.email) = lower(u.email)
        WHERE e.customer_id IS NOT NULL AND u.id::text = e.customer_id)
  ),
  per_slide AS (
    SELECT slide_id,
           count(*) FILTER (WHERE event_type = 'hero_impression') AS impressions,
           count(*) FILTER (WHERE event_type = 'hero_click')      AS clicks,
           count(DISTINCT session_id) FILTER (WHERE event_type = 'hero_impression') AS imp_sessions,
           count(DISTINCT session_id) FILTER (WHERE event_type = 'hero_click')      AS click_sessions
    FROM ev GROUP BY slide_id
  ),
  per_variant AS (
    SELECT slide_id,
           jsonb_object_agg(v, jsonb_build_object(
             'impressions', imp, 'clicks', clk,
             'impSessions', isess, 'clickSessions', csess)) AS j
    FROM (
      SELECT slide_id, v,
             count(*) FILTER (WHERE event_type = 'hero_impression') AS imp,
             count(*) FILTER (WHERE event_type = 'hero_click')      AS clk,
             count(DISTINCT session_id) FILTER (WHERE event_type = 'hero_impression') AS isess,
             count(DISTINCT session_id) FILTER (WHERE event_type = 'hero_click')      AS csess
      FROM ev GROUP BY slide_id, v
    ) x
    GROUP BY slide_id
  ),
  per_cta AS (
    SELECT slide_id, jsonb_object_agg(cta, n) AS j
    FROM (
      SELECT slide_id, cta, count(*) AS n
      FROM ev WHERE event_type = 'hero_click' GROUP BY slide_id, cta
    ) y
    GROUP BY slide_id
  ),
  per_day AS (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS day,
           count(*) FILTER (WHERE event_type = 'hero_impression') AS impressions,
           count(*) FILTER (WHERE event_type = 'hero_click')      AS clicks
    FROM ev GROUP BY 1
  )
  SELECT jsonb_build_object(
    'days', d,
    'since', now() - make_interval(days => d),
    'lastEventAt', (SELECT max(created_at) FROM ev),
    'slides', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'slideId', s.slide_id,
               'impressions', s.impressions, 'clicks', s.clicks,
               'impSessions', s.imp_sessions, 'clickSessions', s.click_sessions,
               'byVariant', COALESCE(pv.j, '{}'::jsonb),
               'byCta', COALESCE(pc.j, '{}'::jsonb))
             ORDER BY s.impressions DESC)
      FROM per_slide s
      LEFT JOIN per_variant pv USING (slide_id)
      LEFT JOIN per_cta pc USING (slide_id)), '[]'::jsonb),
    'daily', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'date', day, 'impressions', impressions, 'clicks', clicks)
             ORDER BY day)
      FROM per_day), '[]'::jsonb))
  INTO res;

  RETURN res;
END;
$$;

REVOKE ALL ON FUNCTION public.hero_stats(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hero_stats(integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
