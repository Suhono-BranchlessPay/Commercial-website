# Tenant onboarding checklist (formal)

**Source of truth for outlet #3–#27.** Written after Kirin’s near-miss: missing Square creds fail-opened into Samurai’s global `SQUARE_*` and would have taken real money.

Use with [`GO_LIVE_CHECKLIST.md`](./GO_LIVE_CHECKLIST.md). Do not invent “ready.”

---

## P0 — money isolation (fail-closed)

| # | Check | How to verify |
|---|--------|----------------|
| 1 | **Square credentials are tenant-scoped** | `TENANT_{SLUG}_SQUARE_ACCESS_TOKEN`, `_LOCATION_ID`, `_APPLICATION_ID`, `_ENVIRONMENT` **or** a `square_oauth_connections` row for that tenant. **Never** rely on bare `SQUARE_*`. |
| 2 | **No credential borrow** | `curl -H "Host: <domain>" …/api/square/config` → `enabled:false` until that tenant’s creds exist. Must **not** return another outlet’s `locationId`. |
| 3 | **OAuth scopes (if OAuth path)** | `ITEMS_READ`, `ITEMS_WRITE`, `ORDERS_READ`, `ORDERS_WRITE`, `PAYMENTS_READ`, `PAYMENTS_WRITE`, `MERCHANT_PROFILE_READ`, `REPORTING_READ` |
| 4 | **Tax rate on tenant row** | `tenants.tax_rate` set (decimal). NULL → checkout **503** `tax_rate_unconfigured`. **Never** copy Indiana 7% onto a Kentucky (or other) outlet. |
| 5 | **Paid smoke** | Cellular → pay small order on **this host** → Square Order Hub for **this** merchant/location → tax cents match local rate. |

Stop condition: any unexplained money/tax mismatch → no further outlets until root cause is known.

---

## P0 — identity & host

| # | Check |
|---|--------|
| 6 | Tenant DB row: `slug`, `name`, `domain`, `status=active`, `anchor_mode` intentional |
| 7 | DNS A/CNAME → prod VPS; TLS cert valid |
| 8 | Nginx proxies HTML + `/api` with `Host` preserved (not static SPA-only) |
| 9 | SEO title/canonical/OG match **this** restaurant (not Samurai) |
| 10 | Deploy only via `bash scripts/deploy-samurai-main.sh` |

---

## P1 — catalog & storefront

| # | Check |
|---|--------|
| 11 | Catalog in Square (SKU convention `{OUTLET}-{CAT}-{NNN}`; Samurai exempt) |
| 12 | Menu sync → Orderly; every item has SKU; prices human-checked |
| 13 | Required choices = Square modifiers (not description prose) |
| 14 | Hours in `tenants.hours` / theme (not TBD) |
| 15 | Brand assets: logo, favicon, hero, og (paths exist on disk) |
| 16 | Photos for sellable items (or honest “needs photo” ops plan) |

---

## P1 — ops access

| # | Check |
|---|--------|
| 17 | `orderlyfoods.com/dashboard`: master sees tenant; manager/client_owner scoped to this `tenant_id` |
| 18 | `/client` + `/kds` login works on **restaurant host** |
| 19 | Owner refund path known (Cancel ≠ auto-refund) — written SOP |
| 20 | Pause orders / 86 path known |

---

## P2 — growth & reports

| # | Check |
|---|--------|
| 21 | Daily report tenant entry (`DAILY_REPORT_TENANTS`) + verified FROM domain |
| 22 | Meta page map / CAPI only via `TENANT_{ID}_META_*` (fail-closed — already) |
| 23 | GBP / GSC properties for this domain when in scope |
| 24 | Mobile tenant pack if app is in scope |

---

## Anti-patterns (do not ship)

1. **Fail-open credentials** — missing `TENANT_{SLUG}_SQUARE_*` falling back to global `SQUARE_*`.
2. **Fail-open tax** — hardcoded `0.07` for every host.
3. **Clone Samurai menu** into another tenant.
4. **Ad-hoc VPS deploy** that skips `deploy-samurai-main.sh` (silent asset loss).
5. **Declare go-live** without a paid test on the restaurant’s own Square location + tax.

---

## Kirin snapshot (20 Jul 2026)

| Item | Status |
|------|--------|
| Domain / SSL / SEO shell | Done (`kirinhibachiexpress.com`) |
| Square OAuth / `TENANT_KIRIN_SQUARE_*` | **Missing** (was fail-open → Samurai location) |
| `tax_rate` KY | **Must set** after code+migration (not 0.07) |
| Catalog 70 SKU draft | Ready for Malik approve → Square execute |
| Menu sync / ops user / hours / hero | Open |

---

*Last updated: 20 Jul 2026 — after Square/tax fail-closed fix.*
