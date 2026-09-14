-- Remboursements réels (argent, pas label) + demandes clients.
-- Idempotent et rejouable : CREATE IF NOT EXISTS, DROP IF EXISTS.
-- À exécuter dans le SQL Editor de Supabase (schéma public).
--
-- 1) orders.stripe_payment_intent_id : PI résolu au paiement (hosted =
--    session → PI expand ; carte = déjà external_order_id). Sert aux
--    refunds ET au filet webhook charge.refunded, sans réinterroger Stripe.
-- 2) order_refunds : registre financier (un re_… = une ligne, unique).
--    RLS : lecture/écriture admin + service_role (edges). Aucun accès
--    direct client : tout passe par les edges (création + lecture via
--    les données de commande déjà exposées).
-- 3) refund_requests : demandes clients (bouton compte). RLS : le client
--    insère/lit SES demandes (client_id/email JWT) ; admin = tout.
--    Statuts : pending → approved | rejected (+ executed via order_refunds).

-- ── 1. Colonne PI ───────────────────────────────────────────────────────
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- ── 2. Registre des remboursements ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  stripe_refund_id text UNIQUE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'USD',
  reason text,
  status text NOT NULL DEFAULT 'succeeded'
    CHECK (status IN ('succeeded', 'pending', 'failed')),
  requested_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_refunds_admin_all" ON public.order_refunds;
CREATE POLICY order_refunds_admin_all
  ON public.order_refunds
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Lecture propriétaire : le client voit les remboursements de SES commandes
-- (montants le concernant). Jointure via orders (client_id/email JWT).
DROP POLICY IF EXISTS "order_refunds_select_own" ON public.order_refunds;
CREATE POLICY order_refunds_select_own
  ON public.order_refunds
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_refunds.order_id
        AND (
          o.client_id = (auth.uid())::text
          OR o.client_email = (auth.jwt() ->> 'email'::text)
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_order_refunds_order
  ON public.order_refunds (order_id);

-- ── 3. Demandes clients ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  customer_id text,
  customer_email text,
  amount_cents integer CHECK (amount_cents IS NULL OR amount_cents > 0),
  reason text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refund_requests_admin_all" ON public.refund_requests;
CREATE POLICY refund_requests_admin_all
  ON public.refund_requests
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "refund_requests_insert_own" ON public.refund_requests;
CREATE POLICY refund_requests_insert_own
  ON public.refund_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR (customer_id = (auth.uid())::text)
    OR (customer_email = (auth.jwt() ->> 'email'::text))
  );

DROP POLICY IF EXISTS "refund_requests_select_own" ON public.refund_requests;
CREATE POLICY refund_requests_select_own
  ON public.refund_requests
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR (customer_id = (auth.uid())::text)
    OR (customer_email = (auth.jwt() ->> 'email'::text))
  );

CREATE INDEX IF NOT EXISTS idx_refund_requests_order
  ON public.refund_requests (order_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status
  ON public.refund_requests (status);

-- ── 4. Transitions d'état manquantes (machine 20260815) ─────────────────
-- Un remboursement réel peut partir d'une commande payée ou en production
-- (annulation avant expédition) : ces arcs n'existaient pas, seul on_hold /
-- partial / shipped / delivered menaient à refunded. Idempotent.
INSERT INTO public.order_status_transitions (from_status, to_status) VALUES
  ('paid', 'refunded'),
  ('in_production', 'refunded')
ON CONFLICT DO NOTHING;
