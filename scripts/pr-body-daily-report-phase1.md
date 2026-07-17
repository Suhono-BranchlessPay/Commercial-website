## Summary
- Phase 1 **Daily AI Orderly Report**: Square Reporting queries A/B/C (sales, products, busy hours) + Orderly closed-loop attribution + social reputation
- **Anti double-count** enforced in copy + assembly (Square = totals; Orderly = online subset only)
- HTML email (Resend), 4am local cron (`DAILY_REPORT_ENABLED`), manual preview/run under `/api/internal/daily-report/*` (secret header)
- OAuth scope `REPORTING_READ` added (re-consent needed for OAuth tenants)
- Fact-only insights (no forecasts); secrets via env only

## Test plan
- [ ] `pnpm --filter @workspace/api-server test -- dailyReport`
- [ ] Preview: `GET /api/internal/daily-report/preview?tenantSlug=samurai` + secret
- [ ] Dry-run then real send with `DAILY_REPORT_TO` + `RESEND_API_KEY`
- [ ] Confirm Square 200 on reporting load (or graceful “Square unavailable” banner)
- [ ] Confirm email does not add Orderly $ into Square total
