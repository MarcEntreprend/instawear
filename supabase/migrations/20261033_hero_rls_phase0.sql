-- supabase/migrations/20261033_hero_rls_phase0.sql
-- Phase 0 Hero Studio : audit + versionnage RLS hero_promotions.
--
-- AUDIT (database-info-07102026.md, blocs 3+4 + sonde anon live) :
-- - hero_promotions_select_public : SELECT TO {anon,authenticated} USING (true)
--   => TOUTES les lignes lisibles publiquement, y compris is_active=false
--   (brouillons + futur HTML non publié). Sondé : 200 + 5 lignes en anon.
-- - insert/update/delete : admin-only (is_admin()), sains.
-- - Aucune policy hero versionnée en repo (seuls les CHECK layout/kind le
--   sont) ; RLS activée sur la table.
-- - product_id NOT NULL + FK ON DELETE CASCADE : les slides sans produit
--   (studio) exigeront un assouplissement — PHASE 1 (Claude), pas ici.
--
-- CORRECTIF (aucun changement de comportement légitime) :
-- - anon/authenticated : publiés seuls (is_active = true).
-- - authenticated admin : tout (is_admin()), pour que l'admin continue de
--   voir/gérer les inactifs. OR permissif entre les deux policies SELECT.
-- - insert/update/delete : recréées à l'identique (versionnage).
-- Vérifié compatible : front filtre isActive côté client (sous-ensemble OK),
-- PromotionsPage admin (authenticated + is_admin), prerender (clé anon, ne
-- consomme que des publiés), edges (service_role, hors RLS).
-- Idempotent (DROP IF EXISTS + recréation).

ALTER TABLE public.hero_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hero_promotions_select_public" ON public.hero_promotions;
CREATE POLICY "hero_promotions_select_public" ON public.hero_promotions
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "hero_promotions_select_admin" ON public.hero_promotions;
CREATE POLICY "hero_promotions_select_admin" ON public.hero_promotions
  FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "hero_promotions_insert_admin" ON public.hero_promotions;
CREATE POLICY "hero_promotions_insert_admin" ON public.hero_promotions
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "hero_promotions_update_admin" ON public.hero_promotions;
CREATE POLICY "hero_promotions_update_admin" ON public.hero_promotions
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "hero_promotions_delete_admin" ON public.hero_promotions;
CREATE POLICY "hero_promotions_delete_admin" ON public.hero_promotions
  FOR DELETE TO authenticated
  USING (is_admin());
