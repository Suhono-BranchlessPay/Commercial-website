-- Blok A — Square → Orderly menu sync (additive only, safe to re-run).
--
-- Principle: SQUARE is the source of truth for the menu. Orderly FOLLOWS.
-- This migration never touches money/charge paths, never writes/overwrites
-- Square access tokens (env-based Samurai tokens or the encrypted
-- square_oauth_connections rows are both left completely alone), and never
-- deletes existing menu_items/menu_categories rows or data.
--
-- See docs/BLOK_A_SQUARE_MENU_SYNC.md for the full rollout + verify checklist.

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS square_catalog_object_id text,
  ADD COLUMN IF NOT EXISTS square_variation_id text,
  ADD COLUMN IF NOT EXISTS square_category_id text,
  ADD COLUMN IF NOT EXISTS square_modifiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS menu_items_square_variation_idx
  ON menu_items (square_variation_id);

CREATE INDEX IF NOT EXISTS menu_items_tenant_square_variation_idx
  ON menu_items (tenant_id, square_variation_id);

ALTER TABLE menu_categories
  ADD COLUMN IF NOT EXISTS square_category_id text;

CREATE INDEX IF NOT EXISTS menu_categories_square_category_idx
  ON menu_categories (square_category_id);

-- One row per tenant tracking the health of the last Square → Orderly pull.
-- Never stores Square tokens/secrets — only status/counters/error text.
CREATE TABLE IF NOT EXISTS menu_sync_state (
  tenant_id text PRIMARY KEY,
  last_started_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  last_item_count integer,
  last_cursor text,
  catalog_version text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
