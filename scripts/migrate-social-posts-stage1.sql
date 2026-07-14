-- AI Social Posting Engine — Stage 1 (manual-assisted).
-- Additive only. NO auto-post to Meta. Closed loop via src_tag.

CREATE TABLE IF NOT EXISTS social_posting_config (
  tenant_id text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  frequency text NOT NULL DEFAULT '3x_week',
  post_time text,
  platforms jsonb NOT NULL DEFAULT '["facebook"]'::jsonb,
  require_approval boolean NOT NULL DEFAULT true,
  min_days_between_repeat integer NOT NULL DEFAULT 21,
  brand_voice text,
  language text NOT NULL DEFAULT 'en',
  approval_ttl_hours integer NOT NULL DEFAULT 24,
  updated_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_posts (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  menu_item_id text NOT NULL,
  menu_item_name text NOT NULL,
  platform text NOT NULL DEFAULT 'facebook',
  status text NOT NULL DEFAULT 'draft',
  angle text NOT NULL DEFAULT 'appetite',
  draft_caption text NOT NULL DEFAULT '',
  hashtags text NOT NULL DEFAULT '',
  cta text NOT NULL DEFAULT '',
  tracked_url text NOT NULL,
  src_tag text NOT NULL,
  image_url text,
  facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved_by text,
  approved_at timestamp,
  posted_at timestamp,
  posted_by text,
  skipped_reason text,
  expires_at timestamp,
  clicks integer NOT NULL DEFAULT 0,
  orders integer NOT NULL DEFAULT 0,
  revenue_cents integer NOT NULL DEFAULT 0,
  metrics_updated_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_posts_tenant_status_idx
  ON social_posts (tenant_id, status);
CREATE INDEX IF NOT EXISTS social_posts_tenant_src_idx
  ON social_posts (tenant_id, src_tag);
CREATE INDEX IF NOT EXISTS social_posts_tenant_item_posted_idx
  ON social_posts (tenant_id, menu_item_id, posted_at);
