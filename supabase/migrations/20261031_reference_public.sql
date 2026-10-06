-- supabase/migrations/20261031_reference_public.sql
-- Taxonomie publique : lecture anonyme des listes de référence (aucune PII :
-- slugs, libellés, mots-clés de classification). Le frontstore construit ses
-- facettes catégorie/événement depuis ces listes (fini les listes en dur
-- désynchronisées). Écritures inchangées (admin-only existant).
-- + Réparation : event_type='culture' (valeur fantôme écrite en dur par le
--   sync, absente de toutes les listes) -> 'casual' (défaut by design).
-- Idempotent.

ALTER TABLE public.reference_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reference_lists_select_public" ON public.reference_lists;
CREATE POLICY "reference_lists_select_public" ON public.reference_lists
  FOR SELECT TO anon, authenticated
  USING (true);

UPDATE public.products SET event_type = 'casual' WHERE event_type = 'culture';
