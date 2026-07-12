-- Anchor mode per tenant (SUMBER §4.3 / Spec_Anchor_Mode_PerTenant.md)
-- platform = Orderly website POST /api/v1/anchor
-- pos-native = POS (Square) already anchors; Orderly only stores proof-back

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS anchor_mode text NOT NULL DEFAULT 'platform';

UPDATE tenants
SET anchor_mode = 'pos-native'
WHERE id = 'samurai' OR slug = 'samurai';

UPDATE tenants
SET anchor_mode = 'platform'
WHERE anchor_mode IS NULL OR anchor_mode = '';
