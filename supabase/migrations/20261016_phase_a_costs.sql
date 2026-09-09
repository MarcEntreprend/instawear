-- supabase/migrations/20261016_phase_a_costs.sql
-- Phase A (gaps 8+11) : snapshot des coûts Printful par commande.
-- create-printful-order reçoit costs/retail_costs/pricing_breakdown à la
-- création et les jette ; on les persiste pour affichage ADMIN uniquement
-- (le client a déjà produit+shipping via track/email/compte).
-- Colonne nullable + best-effort côté edge : si la migration n'est pas
-- exécutée, la création de commande continue de fonctionner.
-- À exécuter dans le SQL Editor de Supabase (schéma public).

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS printful_costs jsonb NULL;
