-- Programmatic SEO foundation (tags + places) + Powered-by footer flag.
-- Additive only — safe to re-run.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS show_powered_by boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS seo_tags (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  item_count integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'category',
  meta_title text,
  meta_description text,
  updated_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS seo_tags_tenant_slug_idx
  ON seo_tags (tenant_id, slug);

CREATE TABLE IF NOT EXISTS seo_catalog_item_tags (
  tenant_id text NOT NULL,
  menu_item_id text NOT NULL,
  tag_id text NOT NULL,
  PRIMARY KEY (tenant_id, menu_item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS seo_catalog_item_tags_tag_idx
  ON seo_catalog_item_tags (tenant_id, tag_id);

CREATE TABLE IF NOT EXISTS seo_places (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  state text,
  distance_miles real NOT NULL,
  lat real NOT NULL,
  lng real NOT NULL,
  delivery_available boolean NOT NULL DEFAULT true,
  meta_title text,
  meta_description text,
  updated_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS seo_places_tenant_slug_idx
  ON seo_places (tenant_id, slug);
