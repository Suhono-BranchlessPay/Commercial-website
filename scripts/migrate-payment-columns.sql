-- Run once on production Postgres (samurai-resto DB)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_timing text NOT NULL DEFAULT 'pay_at_pickup';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_payment_id text;
