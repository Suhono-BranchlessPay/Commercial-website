# Programmatic SEO + Powered by Orderly

Closes the Owner.com gap for **long-tail SEO** and discovery backlinks — once,
for every tenant (config-driven).

## What shipped

| Piece | Status |
|-------|--------|
| Schema.org Restaurant JSON-LD | ✅ (`hours.weekly` AM/PM parsed) |
| Per-tenant `sitemap.xml` | ✅ + xhtml hreflang alternates |
| Per-tenant `robots.txt` | ✅ |
| Tag pages `/tags/{slug}` | ✅ SSR + React; **≥3 items** |
| Place pages `/places/{slug}` | ✅ radius-only |
| **Multilingual SEO** | ✅ `/es\|zh\|vi\|id\|ar/…` + hreflang |
| Powered by Orderly footer | ✅ UTM + `show_powered_by` |
| Loyalty / Gift card | ❌ later |
| CrustnRoll migration | ❌ blocked until Parts 1–3 |

## Multilingual rules

- English stays **unprefixed** (`/tags/hibachi`); other locales use `/es/tags/hibachi`
- Menu item **names** stay as the restaurant wrote them (not machine-translated)
- Page chrome (H1, CTA, lead) uses **curated** packs in `seoI18n.ts` (es/zh/vi/id/ar)
- Locales: `theme.seo.locales` → else `tenants.languages` (if >1) → else `en,es,zh,vi,id,ar`
- Every page emits `hreflang` + `x-default` + `<html lang dir>`

## Ops

```bash
psql "$DATABASE_URL" -f scripts/migrate-seo-programmatic.sql
# Samurai nginx: document routes must proxy to Express
# (see scripts/fix-samurai-nginx-seo.sh)
```

## Google Search Console

1. Add property `https://samurairesto.com` (URL prefix).
2. Choose **HTML file** verification → download `google….html`.
3. Set env on the API (per tenant preferred):
   ```bash
   TENANT_SAMURAI_GOOGLE_SITE_VERIFICATION_FILE=google27c314f8a7bebb36.html
   ```
4. Redeploy / `pm2 restart … --update-env`.
5. Confirm: `curl -sS https://samurairesto.com/google27c314f8a7bebb36.html`
   → must print `google-site-verification: google….html`
6. Click **Verify** in Search Console → submit sitemap `https://samurairesto.com/sitemap.xml`.

## Verify

```bash
curl -sS https://samurairesto.com/sitemap.xml | grep hreflang | head
curl -sS https://samurairesto.com/es/tags/hibachi | grep -E '<h1|hreflang|lang='
curl -sS https://samurairesto.com/zh/places/martinsville-in | grep -E '<h1|inLanguage'
```
