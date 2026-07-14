# Blok 0 — Secret Rotation Checklist

Small hygiene fixes that shipped alongside Blok A (Square menu sync), plus
the rotation checklist for the one credential known to have been exposed.

## What was fixed

1. **`OWNER_PIN` removed from `.replit`** — it was committed in plaintext
   under `[userenv.shared]`. It is now unset in the repo; Replit Secrets (not
   `.replit`) is the correct place for it going forward.
2. **`ecosystem.config.cjs` added to `.gitignore`** — the PM2 process file
   used on the VPS commonly has real env values inlined. It was not tracked
   in git at the time of this change, but the ignore rule now prevents anyone
   from accidentally committing it later.

## Action required from Malik (VPS operator)

The `OWNER_PIN` value that was in git history (`.replit`) must be treated as
**compromised** — anyone with read access to the repo (or its history) has
seen it. Rotate it:

1. Pick a new PIN (not reused from anywhere else).
2. Set it as an actual secret, not a committed file:
   - **Replit**: Tools → Secrets → `OWNER_PIN` → paste the new value.
   - **VPS (`ecosystem.config.cjs` / systemd / `.env`)**: update the running
     process's environment directly on the server, then restart the API
     process (e.g. `pm2 restart <app> --update-env`).
3. Confirm the owner PIN flow (`checkPin` in
   `artifacts/api-server/src/lib/ownerAuth.ts`) picks up the new value —
   easiest check: it's cached in-process, so the **first** PIN entry after
   rotation writes it to `app_settings` in Postgres; a full API restart
   guarantees the new env value wins over any stale cached/DB value.
4. Double-check `git log -p -- .replit` no longer needs to be treated as
   sensitive going forward — i.e. confirm no other secrets got added back to
   `.replit` in the same style before merging.

## Slack webhook rotation (VPS) — general checklist

Applies to any Slack-compatible alert webhook used by the platform (e.g.
`ORDERLY_ALERT_WEBHOOK_URL`). **Do not put the real webhook URL in this
document or any other committed file.**

1. In Slack: App/Incoming Webhooks admin → revoke the old webhook URL →
   create a new one for the same channel.
2. On the VPS, update the env var that holds it (wherever it currently lives
   — VPS-local `.env`, PM2 `ecosystem.config.cjs`, or systemd
   `EnvironmentFile`) with the new URL. Never echo it into shell history or a
   committed file; paste directly into the editor/secret store.
3. Restart the affected process(es) so the new value takes effect
   (`pm2 restart <app> --update-env` or equivalent).
4. Send a test alert (e.g. trigger one of the existing alert paths in
   `lib/anchorAlerts.ts` / `lib/squareMenuSync.ts`'s `postMenuSyncAlert`, or
   just `curl -X POST <new_webhook_url> -d '{"text":"test"}'` directly against
   Slack, not through the app) and confirm it lands in the right channel.
5. Delete/redact the old webhook URL from any scratch files, chat logs, or
   local shell history where it may have been pasted during rotation.
6. Note the rotation date somewhere internal (not this file) so the next
   rotation has a baseline.

## Why this matters

Committed secrets stay in git history forever unless the history itself is
rewritten (which has its own blast radius — shared clones, forks, CI caches).
Rotating the credential is almost always faster and safer than trying to
scrub history. Going forward: secrets belong in Replit Secrets, VPS-local env
files, or a secrets manager — never in a tracked file, ever "temporarily."
