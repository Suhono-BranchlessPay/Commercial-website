# Blok 6 — iOS store prep (Samurai pilot)

**Blocked on:** Apple Developer membership leaving **Pending** (payment receipt OK; team activation up to ~48h).  
**Enrollment / Team ID (when active):** `K4SAA2F25A`  
**Bundle ID:** `com.orderly.samurai.martinsville`  
**App name:** Samurai Martinsville

## Already ready in repo

| Asset | Status |
|-------|--------|
| Icon 1024×1024 | ✅ `tenants/samurai-martinsville/assets/brand/icon.png` |
| Splash / brand | ✅ tenant assets |
| EAS profiles `preview` / `production` | ✅ `eas.json` |
| Push + Square native plugins | ✅ `app.config.ts` |
| Production API = `samurairesto.com` | ✅ tenant `config.json` |
| Public Privacy / Terms / Data deletion | ✅ `/privacy` `/terms` `/data-deletion` (after deploy) |

## Do when membership is Active (no Pending)

1. developer.apple.com → Certificates, Identifiers & Profiles works (no Team ID error).
2. App Store Connect → **My Apps** → New App:
   - Platforms: iOS
   - Name: Samurai Martinsville
   - Bundle ID: `com.orderly.samurai.martinsville` (create App ID first if needed)
   - SKU: `samurai-martinsville-ios`
   - User Access: Full Access
3. Link EAS to Apple team: `cd artifacts/orderly-mobile && eas login && eas build:configure` (if needed).
4. Set `EAS_PROJECT_ID` for the Expo project (push tokens).
5. Build: `eas build --platform ios --profile preview` then TestFlight internal.
6. Store listing fields:
   - Privacy Policy URL: `https://samurairesto.com/privacy`
   - Support URL: restaurant phone/site or `https://samurairesto.com`
   - Category: Food & Drink
   - Screenshots: capture from TestFlight/simulator (6.7" + 6.1" recommended)

## Meta Publish (parallel, same legal URLs)

In Meta Developer app settings:

- Privacy Policy URL → `https://samurairesto.com/privacy`
- User data deletion → `https://samurairesto.com/data-deletion`
- Then switch Development → **Live** so Page comment webhooks deliver.

## Explicit wait

Do **not** run `eas submit` until ASC app record exists and TestFlight smoke (order + push) passes.
