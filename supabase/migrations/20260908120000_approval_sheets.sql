-- Migration: Add approval_data column to orders table
-- Stores Printful approval sheet data when an order is put on hold
-- requiring design approval before fulfillment can continue.

ALTER TABLE orders
  ADD COLUMN approval_data jsonb DEFAULT NULL;

COMMENT ON COLUMN orders.approval_data IS
  'Printful approval sheet data when order is on hold requiring approval. '
  'Shape: { reason, approval_files: [{ confirm_hash, submitted_design, '
  'recommended_design, approval_sheet }], received_at }';

-- Index for dashboard queries: find on_hold orders with pending approvals
CREATE INDEX idx_orders_pending_approval
  ON orders ((approval_data->>'reason'))
  WHERE status = 'on_hold' AND approval_data IS NOT NULL;
