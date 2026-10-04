-- supabase/migrations/20261029_customers_self_access_v2.sql
-- Profil : durcit 20261028. La comparaison utilise id::text des deux côtés :
-- que customers.id soit TEXT (uuid en chaîne) ou UUID natif, la policy
-- s'évalue au lieu de lever "operator does not exist" (fail closed qui
-- expliquait le DOB ne persistant pas malgré 20261028 appliquée).
-- Idempotent (DROP IF EXISTS + recréation, mêmes noms).

DROP POLICY IF EXISTS "customers_select_own" ON public.customers;
CREATE POLICY "customers_select_own" ON public.customers
  FOR SELECT TO authenticated
  USING ((auth.uid())::text = id::text);

DROP POLICY IF EXISTS "customers_update_own" ON public.customers;
CREATE POLICY "customers_update_own" ON public.customers
  FOR UPDATE TO authenticated
  USING ((auth.uid())::text = id::text)
  WITH CHECK ((auth.uid())::text = id::text);
