-- Phase 0 — Alignement doc Printful (Orders API : statut `partial` réel).
-- `partial` = commande partiellement expédiée (un colis parti, le reste suit).
-- Idempotent et rejouable : DROP IF EXISTS + recréation complète.
-- Doublonne volontairement 20261015_webhook_coverage.sql (datée d'octobre,
-- donc pas encore appliquée au 13/09) : quand 20261015 passera, elle sera
-- un no-op (même liste). Ne pas supprimer l'une sans l'autre.

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
