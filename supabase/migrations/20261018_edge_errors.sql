-- supabase/migrations/20261018_edge_errors.sql
-- Gap 13 (monitoring autonome, sans vendor) : table des erreurs edge.
-- Lue par la page admin Monitoring (/admin/monitoring) via RLS admin-only.
-- Remplie par reportError() (_shared/opsUtils.ts) en best-effort (jamais
-- bloquant). Les notifications "critical" partent en plus vers
-- notifications (catégorie "api", dédupliquées 30 min).
-- À exécuter dans le SQL Editor de Supabase (schéma public).

CREATE TABLE IF NOT EXISTS public.edge_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name text NOT NULL,
  action text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium')),
  message text NOT NULL DEFAULT '',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edge_errors_created_idx
  ON public.edge_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS edge_errors_unresolved_idx
  ON public.edge_errors (resolved, created_at DESC)
  WHERE resolved = false;

ALTER TABLE public.edge_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "edge_errors_select_admin" ON public.edge_errors;
CREATE POLICY "edge_errors_select_admin" ON public.edge_errors
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "edge_errors_update_admin" ON public.edge_errors;
CREATE POLICY "edge_errors_update_admin" ON public.edge_errors
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
