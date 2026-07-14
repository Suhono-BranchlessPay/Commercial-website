# C7 — Meta API registration checklist (Orderly)

**Status:** Start registration now; feature build waits for Meta approval.  
**Product note:** Instagram DM / FB Messenger auto-reply is a strong **paid add-on** candidate.

## Do now (Malik / ops)

1. Create / confirm Meta Business Manager for Orderly Foods.
2. Create a Meta Developer app (type: Business).
3. Request products:
   - Messenger API
   - Instagram Messaging API (via Facebook Page / IG Professional)
4. Privacy / terms / data-deletion URLs (live after legal-pages deploy):
   - `https://samurairesto.com/privacy`
   - `https://samurairesto.com/terms`
   - `https://samurairesto.com/data-deletion`  
   (Same paths work on other restaurant hosts on this VPS. Prefer these for Meta App settings until `orderlyfoods.com` marketing host is wired the same way.)
5. Prepare use-case writeup: multi-tenant restaurant replies, human-in-the-loop for complaints.
6. Submit App Review when test Page + webhook receiver exist.
7. Track approval ETA — **long lead time**; do not block C2 draft engine on this.

## Do later (after approval)

- Wire webhook receiver in `services/orderly-ai` or Orderly Bridge.
- Map Page / IG account → `tenant_id`.
- Reuse C2 human-approve gate before outbound sends.
- Monetize as add-on (per-location fee).

## Explicit non-goals now

- No live DM auto-reply until approval + tenant mapping.
- No storing Meta tokens in git.
