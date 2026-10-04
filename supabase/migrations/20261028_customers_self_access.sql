-- supabase/migrations/20261028_customers_self_access.sql
-- Profil : le client lit/modifie SA propre ligne (DOB, nom, préférences).
-- La lecture passait par RPC SECURITY DEFINER, mais l'écriture directe
-- (customerApi.updateProfile) dépendait d'une policy dashboard non versionnée
-- → DOB qui ne persiste pas. Idempotent (DROP IF EXISTS + recréation).
-- Périmètre strict : owner-only (auth.uid()::text = id), authenticated
-- uniquement ; les autres policies existantes sont conservées (OR permissif).

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select_own" ON public.customers;
CREATE POLICY "customers_select_own" ON public.customers
  FOR SELECT TO authenticated
  USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "customers_update_own" ON public.customers;
CREATE POLICY "customers_update_own" ON public.customers
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);
