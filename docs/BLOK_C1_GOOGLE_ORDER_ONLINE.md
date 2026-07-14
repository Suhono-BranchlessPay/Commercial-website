# Blok C1 — Google “Order Online” link (Samurai)

## Goal

When guests search Samurai on Google Maps/Search, **Order online** should open
**your** site — not DoorDash/Grubhub — so orders stay commission-free.

## Malik ops (GBP — no API required)

1. Google Business Profile → **Samurai Martinsville** location.
2. Edit profile → **Order online** / website ordering link.
3. Set URL (with UTM):

```text
https://samurairesto.com/menu?utm_source=google&utm_medium=gbp_order_online&utm_campaign=samurai
```

4. Optional QR-style path (also logs scans if using `/r/`):

```text
https://samurairesto.com/r/samurai?src=google
```

5. After storefront attribution deploy: place a test order from that link →
   console Live orders should show `channel=google` and UTM in `source_detail`.

## Code (this PR)

- First-touch capture of `utm_*` / `src` into `sessionStorage`
- Checkout sends `channel` + `source_detail` (no longer hardcodes `"web"`)
- Server allows `channel=google`

## Onboarding standard (later)

Add the GBP Order Online URL step to go-live checklist / self-serve docs for
every new tenant (same UTM pattern with their domain).
