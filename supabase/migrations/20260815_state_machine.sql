-- 20260815_state_machine.sql - avec RLS (recommandé)
CREATE TABLE IF NOT EXISTS public.order_status_transitions (
  from_status text NOT NULL,
  to_status text NOT NULL,
  PRIMARY KEY (from_status, to_status)
);
ALTER TABLE public.order_status_transitions ENABLE ROW LEVEL SECURITY;

-- lecture pour tous les rôles qui en ont besoin (Edge service_role + authenticated)
DROP POLICY IF EXISTS "allow read transitions" ON public.order_status_transitions;
CREATE POLICY "allow read transitions" ON public.order_status_transitions
  FOR SELECT USING (true);

-- seed
INSERT INTO public.order_status_transitions (from_status, to_status) VALUES
  ('pending','paid'), ('pending','cancelled'),
  ('paid','in_production'), ('paid','partial'), ('paid','on_hold'), ('paid','cancelled'),
  ('in_production','shipped'), ('in_production','partial'), ('in_production','on_hold'), ('in_production','cancelled'),
  ('partial','shipped'), ('partial','on_hold'), ('partial','cancelled'), ('partial','refunded'),
  ('on_hold','in_production'), ('on_hold','partial'), ('on_hold','cancelled'), ('on_hold','refunded'),
  ('shipped','delivered'), ('shipped','returned'), ('shipped','refunded'),
  ('delivered','returned'), ('delivered','refunded')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.assert_order_transition(p_from text, p_to text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.order_status_transitions WHERE from_status=p_from AND to_status=p_to) OR p_from=p_to;
$$;