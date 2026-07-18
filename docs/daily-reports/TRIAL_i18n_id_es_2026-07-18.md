# Trial — Daily report Bahasa Indonesia + Español

**Date:** 2026-07-18  
**Branch:** `cursor/daily-report-i18n-id-es-50b6`

## What was tested locally

1. **Bahasa Indonesia (`locale=id`)** — HTML chrome + fact narrative + attention + supply strings  
2. **Español (`locale=es`)** — same path after Indonesian

| Locale | Subject (fixture) | Greeting |
|--------|-------------------|----------|
| id | `Samurai Martinsville · 2026-07-17 · $1,692.01 · ID` | Selamat pagi — … |
| es | `Samurai Martinsville · 2026-07-17 · $1,692.01 · ES` | Buenos días — … |

Local HTML fixtures: `artifacts/daily-report-i18n-trial/` (gitignored) via:

```bash
node scripts/render-daily-report-locales.mjs
pnpm --filter @workspace/api-server test -- dailyReport
```

## Live email (VPS — needs secrets)

After deploy + `DAILY_REPORT_CRON_SECRET` / Resend set:

```bash
# 1) Indonesia
curl -sS -X POST "https://samurairesto.com/api/internal/daily-report/run" \
  -H "Content-Type: application/json" \
  -H "X-Daily-Report-Secret: $DAILY_REPORT_CRON_SECRET" \
  -d '{"tenantSlug":"samurai","locale":"id"}'

# 2) Español
curl -sS -X POST "https://samurairesto.com/api/internal/daily-report/run" \
  -H "Content-Type: application/json" \
  -H "X-Daily-Report-Secret: $DAILY_REPORT_CRON_SECRET" \
  -d '{"tenantSlug":"samurai","locale":"es"}'
```

Cloud agent environment for this run had **no** `DAILY_REPORT_CRON_SECRET` / `RESEND_API_KEY`, so live Resend send was not executed here (endpoint responds `401` without secret).
