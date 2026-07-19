-- Content Engine: skip third-party / non-promotable catalog rows.
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS exclude_from_content boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN menu_items.exclude_from_content IS
  'When true, Content Calendar / generator must not target this item.';
