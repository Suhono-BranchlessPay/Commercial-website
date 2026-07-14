# Blok B — Finish self-serve (lakmus checklist)

## What code already does

| Step | Status |
|------|--------|
| Register / theme stub / Square OAuth | ✅ |
| Publish → draft tenant + link OAuth + **menu sync** | ✅ (needs `ONBOARDING_PUBLISH_ENABLED=1`) |
| Master activate draft → `active` | ✅ `POST /api/dashboard/tenants/:id/activate` (this PR) |
| DNS / nginx for new domain | ❌ Ops (see `deploy/nginx-multi-tenant.conf.md`) |
| Logo file upload in wizard | ❌ Still URL-only |
| Visual storefront preview | ❌ JSON preview only |

## Production Square OAuth (ops — do not overwrite Samurai)

1. Complete **sandbox** OAuth until `square.connected: true` (one full authorize).
2. Square Developer Dashboard → **Production** credentials + same redirect URI:
   `https://samurairesto.com/api/onboarding/square/callback`
3. VPS `ecosystem.config.cjs` (add — never remove Samurai live keys):

```js
SQUARE_OAUTH_ENVIRONMENT: "production",
SQUARE_OAUTH_APPLICATION_ID: "<prod app id>",
SQUARE_OAUTH_APPLICATION_SECRET: "<prod secret>",
// keep existing:
// SQUARE_ACCESS_TOKEN / SQUARE_LOCATION_ID / SQUARE_APPLICATION_ID for Samurai
ONBOARDING_PUBLISH_ENABLED: "1",
```

4. `pm2 restart ecosystem.config.cjs --update-env`

## Lakmus test (tenant from zero)

1. Open onboarding wizard → fill basics → Connect Square → Allow.
2. Publish (flag on) → draft tenant created → menu sync runs.
3. Master: `POST /api/dashboard/tenants/<id>/activate` (cookie auth).
4. Point domain / use Host header → menu from Square visible.
5. Place test order.

**Pass criteria:** no Verry/Malik hand-editing menu rows; only activate + DNS if needed.

## KB

Extra owner FAQ seeds: menu sync, Google Order Online, Owner PIN, self-serve overview
(`supportKb.ts` — idempotent insert by slug).
