-- supabase/migrations/20261017_printful_reports.sql
-- Phase C (gap 9) : cache local des rapports Printful
-- (GET /reports/statistics — profit, printful_costs, sales_and_costs).
-- L'edge printful-reports lit le snapshot s'il est frais (TTL 12h),
-- sinon appelle Printful puis écrase le snapshot (une ligne par période).
-- RLS : lecture/écriture admin uniquement (service_role contourne pour
-- l'edge). Miroir des politiques is_admin() existantes.
-- À exécuter dans le SQL Editor de Supabase (schéma public).

CREATE TABLE IF NOT EXISTS public.printful_report_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_start date NOT NULL,
  period_end date NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (period_start, period_end, currency)
);

ALTER TABLE public.printful_report_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "printful_reports_select_admin" ON public.printful_report_snapshots;
CREATE POLICY "printful_reports_select_admin" ON public.printful_report_snapshots
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "printful_reports_write_admin" ON public.printful_report_snapshots;
CREATE POLICY "printful_reports_write_admin" ON public.printful_report_snapshots
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
