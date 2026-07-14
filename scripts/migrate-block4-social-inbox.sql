-- Blok 4.1 — Social media TRIAL skeleton (additive only, safe to re-run).
-- Scope: ONE tenant (samurai). MODE AWAL: every reply needs human approval —
-- nothing in this schema implies auto-send. See docs/BLOK4_SOCIAL_TRIAL.md.

CREATE TABLE IF NOT EXISTS social_inbox (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  platform text NOT NULL,                 -- facebook | instagram
  external_thread_id text,
  external_message_id text,
  direction text NOT NULL DEFAULT 'in',    -- in | out
  author_name text,
  body text,
  -- heuristic keyword classification (NOT ML) — see lib/socialClassify.ts
  classification text NOT NULL DEFAULT 'unknown',
  draft_reply text,
  status text NOT NULL DEFAULT 'new',      -- new|drafted|pending_approval|approved|sent|skipped|blocked
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- NULLs are distinct in a unique index, so rows without an external_message_id
-- never collide with each other — this only dedupes real webhook retries.
CREATE UNIQUE INDEX IF NOT EXISTS social_inbox_dedupe_idx
  ON social_inbox (tenant_id, platform, external_message_id);

CREATE INDEX IF NOT EXISTS social_inbox_tenant_status_idx
  ON social_inbox (tenant_id, status, created_at);

CREATE TABLE IF NOT EXISTS social_reply_audit (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  inbox_id text NOT NULL,
  action text NOT NULL,   -- approve|edit|skip|send|block|kill_switch
  actor text NOT NULL,
  before_body text,
  after_body text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_reply_audit_inbox_idx
  ON social_reply_audit (inbox_id, created_at);

CREATE INDEX IF NOT EXISTS social_reply_audit_tenant_idx
  ON social_reply_audit (tenant_id, created_at);

-- No secrets are stored in this migration. Tokens live in env only:
--   META_PAGE_ACCESS_TOKEN (or TENANT_SAMURAI_META_PAGE_ACCESS_TOKEN)
--   META_APP_SECRET, META_WEBHOOK_VERIFY_TOKEN
--   SOCIAL_KILL_SWITCH_SAMURAI, SOCIAL_SEND_ENABLED
-- See docs/BLOK4_SOCIAL_TRIAL.md for the full list.
