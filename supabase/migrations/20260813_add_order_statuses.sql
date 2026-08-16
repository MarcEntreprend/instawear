-- supabase/migrations/20260813_add_order_statuses.sql
-- Nouveaux statuts de commande pour les webhooks Printful optionnels.
--
-- - on_hold  : commande mise en pause par Printful (order_put_hold)
-- - refunded : commande remboursée (order_refunded)
-- - returned : colis renvoyé au vendeur (package_returned)
--
-- La contrainte orders_status_check est supprimée puis recréée avec la
-- liste complète. La liste reflète les statuts utilisés par le code :
-- pending, paid, in_production, shipped, delivered, cancelled + les trois
-- nouveaux ci-dessus.
-- À exécuter dans le SQL Editor de Supabase (schéma public).

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_status_check
CHECK (
  status IN (
    'pending',
    'paid',
    'in_production',
    'shipped',
    'delivered',
    'cancelled',
    'on_hold',
    'refunded',
    'returned'
  )
);
