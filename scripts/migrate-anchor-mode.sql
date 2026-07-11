-- Per-tenant BP anchor mode + order proof columns
-- Run: psql "$DATABASE_URL" -f scripts/migrate-anchor-mode.sql

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS anchor_mode text NOT NULL DEFAULT 'platform';

-- Samurai: Square already anchors via BP — website must not double-anchor
UPDATE tenants SET anchor_mode = 'pos-native' WHERE id = 'samurai';

-- Kirin & default for everyone else: Orderly website anchors
UPDATE tenants SET anchor_mode = 'platform' WHERE id = 'kirin';
UPDATE tenants SET anchor_mode = 'platform'
WHERE id NOT IN ('samurai') AND (anchor_mode IS NULL OR anchor_mode = '');

ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_reference_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bp_tx_hash text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bp_explorer_url text;

-- Backfill matching key from existing Square payment ids
UPDATE orders
SET square_reference_id = square_payment_id
WHERE square_reference_id IS NULL
  AND square_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_square_reference_id_idx
  ON orders (square_reference_id);

CREATE INDEX IF NOT EXISTS orders_square_payment_id_idx
  ON orders (square_payment_id);

-- Optional: store known proof for delivery order A09A7359 (Square→BP already anchored)
UPDATE orders SET
  square_reference_id = COALESCE(square_reference_id, square_payment_id),
  bp_anchor_id = COALESCE(bp_anchor_id, 'ae9fbbc5-783c-4c81-9114-0c6d47d8b2d9'),
  bp_content_hash = COALESCE(bp_content_hash, '3e3647d1b914c0e8ab2b92eb3cc31cdfa13328d62dfd1406c850a0c7c5c8a04a'),
  bp_anchor_status = COALESCE(bp_anchor_status, 'anchored'),
  bp_tx_hash = COALESCE(bp_tx_hash, '0x38156ee87b614b8fa11af7b2af6def820ec409dcd8ad1dd791577a1574fedd8e'),
  bp_explorer_url = COALESCE(
    bp_explorer_url,
    'https://testnet.monadexplorer.com/tx/0x38156ee87b614b8fa11af7b2af6def820ec409dcd8ad1dd791577a1574fedd8e'
  )
WHERE id = 'a09a7359-1fcd-41c7-9cfe-bc721e7db6ed';
