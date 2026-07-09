-- DoorDash delivery columns (run once on production Postgres)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee real NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS doordash_external_delivery_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS doordash_tracking_url text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS doordash_status text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_dropoff_time text;
