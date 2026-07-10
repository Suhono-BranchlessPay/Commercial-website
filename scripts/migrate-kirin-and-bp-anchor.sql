-- Kirin tenant #2 + BP post-pay anchor columns
-- Run after migrate-multi-tenant-foundation.sql

ALTER TABLE orders ADD COLUMN IF NOT EXISTS bp_anchor_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bp_content_hash text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bp_anchor_status text;

-- Tenant #2: Kirin — distinct theme (emerald/gold), separate domain.
-- Update address/coords/phone when real Kirin location credentials are ready.
-- Secrets: TENANT_KIRIN_SQUARE_*, TENANT_KIRIN_DOORDASH_*, TENANT_KIRIN_BRANCHLESSPAY_LICENSE_KEY
INSERT INTO tenants (
  id, slug, name, domain,
  address, city, state, postcode, lat, lng,
  service_area_radius, pickup_phone, pickup_business_name,
  theme, status
) VALUES (
  'kirin',
  'kirin',
  'Kirin Hibachi',
  'kirinhibachi.com',
  'TBD — set real street',
  'Martinsville',
  'IN',
  '46151',
  39.43,
  -86.42,
  12,
  NULL,
  'Kirin Hibachi',
  '{
    "primary": "160 84% 32%",
    "secondary": "43 90% 48%",
    "accent": "160 30% 8%",
    "brandName": "Kirin Hibachi",
    "logoUrl": null
  }'::jsonb,
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  theme = EXCLUDED.theme,
  pickup_business_name = EXCLUDED.pickup_business_name;
