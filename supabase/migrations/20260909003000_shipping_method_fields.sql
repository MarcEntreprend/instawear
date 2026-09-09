-- Migration: Add shipping method name and delivery estimate to orders
-- These fields store the Printful shipping rate info (name, delivery window)
-- so the backend always controls shipping cost, never the client.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_delivery_estimate text;
