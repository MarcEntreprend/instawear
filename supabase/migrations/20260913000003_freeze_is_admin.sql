-- Bloc 2 (audit sécurité) — fige is_admin() en versionné.
-- Cette fonction est le pivot d'environ 40 policies RLS mais n'existait
-- nulle part dans supabase/migrations/ (créée via dashboard). Sa définition
-- exacte a été extraite en prod le 13/09/2026 via
--   SELECT pg_get_functiondef('public.is_admin()'::regprocedure);
-- et est recréée ici À L'IDENTIQUE (aucun changement sémantique) pour que
-- toute dérive future se voie en diff. Idempotent (OR REPLACE).
-- Sémantique : email du JWT ∈ admin_users avec rôle admin/super_admin.
-- SECURITY DEFINER + search_path fixe (anti search_path-hijack).

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = auth.jwt() ->> 'email'
      AND role IN ('admin', 'super_admin')
  );
$function$;
