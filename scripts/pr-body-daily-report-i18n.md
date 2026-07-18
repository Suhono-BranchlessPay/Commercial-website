## Summary
- Daily report owner email supports locales **en / id / es** (UI chrome + fact fallback + AI language instruction)
- Pass `locale` (or `language`) on preview/run; optional `DAILY_REPORT_LOCALE` or 4th field on `DAILY_REPORT_TENANTS`
- Subject line tags language (`· ID` / `· ES`) so trial sends are easy to tell apart

## Test plan
- [x] `pnpm --filter @workspace/api-server test -- dailyReport`
- [x] Local HTML render fixtures for `id` then `es`
- [ ] VPS: POST `/api/internal/daily-report/run` with `locale=id`, then `locale=es` (needs `DAILY_REPORT_CRON_SECRET` + Resend)
- [ ] Confirm Square totals still not summed with Orderly channel $
