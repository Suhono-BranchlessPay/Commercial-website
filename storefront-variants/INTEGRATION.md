# Storefront Variants Library (from Replit)

Standalone demo app + component source. **Production storefront** uses a ported copy under:

`artifacts/samurai-resto/src/variants/`

wired by `buildTenantPageConfig()` → `PageRenderer`.

## Do not merge demos into production tenants

`src/data/demos.ts` uses Unsplash placeholders for design review only.
Live tenants must get photos from their own `theme.assets` / menu `imageUrl`.

## Adding a new variant

1. Add component under `storefront-variants/src/components/...` (Replit) or directly under `artifacts/samurai-resto/src/variants/...`
2. Register in `PageRenderer.tsx`
3. Extend types in `types/config.ts` if needed
4. Document the variant id for Identity Packs

## Identity Pack layout keys

```json
"layout": {
  "hero_variant": "HeroSplit",
  "featured_variant": "BigCards",
  "story_variant": "StorySplit",
  "cta_variant": "BannerAccent",
  "nav_variant": "NavSolid",
  "footer_variant": "FooterLight",
  "sections": ["hero", "featured", "story", "catering_cta", "location_cta"]
}
```

Legacy kebab ids (`hero-split`, `nav-solid-dark`, …) still work via the adapter.
