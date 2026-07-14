-- Loyalty / Rewards foundation (Part 2).
-- Additive only — safe to re-run.
-- Does NOT import Owner.com balances (migrate path is separate + gated).

CREATE TABLE IF NOT EXISTS loyalty_programs (
  tenant_id text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  points_per_dollar integer NOT NULL DEFAULT 1,
  redemption_rules jsonb NOT NULL DEFAULT '{"min_redeem_points":100,"points_per_dollar_off":100,"max_percent_of_subtotal":50}'::jsonb,
  expiry_days integer,
  status text NOT NULL DEFAULT 'draft',
  updated_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  customer_id text NOT NULL,
  points_balance integer NOT NULL DEFAULT 0,
  lifetime_points integer NOT NULL DEFAULT 0,
  updated_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_accounts_tenant_customer_idx
  ON loyalty_accounts (tenant_id, customer_id);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  customer_id text NOT NULL,
  account_id text NOT NULL,
  order_id text,
  type text NOT NULL,
  points integer NOT NULL,
  reason text,
  bp_anchor_id text,
  bp_content_hash text,
  bp_anchor_status text,
  chain_tx_hash text,
  bp_explorer_url text,
  external_ref text,
  created_at timestamp NOT NULL DEFAULT now()
);

-- Partial unique: one earn per order (order_id null for non-earn types allowed many times)
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_txn_earn_order_idx
  ON loyalty_transactions (tenant_id, order_id, type)
  WHERE order_id IS NOT NULL AND type = 'earn';

CREATE INDEX IF NOT EXISTS loyalty_txn_tenant_customer_idx
  ON loyalty_transactions (tenant_id, customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS loyalty_txn_tenant_type_idx
  ON loyalty_transactions (tenant_id, type, created_at DESC);
