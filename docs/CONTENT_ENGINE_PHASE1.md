# Content Engine — Phase 1

Monthly content calendar driven by real Square + Orderly + inbox data. Human approve before anything ships. No Canva/Meta auto-publish in Phase 1.

## What shipped

- Tables: `content_calendar`, `content_calendar_config` (`scripts/migrate-content-calendar.sql`)
- AI Gateway task: `content_calendar`
- Auto `src_slug` + tracked `/s/{slug}?src=` on every draft
- Dashboard → Marketing → **Content calendar** (generate / approve / edit / skip / reschedule / mark posted)
- Daily report block: calendar performance with **14-day lookback**

## Deploy

```bash
psql "$DATABASE_URL" -f scripts/migrate-content-calendar.sql
# then rebuild/restart api-server (dashboard HTML is served from api-server/public)
```

## Ops flow (Samurai trial)

1. Ensure top sellers have menu photos (visual posts require `image_url`).
2. Dashboard → pick tenant → Content calendar → set month → **Generate month**.
3. Review each card → Approve → Copy caption + link → design in Canva → post manually → **Mark posted**.
4. Next day / Performance: human clicks + paid orders by `src` (multi-day).

## Config (per tenant)

`content_calendar_config`: `n_posts` (default 14 ≈ 3–4/week), `pillar_mix`, tone, language, cuisine, `local_events`.

## Attribution DQ (P0)

`past_content_performance` for task `content_calendar` **excludes** posts dated
`2026-07-16`–`2026-07-18` (`ATTRIBUTION_INCOMPLETE_WINDOW` in
`dailyReportDataQuality.ts`). Same window as the daily-report banner — so August
generation will not treat Shrimp Bento / Hibachi click→0 gaps as real failures.

## `/s/` closed-loop smoke (P0)

1. From Facebook in-app browser on phone: open  
   `https://samurairesto.com/s/{slug}?src=test-manual`  
2. Order cheapest item → checkout.
3. Confirm: (a) `qr_scans` row for that `src` counts as **human** (non-bot UA),  
   (b) paid order has `source_detail.src = test-manual`.

## Out of scope (later phases)

Canva Autofill, auto-schedule via Meta Guard, SEO article + GBP triple-publish, month-over-month learning loop.
