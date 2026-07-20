-- Per-tenant sales tax (fail-closed checkout when NULL).
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS tax_rate real;

COMMENT ON COLUMN tenants.tax_rate IS
  'Sales tax decimal (0.07 = 7%). NULL = refuse checkout until set.';

-- Samurai Martinsville IN — existing hardcoded rate made explicit.
UPDATE tenants
SET tax_rate = 0.07
WHERE slug = 'samurai' AND tax_rate IS NULL;

-- Kirin Henderson KY — leave NULL until Malik confirms local prepared-food rate.
-- Do NOT copy 0.07 from Indiana.
