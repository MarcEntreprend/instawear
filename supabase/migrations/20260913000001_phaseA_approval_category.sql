-- Phase A — La catégorie 'approval' manquait au CHECK distant
-- (database-context-100926 : 8 valeurs, pas 'approval').
-- Conséquence : les notifs admin d'approbation design
-- (printful-webhook order_put_hold_approval) étaient REJETÉES en silence
-- (insert dans try/catch) — jamais visibles dans /admin/notifications.
-- Idempotent et rejouable : DROP IF EXISTS + recréation complète.
-- À exécuter dans le SQL Editor de Supabase (schéma public).

ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_category_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_category_check
CHECK (
  category = ANY (
    ARRAY[
      'orders'::text,
      'products'::text,
      'customers'::text,
      'interactions'::text,
      'bonus'::text,
      'api'::text,
      'security'::text,
      'finance'::text,
      'approval'::text
    ]
  )
);
