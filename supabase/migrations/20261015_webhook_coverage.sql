-- supabase/migrations/20261015_webhook_coverage.sql
-- Couverture webhooks Printful complète (section 4) :
-- - 'partial' ajouté aux statuts autorisés. Le frontend (orderStatus.tsx,
--   AccountPage, OrdersPage, adminTypes) et la state machine
--   (order_status_transitions + create-printful-order + printful-webhook)
--   connaissent déjà 'partial' ; seule la contrainte CHECK le refusait.
--   Débloque aussi le repli existant dans create-printful-order
--   ("si 'partial' n'est pas encore autorisé en DB").
-- - Aucune autre table requise : notifications utilise déjà les catégories
--   'orders'/'products', sync_logs existe pour tracer les events produit.
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
    'partial',
    'shipped',
    'delivered',
    'cancelled',
    'on_hold',
    'refunded',
    'returned'
  )
);
