-- Align Identity Packs with Replit PascalCase variant names.
-- Adapter still accepts legacy kebab IDs; this makes DB the source of truth.
-- Safe to re-run.

-- Samurai
UPDATE tenants SET
  theme = theme || $${
    "layout": {
      "hero_variant": "HeroFullImage",
      "featured_variant": "CardGrid",
      "menu_variant": "menu-grid",
      "story_variant": "StoryCentered",
      "cta_variant": "BannerDark",
      "nav_variant": "NavSolid",
      "footer_variant": "FooterDark",
      "sections": ["hero", "menu_download", "featured", "reviews", "story"]
    },
    "use_shared_food_photos": true
  }$$::jsonb
WHERE id = 'samurai';

-- Kirin
UPDATE tenants SET
  theme = theme || $${
    "layout": {
      "hero_variant": "HeroSplit",
      "featured_variant": "BigCards",
      "menu_variant": "menu-list",
      "story_variant": "StorySplit",
      "cta_variant": "BannerAccent",
      "nav_variant": "NavSolid",
      "footer_variant": "FooterLight",
      "sections": ["hero", "featured", "story", "catering_cta", "menu_download", "location_cta"]
    },
    "use_shared_food_photos": false
  }$$::jsonb
WHERE id = 'kirin';

SELECT id,
       theme->'layout'->>'hero_variant' AS hero,
       theme->'layout'->>'featured_variant' AS featured,
       theme->'layout'->>'story_variant' AS story,
       theme->'layout'->>'nav_variant' AS nav,
       theme->'layout'->>'footer_variant' AS footer,
       theme->'layout'->'sections' AS sections
FROM tenants WHERE id IN ('samurai','kirin') ORDER BY id;
