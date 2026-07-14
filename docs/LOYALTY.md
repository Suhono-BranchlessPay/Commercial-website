# Loyalty / Rewards (Part 2)

Restaurant-owned points program. **Orderly is non-custodial** — points and
discount liability sit with the tenant; we only run the ledger engine.

## Status

| Piece | Status |
|-------|--------|
| Schema `loyalty_programs` / `accounts` / `transactions` | ✅ |
| Earn on paid order (gated) | ✅ |
| Redeem + quote API | ✅ |
| Dashboard program panel | ✅ |
| BP anchor on ledger events | ✅ best-effort |
| Owner.com balance migrate | 📋 API `type=migrate` only — **no CrustnRoll go-live** |
| SMS/email “points expiring” | ❌ C5 HOLD (consent) |
| Checkout UI redeem wire | ❌ next slice |
| Mobile balance UI | ❌ next slice |

## Env

```js
ORDERLY_LOYALTY_ENABLED: "0", // set "1" only when a tenant program is active
```

Earn runs only when **both** are true:

1. `ORDERLY_LOYALTY_ENABLED=1`
2. `loyalty_programs.enabled=true` AND `status='active'` for that tenant

## Migrate

```bash
psql "$DATABASE_URL" -f scripts/migrate-loyalty-schema.sql
```

## API (storefront Host)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/loyalty/program` | Public config |
| GET | `/api/loyalty/balance?phone=` | Per-tenant phone lookup |
| GET | `/api/loyalty/transactions?customer_id=` | Ledger |
| POST | `/api/loyalty/quote-redeem` | `{ points, subtotal_cents }` |
| POST | `/api/loyalty/redeem` | Commit redeem |

## Dashboard (orderlyfoods.com)

| Method | Path |
|--------|------|
| GET/PUT | `/api/dashboard/loyalty/program` |
| GET | `/api/dashboard/loyalty/accounts` |
| POST | `/api/dashboard/loyalty/ledger` — `adjust` \| `migrate` \| `expire` |

`migrate` is **master-only** and append-only (audit). It does **not** pull from
Owner.com automatically. Do not migrate CrustnRoll until:

1. Export of Owner balances matched by email/phone
2. Customer notice
3. Gift-card obligations also covered (Part 3)

## Principles

- Earn from **subtotal** (not tip/fees)
- One earn per `order_id` (idempotent unique index)
- Redeem rules in JSONB: `min_redeem_points`, `points_per_dollar_off`, `max_percent_of_subtotal`
- Never invent dashboard metrics; empty balance = 0
