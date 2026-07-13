# Self-Serve Onboarding — Blok 3.1 SKELETON

Status: **skeleton only**. This is not the production OAuth/C1 self-serve
flow. It exists so a restaurant could *eventually* walk themselves through
setup, but today every "real" side effect is either a stub or hard-gated off.

Branch: `feature/block1-qr-anchor-monitor`.

## What this is

A draft-only wizard flow, stored entirely in a new `onboarding_sessions`
table. Nothing in this flow:

- reads or uses a live Square client id/secret,
- writes to the live `menu_categories` / `menu_items` tables,
- creates an **active** tenant,
- touches money/payment paths.

## Steps

| # | Step | Endpoint | Stub or real |
|---|------|----------|---------------|
| 1 | Start | `POST /api/onboarding/start` | Real (writes `onboarding_sessions` row) |
| 2 | Status | `GET /api/onboarding/status?session=<id>` | Real |
| 3 | Theme | `POST /api/onboarding/:id/theme` | **Stub** — deterministic palette from a hash of the restaurant name (6 fixed palettes), *not* ML/AI |
| 4 | Variant | `POST /api/onboarding/:id/variant` | Real (stores one of `classic`/`modern`/`minimal`) |
| 5 | Menu draft | `POST /api/onboarding/:id/menu-draft` | Real storage, but **draft JSON only** — never written to the live menu |
| 6 | Domain | `POST /api/onboarding/:id/domain` | Real storage of the requested subdomain/domain string — no DNS/cert automation |
| 7 | Preview | `GET /api/onboarding/:id/preview` | Real read-only summary of the draft session |
| 8 | Square connect | `POST /api/onboarding/:id/square/start` | **Stub** — always `501`, no Square client id/secret used, just records a random CSRF-style state |
| 8b | Square callback | `GET/POST /api/onboarding/square/callback` | **Stub** — always `501`, no code exchange |
| 9 | Publish | `POST /api/onboarding/:id/publish` | **Gated stub** — `501` unless `ONBOARDING_PUBLISH_ENABLED=1`; when enabled, creates a `tenants` row with `status = "draft"` (never `active`) |

`status` on the session progresses: `draft → theme_set → variant_set → menu_draft → domain_set → ready → published`.

## Storage

- New table: `onboarding_sessions` (additive migration, no existing tables touched).
- Migration script: `scripts/migrate-onboarding-sessions.sql` (idempotent — safe to re-run).
- Drizzle schema: `lib/db/src/schema/onboarding.ts`, exported from `lib/db/src/schema/index.ts`.

Fields: `id, status, restaurant_name, address, contact (jsonb), cuisine, theme (jsonb), variant, menu_draft (jsonb), domain, square_oauth_state, created_at, updated_at`.

`square_oauth_state` is a random UUID placeholder for a future CSRF check — it
is never returned in any public API response.

## Routing / hosting

- API routes are mounted at `/api/onboarding/*` (`artifacts/api-server/src/routes/onboarding.ts`), registered in `artifacts/api-server/src/routes/index.ts`.
- `/api/onboarding/*` is added to the tenant-resolution exemption list in `artifacts/api-server/src/middleware/tenant.ts` (a prospective restaurant has no tenant yet, so it must not 404 on tenant lookup).
- A minimal static wizard page is served at `/onboarding` (`artifacts/api-server/public/onboarding/index.html`), gated behind `requireOrderlyDashboardHostPage` (same host allowlist as `/dashboard`, from `lib/dashboardHost.ts`) — it never serves on a restaurant's own domain.
- The API endpoints themselves are **not** host-gated, so they can be curl'd directly from anywhere for verification (see below).

## What is real vs. stub — summary

**Real (safe, additive):**
- Session CRUD in the new isolated table.
- Input validation (zod) on every step.
- Deterministic (non-random, non-ML) stub theme generation.
- Draft-only menu JSON storage.

**Stub / intentionally not implemented:**
- Any Square OAuth (`/square/start`, `/square/callback`) — always `501`.
- Auto theme is a hash → palette lookup, not a design model.
- `/publish` is off by default (`501`); even when enabled it only creates an inactive/draft tenant shell, never an active one, and never touches payment config.
- No DNS, TLS, or subdomain provisioning — `/domain` just records the requested string.

## Verify locally

```bash
# 1) Run the additive migration (adjust DATABASE_URL as needed)
psql "$DATABASE_URL" -f scripts/migrate-onboarding-sessions.sql

# 2) Start a session
curl -s -X POST http://localhost:3000/api/onboarding/start \
  -H "Content-Type: application/json" \
  -d '{"restaurantName":"Golden Dragon","cuisine":"Chinese","address":"123 Main St"}'
# => { "session": { "id": "...", "status": "draft", ... } }

SESSION_ID=<id from above>

# 3) Check status
curl -s "http://localhost:3000/api/onboarding/status?session=$SESSION_ID"

# 4) Stub theme
curl -s -X POST "http://localhost:3000/api/onboarding/$SESSION_ID/theme" \
  -H "Content-Type: application/json" -d '{}'

# 5) Variant
curl -s -X POST "http://localhost:3000/api/onboarding/$SESSION_ID/variant" \
  -H "Content-Type: application/json" -d '{"variant":"modern"}'

# 6) Menu draft (not published)
curl -s -X POST "http://localhost:3000/api/onboarding/$SESSION_ID/menu-draft" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"name":"Spring Rolls","price":6.5,"category":"Appetizers"}]}'

# 7) Domain
curl -s -X POST "http://localhost:3000/api/onboarding/$SESSION_ID/domain" \
  -H "Content-Type: application/json" -d '{"subdomain":"golden-dragon"}'

# 8) Preview
curl -s "http://localhost:3000/api/onboarding/$SESSION_ID/preview"

# 9) Square stub (expect 501)
curl -s -X POST "http://localhost:3000/api/onboarding/$SESSION_ID/square/start"

# 10) Publish stub (expect 501 unless ONBOARDING_PUBLISH_ENABLED=1)
curl -s -X POST "http://localhost:3000/api/onboarding/$SESSION_ID/publish"
```

Wizard UI (staff/demo use, orderlyfoods.com / localhost host only):
`http://localhost:3000/onboarding`

## What remains for full 3.1 (production OAuth/C1)

- Real Square OAuth: authorize redirect, code exchange, per-tenant token storage (outside source control / in a secrets manager), state verification against `square_oauth_state`.
- Turning a `draft` tenant shell into `active`: domain verification/DNS + TLS automation, menu import review UI, and an explicit human/ops approval step before `publish` can be enabled in production.
- Replacing the stub theme with a real design system (or at least a bigger curated palette set / logo color extraction).
- Rate limiting / abuse protection on `/api/onboarding/start` (currently unauthenticated by design, for skeleton testing).
- Session ownership/auth (currently any caller with the session id can mutate it — fine for a skeleton, not for production).
- Promoting `menu_draft` into real `menu_categories` / `menu_items` rows with a reviewed import step (reusing `lib/menuImport.ts` conventions).
