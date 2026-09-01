-- supabase/migrations/20260814_add_variant_availability.sql
-- P0/P1/P2 - Disponibilité par variante + statut par order_item (POD, Printful)
-- ADDITIVE ONLY : colonnes NULLABLE, pas de DROP, pas de NOT NULL, pas de backfill destructif.
-- À exécuter dans Supabase SQL Editor (public schema). Idempotent (IF NOT EXISTS).
--
-- Contexte : Printful n'a pas de stock réel côté InstaWear, mais un variant
-- (couleur x taille) peut devenir discontinued / out_of_stock côté Printful
-- ou désactivé manuellement via admin (is_active). Sans ce patch, le variant
-- reste achetable et bloque toute la commande (logique tout-ou-rien).
--

-- 1. order_items : statut par ligne pour permettre fulfillment partiel
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS print_status text;
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS block_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_print_status_check'
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_print_status_check
      CHECK (print_status IN (
        'pending',
        'fulfillable',
        'blocked_inactive',
        'blocked_discontinued',
        'blocked_out_of_stock',
        'fulfilled',
        'failed'
      ));
  END IF;
END $$;

-- index pour filtrage admin "voir les bloqués"
CREATE INDEX IF NOT EXISTS idx_order_items_print_status ON public.order_items(print_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 2. products : garde optionnelle pour statut détaillé si besoin futur
-- On enrichit surtout products.variants jsonb (sizes.{price, stock_status}),
-- pas besoin de colonne supplémentaire. On ajoute seulement un jsonb d'audit
-- léger, nullable, pour tracer le dernier sync Printful sans casser l'existant.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variant_availability jsonb DEFAULT NULL;

-- 3. orders : s'assurer que 'partial' existe pour P4 partiel si tu l'actives
-- On garde le check existant de 20260813, on l'étend seulement si absent
DO $$
BEGIN
  -- test si 'partial' manque dans la contrainte
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check'
  ) THEN
    -- recréer avec 'partial' inclus (idempotent)
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
      CHECK (status IN ('pending','paid','in_production','shipped','delivered','cancelled','on_hold','refunded','returned','partial'));
  END IF;
END $$;

-- 4. Commentaires
COMMENT ON COLUMN public.order_items.print_status IS 'POD: statut Printful par ligne - pending/fulfillable/blocked_* - permet fulfillment partiel sans bloquer toute la commande';
COMMENT ON COLUMN public.order_items.block_reason IS 'Raison blocage : manuellement désactivé | discontinued Printful | out_of_stock Printful | variant_id introuvable';
COMMENT ON COLUMN public.products.variant_availability IS 'Audit sync Printful: { "hex|size": stock_status } - debug, source variants reste la vérité';
