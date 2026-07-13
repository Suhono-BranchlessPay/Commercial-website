-- Self-serve onboarding sessions (Blok 3.1 SKELETON) — additive only.
-- Run on VPS: psql "$DATABASE_URL" -f scripts/migrate-onboarding-sessions.sql
--
-- This table is intentionally isolated from `tenants` / `orders` / money
-- paths. A row here becomes a real tenant ONLY via the gated
-- POST /api/onboarding/:id/publish route (ONBOARDING_PUBLISH_ENABLED=1),
-- which inserts a draft/inactive tenants row — never active by default.

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'draft',
  restaurant_name text NOT NULL,
  address text,
  contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  cuisine text,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  variant text,
  menu_draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  domain text,
  square_oauth_state text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS onboarding_sessions_status_idx
  ON onboarding_sessions (status);

CREATE INDEX IF NOT EXISTS onboarding_sessions_created_idx
  ON onboarding_sessions (created_at DESC);

-- Safe to re-run: all statements are IF NOT EXISTS / additive.
