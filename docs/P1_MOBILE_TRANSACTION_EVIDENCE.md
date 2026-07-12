# P1 — Mobile transaction evidence checklist

**Source of truth:** [`ORDERLY_SUMBER_KEBENARAN.md`](./ORDERLY_SUMBER_KEBENARAN.md) §3 P1  
**Pilot app:** Samurai Martinsville (`com.orderly.samurai.martinsville`)  
**Backend:** `https://samurairesto.com` (same API as web) · tenant slug `samurai` · `anchor_mode=pos-native`

## Goal

Prove on a **physical phone** (not “looks fine in Expo Go”):

menu → cart → checkout **PICKUP** → pay **CARD** → Square order (Source `"Orderly Order Hub"`, type `"Pickup"`) → kitchen fire → BP anchor.

## Evidence required (Malik)

| # | Evidence | Status |
|---|----------|--------|
| 1 | APK installed on Malik’s phone | ☐ |
| 2 | Samurai branding correct (name/logo/colors); **no delivery** UI | ☐ |
| 3 | Paid pickup order visible in Square Dashboard | ☐ |
| 4 | Square Source = Orderly Order Hub, Type = Pickup | ☐ |
| 5 | Kitchen ticket / auto-fire observed | ☐ |
| 6 | Anchor proof (`chain_tx_hash` / explorer) for Samurai pos-native path | ☐ |
| 7 | Spot-check: no secrets in app bundle (decompile / string scan) | ☐ |

## Build & send APK (Verry / agent)

```bash
cd artifacts/orderly-mobile
npm ci
npm run tenant:martinsville
npx eas-cli login   # Orderly Expo account
npx eas-cli build -p android --profile preview
```

Send the EAS download link / APK to Malik. **Do not** commit APKs or signing keys to git.

### Important — sandbox vs real card

Current `eas.json` **preview** / **development** profiles set `EXPO_PUBLIC_SQUARE_TEST_NONCE=1`. That uses Square’s sandbox test nonce (`cnon:card-nonce-ok`), **not** a real card tap.

- OK for wiring / UI rehearsal against sandbox backend.
- **Not sufficient** for P1 “CARD sungguhan” evidence.

**Blocked without human review (§0 — money path):** wire `react-native-square-in-app-payments` (or equivalent) for production/dev-client builds, and ship an APK **without** `EXPO_PUBLIC_SQUARE_TEST_NONCE`. Ask Malik/Verry before changing payment tokenization.

## Agent / PR notes

- App must call public `/api/square/config` only — never embed Square/BP secrets.
- Checkout already forces `orderType: "pickup"` and pay-then-order order.
- Samurai = `pos-native` → website/app must not double-anchor; proof may come from Square↔BP path + stored proof fields.
- Do **not** push to `main`. Feature branch + PR only.
