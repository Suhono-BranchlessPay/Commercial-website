-- Phase A1/A2: money components (cents) + customer CRM fields + chain proof columns
-- Safe additive migration — does not drop legacy float columns (kept for Square/API compat).

-- A1: orders money in integer cents
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tip real NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee real NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processing_fee real NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount real NOT NULL DEFAULT 0;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_cents integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_cents integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tip_cents integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee_cents integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee_cents integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processing_fee_cents integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_cents integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_cents integer;

-- Anchor proof for bridge/dashboard (nullable until BP returns hash)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS chain_tx_hash text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bp_explorer_url text;

-- Backfill cents from existing dollar floats (Samurai historical)
UPDATE orders SET
  subtotal_cents = ROUND(subtotal * 100)::integer,
  tax_cents = ROUND(tax * 100)::integer,
  tip_cents = ROUND(COALESCE(tip, 0) * 100)::integer,
  platform_fee_cents = ROUND(COALESCE(platform_fee, 0) * 100)::integer,
  delivery_fee_cents = ROUND(COALESCE(delivery_fee, 0) * 100)::integer,
  processing_fee_cents = ROUND(COALESCE(processing_fee, 0) * 100)::integer,
  discount_cents = ROUND(COALESCE(discount, 0) * 100)::integer,
  total_cents = ROUND(total * 100)::integer
WHERE subtotal_cents IS NULL OR total_cents IS NULL OR delivery_fee_cents IS NULL;

ALTER TABLE orders ALTER COLUMN subtotal_cents SET NOT NULL;
ALTER TABLE orders ALTER COLUMN tax_cents SET NOT NULL;
ALTER TABLE orders ALTER COLUMN delivery_fee_cents SET NOT NULL;
ALTER TABLE orders ALTER COLUMN total_cents SET NOT NULL;

-- A2: customer CRM + consent (TCPA/CAN-SPAM foundation)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_order_at timestamp;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_order_at timestamp;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS order_count integer NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_spent_cents integer NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS marketing_consent_email boolean NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS marketing_consent_sms boolean NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS consent_timestamp timestamp;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS consent_source text;

-- Backfill customer aggregates from paid orders (tenant-scoped)
UPDATE customers c SET
  order_count = s.cnt,
  total_spent_cents = s.spent,
  first_order_at = s.first_at,
  last_order_at = s.last_at
FROM (
  SELECT
    customer_id,
    COUNT(*)::integer AS cnt,
    COALESCE(SUM(COALESCE(total_cents, ROUND(total * 100)::integer)), 0)::integer AS spent,
    MIN(created_at) AS first_at,
    MAX(created_at) AS last_at
  FROM orders
  WHERE customer_id IS NOT NULL
    AND payment_status = 'paid'
  GROUP BY customer_id
) s
WHERE c.id = s.customer_id;

-- Bridge webhook delivery log (idempotent retries)
CREATE TABLE IF NOT EXISTS bridge_webhook_deliveries (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  event_type text NOT NULL,
  idempotency_key text NOT NULL,
  order_id text,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamp NOT NULL DEFAULT NOW(),
  delivered_at timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS bridge_webhook_idempotency_idx
  ON bridge_webhook_deliveries (tenant_id, idempotency_key);

CREATE TABLE IF NOT EXISTS bridge_audit_log (
  id text PRIMARY KEY,
  actor text NOT NULL,
  method text NOT NULL,
  path text NOT NULL,
  tenant_id text,
  status_code integer,
  created_at timestamp NOT NULL DEFAULT NOW()
);
