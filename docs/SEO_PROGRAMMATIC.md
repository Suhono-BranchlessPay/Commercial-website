# Programmatic SEO + Powered by Orderly (foundation)

Closes the Owner.com gap for **long-tail SEO** and discovery backlinks — once,
for every tenant (config-driven).

## What shipped (this PR)

| Piece | Status |
|-------|--------|
| Schema.org Restaurant JSON-LD | ✅ improved (`hours.weekly` AM/PM parsed) |
| Per-tenant `sitemap.xml` | ✅ `/sitemap.xml` |
| Per-tenant `robots.txt` | ✅ `/robots.txt` (Sitemap directive; disallow `/owner` `/account`) |
| Tag pages `/tags/{slug}` | ✅ SSR body + React page; **≥3 items** required |
| Place pages `/places/{slug}` | ✅ only within `service_area_radius` |
| Rebuild after Square menu sync | ✅ tags rebuilt on successful sync |
| Dashboard rebuild | ✅ `POST /api/dashboard/seo/rebuild` `{ tenant_id }` |
| Powered by Orderly footer | ✅ + UTM; `tenants.show_powered_by` (default true) |
| Multilingual SEO (`/es/...`) | ❌ next slice |
| Loyalty / Gift card | ❌ later (Parts 2–3) |
| CrustnRoll migration | ❌ blocked until Parts 1–3 + redirects ready |

## Hard quality rules (anti–doorway)

- No tag page unless **≥3 available** menu items match
- No place page outside **service radius** (haversine vs seed localities)
- Unique descriptions per tenant (brand + city + sample items)
- Canonical URL = tenant domain + path

## Migrate + rebuild (prod)

```bash
psql "$DATABASE_URL" -f scripts/migrate-seo-programmatic.sql
# after API deploy:
curl -X POST https://orderlyfoods.com/api/dashboard/seo/rebuild \
  -H 'Content-Type: application/json' \
  -b 'cookies…' \
  -d '{"tenant_id":"samurai"}'
```

Or hit `/sitemap.xml` on the tenant domain (lazy-builds empty tables).

## Verify

```bash
curl -sS https://samurairesto.com/robots.txt | head
curl -sS https://samurairesto.com/sitemap.xml | head -40
curl -sS https://samurairesto.com/tags/hibachi | grep -E '<h1|MenuItem|orderly-seo-ssr'
curl -sS https://samurairesto.com/places/martinsville-in | grep -E '<h1|areaServed'
```

Rich Results Test on a tag URL after deploy.

## nginx

Document routes `/`, `/tags/*`, `/places/*`, `/sitemap.xml`, `/robots.txt` must
proxy to Express (already the multi-tenant pattern in
`deploy/nginx-multi-tenant.conf.md`). Do **not** serve a static storefront
`index.html` for those paths.

## Not yet (do not claim in Orderly report as done)

- SEO multibahasa + hreflang
- Google Search Console impression dashboard
- 301 redirect map for Owner → Orderly (CrustnRoll)
- AI-written unique copy beyond template+item samples
- Expanded US places dataset (current seed covers IN/KY metros)
