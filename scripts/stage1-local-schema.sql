-- Stage 1 local schema (minimal) for orderly_sandbox
-- Do not run against production.

CREATE TABLE IF NOT EXISTS menu_categories (
  id text PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'samurai',
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS menu_items (
  id text PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'samurai',
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  price real NOT NULL,
  image_url text,
  available boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS menu_items_tenant_sku_uidx ON menu_items (tenant_id, sku);
CREATE INDEX IF NOT EXISTS menu_items_tenant_id_idx ON menu_items (tenant_id);

CREATE TABLE IF NOT EXISTS customers (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  first_name text NOT NULL,
  last_name text,
  phone text NOT NULL,
  email text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_tenant_phone_idx ON customers (tenant_id, phone);

CREATE TABLE IF NOT EXISTS addresses (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  customer_id text NOT NULL REFERENCES customers(id),
  street text NOT NULL,
  unit text,
  city text NOT NULL,
  state text NOT NULL,
  postcode text NOT NULL,
  lat real NOT NULL,
  lng real NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'samurai',
  customer_id text,
  address_id text,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  order_type text NOT NULL,
  delivery_address text,
  subtotal real NOT NULL,
  tax real NOT NULL,
  total real NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_timing text NOT NULL DEFAULT 'pay_at_pickup',
  payment_status text NOT NULL DEFAULT 'unpaid',
  square_order_id text,
  square_payment_id text,
  delivery_fee real NOT NULL DEFAULT 0,
  doordash_external_delivery_id text,
  doordash_tracking_url text,
  doordash_status text,
  estimated_dropoff_time text,
  bp_anchor_id text,
  bp_content_hash text,
  bp_anchor_status text,
  special_instructions text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_tenant_id_idx ON orders (tenant_id);

CREATE TABLE IF NOT EXISTS order_lines (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id),
  menu_item_id text NOT NULL,
  menu_item_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price real NOT NULL,
  subtotal real NOT NULL,
  special_instructions text
);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS anchor_mode text DEFAULT 'pos-native';
UPDATE tenants SET anchor_mode = 'pos-native' WHERE id = 'samurai' AND (anchor_mode IS NULL OR anchor_mode = '');

-- Minimal menu for Stage 1 card test
INSERT INTO menu_categories (id, tenant_id, name, sort_order) VALUES
  ('cat-rolls', 'samurai', 'Rolls', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (id, tenant_id, sku, name, description, category, price, available, featured) VALUES
  ('item-stage1-test', 'samurai', 'STAGE1-TEST', 'Stage1 Test Roll', 'Sandbox-only cheapest test item', 'Rolls', 1.00, true, true)
ON CONFLICT (id) DO UPDATE SET price = 1.00, available = true, name = EXCLUDED.name;
