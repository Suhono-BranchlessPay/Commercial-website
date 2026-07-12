# Orderly Engine — Status Report (12 Jul 2026)

**Audience:** Verry + Malik  
**Scope:** PERINTAH FASE A / B / C (P-ENGINE during Kirin/Linton Health Dept hold)

## Verdict

| Slice | Status |
|-------|--------|
| **A** Money cents + CRM consent + API Bridge | ✅ Merged PR #1 |
| **B** Dashboard + report v1 (real data only) | ✅ Merged PR #2 |
| **C1** Menu-from-photo (human gate) | ✅ Merged PR #3 |
| **C2** Review reply drafts (human gate) | ✅ This PR (OAuth send later) |
| **C3** Customer intelligence | ✅ This PR |
| **C4** Upsell co-occurrence | ✅ This PR |
| **C6** Schema.org (+ opening hours) | ✅ Base existed; hours enhanced |
| **C7** Meta API | 📋 Checklist only — ops must register |
| **C5** Marketing sends | ⏸️ HOLD (consent + lawyer) |

## PRs

1. https://github.com/Suhono-BranchlessPay/orderly-platform/pull/1  
2. https://github.com/Suhono-BranchlessPay/orderly-platform/pull/2  
3. https://github.com/Suhono-BranchlessPay/orderly-platform/pull/3  

## How to demo

- Dashboard: `http://127.0.0.1:8080/dashboard` (dev: `master@orderly.local` / `orderly-master-dev`)
- Menu AI: `http://127.0.0.1:8090/review`
- Upsell: `POST /api/upsell/suggestions` with `{ "menu_item_ids": ["..."] }`
- Reviews AI: `POST /v1/reviews/draft` on AI service

## Explicit holds (not bugs)

- Kirin / Linton: client Health Department  
- Stripe Connect / payouts / platform fee: legal  
- Marketing SMS/email: TCPA/CAN-SPAM + lawyer  
- Meta Messenger live: App Review pending registration  

## Honest metrics policy

No invented payouts, platform fees, or third-party savings. Empty = empty.
