-- Customer foundation migration (per-tenant customers + addresses)
-- Run on VPS: psql "$DATABASE_URL" -f scripts/migrate-customer-foundation.sql

-- Customers table evolution
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'name'
  ) THEN
    UPDATE customers
    SET first_name = COALESCE(first_name, split_part(name, ' ', 1)),
        last_name = COALESCE(last_name, NULLIF(trim(substring(name from position(' ' in name) + 1)), ''))
    WHERE first_name IS NULL;
  END IF;
END $$;

ALTER TABLE customers ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE customers DROP COLUMN IF EXISTS name;
ALTER TABLE customers DROP COLUMN IF EXISTS city;
ALTER TABLE customers ALTER COLUMN email DROP NOT NULL;

DROP INDEX IF EXISTS customers_phone_key;
CREATE UNIQUE INDEX IF NOT EXISTS customers_tenant_phone_idx ON customers (tenant_id, phone);

-- Addresses table
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

-- Orders FK columns (keep denormalized snapshot columns)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id text REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_id text REFERENCES addresses(id);

CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders (customer_id);
CREATE INDEX IF NOT EXISTS addresses_customer_id_idx ON addresses (customer_id);
