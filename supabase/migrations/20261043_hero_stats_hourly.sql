-- supabase/migrations/20261043_hero_stats_hourly.sql
-- Hero Studio — grain horaire des stats (24 dernières heures, UTC).
-- Remplace hero_stats() à l'identique + clé `hourly`. Le reste (filtres,
-- RLS, buckets jour/slide/variante/CTA) est inchangé. Idempotent.

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
  ),
  per_hour AS (
    SELECT date_trunc('hour', created_at AT TIME ZONE 'UTC') AS hour,
           count(*) FILTER (WHERE event_type = 'hero_impression') AS impressions,
           count(*) FILTER (WHERE event_type = 'hero_click')      AS clicks
    FROM ev
    WHERE created_at >= now() - interval '24 hours'
    GROUP BY 1
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
      FROM per_day), '[]'::jsonb),
    'hourly', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'hour', hour, 'impressions', impressions, 'clicks', clicks)
             ORDER BY hour)
      FROM per_hour), '[]'::jsonb))
  INTO res;

  RETURN res;
END;
$$;

NOTIFY pgrst, 'reload schema';
