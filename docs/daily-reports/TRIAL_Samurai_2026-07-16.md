# Trial Daily Report — Samurai Hibachi & Sushi

**Report date (local):** 2026-07-16  
**Timezone:** America/Indiana/Indianapolis  
**Generated:** 2026-07-17 evening (VPS deploy after PR #68)  
**Sources:** Square Reporting (all channels) + Orderly attribution/reputation  
**Status:** HTML ready · email blocked until `RESEND_API_KEY` + `DAILY_REPORT_TO` set on VPS

## Sales yesterday (Square — all channels)

| Metric | Value | vs 7-day avg |
|--------|-------|----------------|
| Total sales | **$1,692.01** | −11% |
| Orders | **49** | ~avg 52 |
| Customers | **41** | ~avg 43 |
| Avg ticket (net) | **$30.22** | — |
| Tips | $94.14 | |
| Tax | $117.16 | |

## 7-day trend (Square total sales)

| Date | Total | Orders |
|------|-------|--------|
| 2026-07-11 | $2,099.40 | 50 |
| 2026-07-12 | $1,233.86 | 28 |
| 2026-07-13 | $1,579.49 | 46 |
| 2026-07-14 | $1,945.71 | 55 |
| 2026-07-15 | $1,913.74 | 54 |
| **2026-07-16** | **$1,692.01** | **49** |
| 2026-07-17 (in Square window; not “yesterday”) | $2,913.10 | 79 |

## Top products (last 7 days, Square)

1. ⭐ Hibachi Chicken — 146 sold · $1,675.56 net  
2. Hibachi Steak & Chicken — 61 · $1,006.50  
3. Chicken Bento — 49 · $727.50  
4. Crab Rangoon (4 Pcs) — 110 · $548.75  
5. Soda (Free Refills) — 204 · $510.00  

## Busiest hour

Peak **6 PM** (hour 18) over the last 7 days — staff before the rush; schedule posts ~4–5 PM.

## Online attribution (Orderly only — do not add to Square total)

| src | Orders | $ |
|-----|--------|---|
| web | 2 | $89.04 |
| google | 1 | $62.51 (no marketplace fee) |
| ios | 1 | $1.53 |

## Reputation (Orderly social inbox that day)

Praise 5 · Questions 6 · Complaints 0 · Health/allergy 0  

Quotes (praise): chicken bento delicious; “That's my favorite!”; “Ate there once… loved it!”

## Insights (facts only — no forecasts)

1. Busiest hour ~6 PM — staff/post 1–2 hours earlier.  
2. Top seller Hibachi Chicken ($1,675.56 / 146) — promote what already sells.  
3. Jul 16 total was 11% below the 7-day average (weekday/weekend mix varies).

## Files

- HTML: `docs/daily-reports/samurai-2026-07-16.html` (also on VPS `/tmp/daily-report-samurai.html`)  
- JSON: `docs/daily-reports/samurai-2026-07-16.json`

## Email send (next — needs secrets on VPS)

In `ecosystem.config.cjs` for `samurai-api`:

```js
DAILY_REPORT_ENABLED: '1',          // optional cron 4am
DAILY_REPORT_TO: 'malik@YOUR_EMAIL',
DAILY_REPORT_FROM: 'Orderly Reports <reports@YOUR_DOMAIN>',
RESEND_API_KEY: 're_...',
```

Then:

```bash
pm2 restart ecosystem.config.cjs --update-env
SECRET=$(cat /tmp/daily-report-secret.txt)
curl -sS -X POST http://127.0.0.1:8080/api/internal/daily-report/run \
  -H "Content-Type: application/json" \
  -H "X-Daily-Report-Secret: $SECRET" \
  -d '{"tenantSlug":"samurai","reportDate":"2026-07-16"}'
```
