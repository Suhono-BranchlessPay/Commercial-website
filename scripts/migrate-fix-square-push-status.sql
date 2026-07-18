-- Fix misleading square_push_status=pending when Square IDs already exist.
-- Safe to re-run. Columns may already exist on some VPS DBs.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_push_status text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_push_error text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_pushed_at timestamptz;

UPDATE orders
SET
  square_push_status = 'pushed',
  square_push_error = NULL,
  square_pushed_at = COALESCE(square_pushed_at, paid_at, created_at)
WHERE square_order_id IS NOT NULL
  AND COALESCE(square_push_status, '') <> 'pushed';

-- Orders never sent to Square should not look "pending forever"
UPDATE orders
SET square_push_status = 'not_applicable'
WHERE square_order_id IS NULL
  AND COALESCE(square_push_status, 'pending') = 'pending'
  AND payment_status IN ('unpaid', 'failed', 'refunded');
