-- supabase/migrations/20261019_mockup_jobs.sql
-- Phases 1+2 Mockup Studio : file d'attente découplée pour la génération
-- de mockups Printful (fini le 1-produit-par-clic synchrone).
-- Cycle de vie : queued (tâche Printful créée, en attente) -> done/failed.
-- `processing` = revendiqué par un run worker (anti double-pick entre runs
-- concurrents) ; un processing de >15 min est repris (crash edge safe).
-- Unicité : un seul job ouvert par produit (les relances passent par
-- repassage en queued, jamais de doublon).
-- RLS : admin uniquement (service_role contourne pour l'edge).
-- À exécuter dans le SQL Editor de Supabase (schéma public).

CREATE TABLE IF NOT EXISTS public.mockup_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'done', 'failed')),
  task_key text NULL,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts int NOT NULL DEFAULT 0,
  result jsonb NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Un seul job ouvert par produit (file + anti-doublon).
CREATE UNIQUE INDEX IF NOT EXISTS mockup_jobs_open_unique
  ON public.mockup_jobs (product_id)
  WHERE status IN ('queued', 'processing');

-- Le worker lit les plus anciens jobs ouverts en premier.
CREATE INDEX IF NOT EXISTS mockup_jobs_open_idx
  ON public.mockup_jobs (status, updated_at)
  WHERE status IN ('queued', 'processing');

ALTER TABLE public.mockup_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mockup_jobs_admin_all" ON public.mockup_jobs;
CREATE POLICY "mockup_jobs_admin_all" ON public.mockup_jobs
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─── Cron optionnel (Phase 2, mains-libres) ─────────────────────────────
-- Nécessite pg_cron + vault (Supabase Dashboard > Database > Extensions :
-- activer pg_cron et vault). La clé service_role ne doit JAMAIS être en
-- dur : elle vit dans vault. Décommentez après création du secret :
--
-- SELECT vault.create_secret('service-role-key', 'VOTRE_SERVICE_ROLE_KEY', 'Edge worker mockups');
-- SELECT cron.schedule(
--   'mockup-worker-3min',
--   '*/3 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://hkbybsycaylobvbnnwak.supabase.co/functions/v1/sync-printful',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service-role-key')
--     ),
--     body := '{"action":"mockup-worker","limit":25}'::jsonb
--   );
--   $$
-- );
-- Sans cron : le bouton "Traiter la file" du Mockup Studio fait le même travail.
