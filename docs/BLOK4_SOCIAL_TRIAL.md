# Blok 4.1 — Social Media TRIAL (skeleton)

**Scope:** ONE tenant only — Samurai Martinsville (`samurai`). Facebook Page +
Instagram (Meta). This is a **skeleton that can grow**, not the full Meta
OAuth / multi-tenant build. GBP (Google Business Profile, Blok 4.2) is **not**
implemented — see "Next" at the bottom.

## Hard rules (enforced in code, not just policy)

| Rule | Where it's enforced |
| --- | --- |
| MODE AWAL: every reply needs human approval. No auto-send. | `/inbox/:id/approve` never calls Meta; `/inbox/:id/send` is a separate, explicit, human-triggered step and is **still a stub** (never calls the real Graph API). |
| 🚫 Complaint / negative review → never auto-send. Alert owner + draft only. | `sendApprovedReply()` in `lib/social.ts` hard-blocks `classification === "complaint"` with `403`, even if approved. |
| 🚫 Allergy / health / halal → never auto-answer. Escalate only. | `draftReplyForRow()` refuses to generate a draft for `classification === "allergy_health"`; row is marked `blocked` and the response includes `escalate: true` + a note. `/send` also hard-blocks this classification with `403`. |
| 🚫 Spam / troll → never reply. | `draftReplyForRow()` sets `status: "skipped"`, `draft_reply: null` for `classification === "spam"`. `/send` also hard-blocks it. |
| Tokens in SECRETS / env only, never plaintext in DB. | No token column exists in `social_inbox` / `social_reply_audit`. Tokens are read via `tenantSecret()` (env only) in `lib/socialConfig.ts`. |
| Kill switch per tenant. | `SOCIAL_KILL_SWITCH_<TENANT_ID>=1` checked first in `sendApprovedReply()` — `403` regardless of anything else. |
| Audit log of everything sent. | Every approve / edit / skip / block / kill_switch / send writes a `social_reply_audit` row (`before_body`, `after_body`, `actor`, `meta`). |

## What is STUB vs REAL right now

**Real (working today):**
- DB schema (`social_inbox`, `social_reply_audit`) + Drizzle types.
- Webhook receive + row creation (idempotent on `tenant_id, platform, external_message_id`).
- Heuristic (keyword) classification — praise / question / complaint /
  allergy_health / spam / unknown.
- Draft template generation (per classification).
- Human approve/edit/skip flow + full audit trail.
- Kill switch, send-enabled gate, tenant-scoped dashboard auth.

**Stub (intentionally not implemented yet):**
- **No real Meta OAuth.** There's no "Connect Facebook Page" flow. Malik gets
  a Page Access Token manually from Meta's Graph API Explorer / a Meta
  developer app and puts it in env (see below).
- **`/inbox/:id/send` never calls the real Meta Graph API**, even when every
  gate passes (kill switch off, `SOCIAL_SEND_ENABLED=1`, token configured,
  status `approved`, safe classification). It logs + audits as if it sent,
  then returns `{ sent: "stub" }`. Wiring the real `POST
  /{message_id}/messages` (or comment reply) Graph API call is the very next
  step once this gate logic is proven safe.
- **Webhook signature verification (`X-Hub-Signature-256`) is not enforced.**
  `express.json()` has already parsed the body by the time our route runs,
  and re-serializing JSON isn't guaranteed to byte-match Meta's original raw
  request — attempting HMAC verification on the re-serialized body would
  produce false negatives. The helper (`verifyMetaSignature` in
  `lib/socialWebhook.ts`) exists but isn't wired in. Closing this gap needs a
  raw-body-capture middleware scoped to this one route, mounted *before*
  `express.json()`.
- **Classification is keyword heuristics, not ML.** It is intentionally
  biased toward the "safer" bucket (e.g. any allergy/halal keyword wins over
  everything else). It will have false positives — that's the point; a human
  reviews every single reply anyway.
- **Page ID → tenant mapping** defaults to `samurai` unless
  `META_PAGE_ID_TENANT_MAP_JSON` is set. Fine for a single-tenant trial; do
  **not** rely on the fallback once a second tenant is onboarded.

## Setup steps for Malik

