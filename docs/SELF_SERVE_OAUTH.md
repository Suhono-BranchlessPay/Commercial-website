# Self-serve OAuth (Square + Meta Page)

## Square — dashboard Connect (existing tenants)

Closes the “ops pastes TENANT_*_SQUARE_*” gap that slowed Kirin.

1. Sign in at `https://orderlyfoods.com/dashboard`
2. Pick tenant (e.g. `samurai-linton` / draft outlet)
3. **Connections → Connect Square**
4. Authorize on Square → callback `/api/onboarding/square/callback` (shared URI)
5. Encrypted tokens land in `square_oauth_connections` with `tenant_id` set
6. Menu sync triggers automatically

**Precedence:** `TENANT_{SLUG}_SQUARE_*` env still wins at charge time if present (Samurai/Kirin live path unchanged).

**Env:** `SQUARE_OAUTH_APPLICATION_ID`, `SQUARE_OAUTH_APPLICATION_SECRET`, `SQUARE_OAUTH_REDIRECT_URI`, `ORDERLY_TOKEN_ENCRYPTION_KEY`, optional `SQUARE_OAUTH_SUCCESS_REDIRECT`.

Wizard onboarding (`/onboarding`) still works for brand-new restaurants.

## Meta Page — development / allow-list only

Ready to store Page tokens via OAuth; **not** for third-party client Pages until Advanced Access.

| Flag | Meaning |
|------|---------|
| `META_PAGE_OAUTH_ENABLED=1` | Turn on start/callback |
| `META_PAGE_OAUTH_ALLOWLIST=samurai,kirin` | Default allow-list |
| `META_PAGE_OAUTH_PUBLIC=1` | **Do not set** until App Review Advanced Access |

1. Register redirect `https://samurairesto.com/api/meta/oauth/callback` on the Meta app
2. Migrate: `psql "$DATABASE_URL" -f scripts/migrate-meta-oauth.sql`
3. Enable flags for allow-list only
4. Dashboard → **Connect Facebook Page** (Samurai or Kirin test)
5. After connect: confirm Graph Page id, then update `META_PAGE_ID_TENANT_MAP_JSON` + subscribe webhooks

## Load test (staging)

```bash
STAGING_BASE=https://staging.example.com OUTLETS=27 CONCURRENCY=54 DURATION_S=60 \
  node scripts/loadtest-peak-sim.mjs
```

Refuses known production hosts unless `ALLOW_PROD_LOADTEST=1`.

## Deploy sole path

Production Samurai: **only** `bash scripts/deploy-samurai-main.sh`.  
Legacy `deploy/deploy-*.sh` and `scripts/deploy-from-github.sh` / `deploy-vps-fix.sh` exit 1.
