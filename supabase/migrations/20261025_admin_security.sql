-- supabase/migrations/20261025_admin_security.sql
-- Phase 1 (vague A) : rôles admin réellement appliqués + journal d'audit.
-- Idempotent : rejouable sans erreur (OR REPLACE, IF NOT EXISTS, DROP POLICY).
--
-- 1) is_super_admin() : miroir de is_admin() (même forme : SQL STABLE
--    SECURITY DEFINER + search_path fixe), restreint au rôle super_admin.
-- 2) Écritures admin_users réservées super_admin : les 3 policies
--    is_admin() existantes (insert/update/delete) sont remplacées.
--    Lecture inchangée (tout admin liste). Break-glass : service_role
--    contourne toujours la RLS (réparation possible au SQL Editor).
-- 3) admin_audit_log : qui a fait quoi, quand (acteur, action, cible,
--    avant/après). Insert+select admin-only. Écriture best-effort côté
--    client (n'échoue jamais l'action métier).

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = auth.jwt() ->> 'email'
      AND role = 'super_admin'
  );
$function$;

DROP POLICY IF EXISTS "admin_users_insert_admin" ON public.admin_users;
CREATE POLICY "admin_users_insert_superadmin" ON public.admin_users
  FOR INSERT WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "admin_users_update_admin" ON public.admin_users;
CREATE POLICY "admin_users_update_superadmin" ON public.admin_users
  FOR UPDATE USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "admin_users_delete_admin" ON public.admin_users;
CREATE POLICY "admin_users_delete_superadmin" ON public.admin_users
  FOR DELETE USING (is_super_admin());

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_email text NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL DEFAULT '',
  target_id text NOT NULL DEFAULT '',
  before_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx
  ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx
  ON public.admin_audit_log (actor_email);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_log_select_admin" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_select_admin" ON public.admin_audit_log
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "admin_audit_log_insert_admin" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_insert_admin" ON public.admin_audit_log
  FOR INSERT WITH CHECK (is_admin());