1. **Create/reuse a Meta developer app** (developers.facebook.com) with the
   Facebook Page + Instagram Messaging products added.
2. **Get a Page Access Token** for the Samurai Facebook Page (Graph API
   Explorer, or a proper long-lived token via the app). Put it in env —
   **never in git, never in the DB**:
   ```
   META_PAGE_ACCESS_TOKEN=<token>
   ```
   (Optional per-tenant override pattern used elsewhere in this codebase:
   `TENANT_SAMURAI_META_PAGE_ACCESS_TOKEN=<token>` — checked first.)
3. **Set a webhook verify token** (any string you choose) and put it in env:
   ```
   META_WEBHOOK_VERIFY_TOKEN=<pick-a-random-string>
   ```
4. **Subscribe the webhook** in the Meta app dashboard to:
   `https://<your-api-domain>/api/social/webhooks/meta`
   Meta will call this URL with `GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`
   to verify it — our server echoes `hub.challenge` back only if the token
   matches `META_WEBHOOK_VERIFY_TOKEN`.
5. **Subscribe to fields**: `feed` (Page comments) and/or `messages`
   (Messenger), plus the Instagram equivalents if testing IG too.
6. **(Optional) App secret** for future signature verification:
   ```
   META_APP_SECRET=<app secret>
   ```
7. **Leave sending OFF** until everything above is proven safe:
   ```
   SOCIAL_SEND_ENABLED=0
   SOCIAL_KILL_SWITCH_SAMURAI=0
   ```
   (Kill switch `=1` forcibly blocks sending regardless of anything else —
   use it as a big red button if something looks wrong.)
8. **Dashboard access**: use your existing Orderly console login
   (`/dashboard`) — master sees all tenants, manager is locked to `samurai`.
   For quick curl testing without a browser session, set:
   ```
   SOCIAL_INTERNAL_API_KEY=<pick-a-random-string>
   ```
   and send header `X-Social-Internal-Key: <that string>`. **Internal use
   only — never expose this key to a browser or to a restaurant.**

## Human-approve flow (MODE AWAL)

```
Meta webhook → social_inbox (status=new, classification=heuristic)
                     │
                     ▼
        POST /inbox/:id/draft   (human clicks "Draft reply" in dashboard)
                     │
        ┌────────────┼─────────────────────────────┐
        ▼            ▼                              ▼
  allergy_health   spam                    everything else
  status=blocked   status=skipped          status=pending_approval
  escalate=true    (never drafted)         draft_reply=<template>
  (owner must      (never drafted,                  │
   answer directly, never replied to)                ▼
   verbatim, off-                          POST /inbox/:id/approve
   platform if                             { edited_body? }  (human edits/approves)
   needed)                                            │
                                                       ▼
                                            status=approved
                                            send: "deferred_until_token_and_human_mode_proven"
                                                       │
                                                       ▼
                                            POST /inbox/:id/send  (separate explicit click)
                                            → still STUB (see above) — logs + audits,
                                              never calls the real Meta API
```

At every arrow, a `social_reply_audit` row is written (actor + before/after
body + action). Nothing skips this trail.

## Env vars needed from Malik

| Var | Required? | Notes |
| --- | --- | --- |
| `META_PAGE_ACCESS_TOKEN` | For real webhook data & the (still-stub) send gate | Never commit. Can be per-tenant: `TENANT_SAMURAI_META_PAGE_ACCESS_TOKEN`. |
| `META_WEBHOOK_VERIFY_TOKEN` | Yes, to subscribe the webhook | Any random string you pick. |
| `META_APP_SECRET` | Optional (future signature check) | Not enforced yet — see "Stub" section. |
| `META_PAGE_ID_TENANT_MAP_JSON` | Optional | `{"<pageId>":"samurai"}`. Defaults to `samurai` without it. |
| `SOCIAL_DEFAULT_TENANT_ID` | Optional | Default `samurai`. |
| `SOCIAL_KILL_SWITCH_SAMURAI` | Recommended `=0` while testing | `1` = hard-block all sends for `samurai`, independent of everything else. |
| `SOCIAL_SEND_ENABLED` | Keep `=0` (or unset) until proven | Global gate; `/send` returns `501` without it. |
| `SOCIAL_INTERNAL_API_KEY` | Optional, curl testing only | Never expose to a browser. |

None of these are committed anywhere — see `artifacts/api-server/.env.sandbox.example` for the documented (non-secret) template.

## How to verify with curl

Set `BASE=https://<your-api-domain>` (or `http://localhost:8080` locally) and
either a dashboard session cookie or `X-Social-Internal-Key: <key>` header.

**1. Health (no auth, no secrets leaked):**
```bash
curl -s "$BASE/api/social/health" | jq
# { "ok": true, "service": "orderly-social-trial",
#   "send_globally_enabled": false,
#   "tenants": [{ "tenant_id": "samurai", "kill_switch": false,
#                 "send_globally_enabled": false, "meta_token_configured": false }] }
```

**2. Webhook verify challenge (what Meta calls when you subscribe):**
```bash
curl -s "$BASE/api/social/webhooks/meta?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345"
# -> 12345 (plain text) if the token matches META_WEBHOOK_VERIFY_TOKEN
```

**3. Simulate an inbound Facebook comment (no real Meta call needed):**
```bash
curl -s -X POST "$BASE/api/social/webhooks/meta" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "id": "123456789",
      "changes": [{
        "field": "feed",
        "value": {
          "item": "comment",
          "comment_id": "cmt_test_1",
          "post_id": "post_test_1",
          "from": { "id": "u1", "name": "Jane Doe" },
          "message": "This was delicious, thank you!"
        }
      }]
    }]
  }'
# -> { "ok": true, "ingested": 1, "duplicates": 0, "note": "receive-only — no reply sent" }
```
Try again with `"message": "I have a peanut allergy, does this have peanuts?"`
to see `classification: "allergy_health"`, or `"message": "Buy followers now http://spam.example"`
for `classification: "spam"`.

**4. List the inbox (dashboard session or internal key):**
```bash
curl -s "$BASE/api/social/inbox?tenant_id=samurai" \
  -H "X-Social-Internal-Key: $SOCIAL_INTERNAL_API_KEY" | jq
```

**5. Draft a reply for a `new` row:**
```bash
curl -s -X POST "$BASE/api/social/inbox/<id>/draft" \
  -H "X-Social-Internal-Key: $SOCIAL_INTERNAL_API_KEY" | jq
```

**6. Approve (optionally with an edited body):**
```bash
curl -s -X POST "$BASE/api/social/inbox/<id>/approve" \
  -H "Content-Type: application/json" \
  -H "X-Social-Internal-Key: $SOCIAL_INTERNAL_API_KEY" \
  -d '{"edited_body": "Thanks so much for the kind words! 🙏"}' | jq
# -> send: "deferred_until_token_and_human_mode_proven"
```

**7. Try to send (will 403/501 until every gate is proven):**
```bash
curl -s -X POST "$BASE/api/social/inbox/<id>/send" \
  -H "X-Social-Internal-Key: $SOCIAL_INTERNAL_API_KEY" | jq
```

**8. Skip:**
```bash
curl -s -X POST "$BASE/api/social/inbox/<id>/skip" \
  -H "X-Social-Internal-Key: $SOCIAL_INTERNAL_API_KEY" | jq
```

## Dashboard

`/dashboard` → "Social inbox (trial)" panel shows `new` / `pending_approval` /
`drafted` rows for the scoped tenant, with **Draft reply / Approve / Skip**
buttons (Approve posts whatever text is currently in the editable textarea —
edit before approving to send something different from the template). Honest
empty state when there are zero rows (no invented demo data), and a separate
"no pending approvals" state when rows exist but are all already
handled/blocked/skipped.

## Next (not built yet)

- **Blok 4.2 — Google Business Profile (GBP)** reviews/Q&A. Not started.
  Same hard rules will apply (human approve, no auto-send on
  complaints/allergy/spam) once it lands.
- Real Meta Graph API send call (replacing the `/send` stub) — only after
  the kill switch + approval + audit trail above have been proven in
  production with real traffic.
- Raw-body webhook signature verification (`X-Hub-Signature-256`).
- Moving from single-tenant defaults (`SOCIAL_DEFAULT_TENANT_ID`) to a real
  Page-ID → tenant registry once a second social tenant is onboarded.
