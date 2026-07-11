-- Tenant #3: Samurai Hibachi — Linton (same brand, different location)
-- Config-only differentiation (no new layout variants required).
-- Menu stays EMPTY until Square Linton is connected (do NOT clone Martinsville).
-- anchor_mode = platform (like Kirin). Address/phone/hours TBD from Malik.
-- Safe to re-run (UPSERT).

INSERT INTO tenants (
  id, slug, name, domain,
  logo_url, favicon_url,
  address, city, state, postcode, lat, lng,
  service_area_radius, pickup_phone, pickup_business_name,
  languages, hours, theme, anchor_mode, status, pos_type, data_mode
) VALUES (
  'samurai-linton',
  'samurai-linton',
  'Samurai Hibachi — Linton',
  'samurailinton.com',
  '/samurai-logo.png',
  '/favicon.svg',
  NULL,
  'Linton',
  'IN',
  NULL,
  39.0348,
  -87.1658,
  12,
  NULL,
  'Samurai Hibachi — Linton',
  '["en"]'::jsonb,
  '{
    "weekly": [
      {"day":"Monday","hours":"TBD"},
      {"day":"Tuesday","hours":"TBD"},
      {"day":"Wednesday","hours":"TBD"},
      {"day":"Thursday","hours":"TBD"},
      {"day":"Friday","hours":"TBD"},
      {"day":"Saturday","hours":"TBD"},
      {"day":"Sunday","hours":"TBD"}
    ]
  }'::jsonb,
  $${
    "personality": "samurai-linton-location",
    "brandName": "Samurai Hibachi — Linton",
    "brandShort": "Samurai Linton",
    "tagline": "Now in Linton, IN — the same Samurai fire, ready for pickup.",
    "aboutText": "Samurai Hibachi brings its signature flame-grilled hibachi from Martinsville to Linton, Indiana. Same recipes, same quality, same Samurai spirit — now closer to you.",
    "logoUrl": "/samurai-logo.png",
    "faviconUrl": "/favicon.svg",
    "use_shared_food_photos": false,
    "order_types": ["pickup"],
    "primary": "348 75% 42%",
    "secondary": "38 92% 55%",
    "accent": "0 0% 7%",
    "fontHeading": "Inter",
    "fontBody": "Inter",
    "metaTitle": "Samurai Hibachi — Linton, IN — Order Pickup Online",
    "metaDescription": "Samurai Hibachi in Linton, Indiana. Fresh hibachi made to order — pickup online. Same Samurai brand, new location.",
    "metaKeywords": "samurai hibachi linton indiana, hibachi linton in, japanese restaurant linton, samurai linton order online",
    "ogTitle": "Samurai Hibachi — Linton, IN",
    "ogDescription": "The same Samurai fire you love, now serving Linton, Indiana. Order pickup online.",
    "ogImage": "/og-image.jpg",
    "cuisine": ["Japanese", "Hibachi", "Sushi"],

    "colors": {
      "primary": "#B91C3C",
      "primary_deep": "#7F1230",
      "accent": "#F5A623",
      "ink": "#F5F0E8",
      "paper": "#121212",
      "paper_2": "#1C1C1C",
      "muted": "#9A9A9A",
      "line": "#333333",
      "dark_section": "#121212",
      "dark_text": "#F5F0E8"
    },

    "fonts": {
      "display": "Inter",
      "display_fallback": "Inter, system-ui, sans-serif",
      "body": "Inter",
      "accent": "Inter"
    },

    "layout": {
      "hero_variant": "HeroMinimalCenter",
      "featured_variant": "ListCompact",
      "menu_variant": "menu-list",
      "story_variant": "StoryCentered",
      "cta_variant": "BannerAccent",
      "nav_variant": "NavSolid",
      "footer_variant": "FooterDark",
      "sections": ["hero", "story", "featured", "catering_cta"]
    },

    "copy": {
      "hero_headline": ["Samurai Hibachi — Linton"],
      "hero_subheadline": "The same Samurai fire you love, now serving Linton, Indiana. Fresh hibachi, made to order, ready for pickup.",
      "hero_ctas": [
        {"label": "Order Pickup", "href": "/order", "style": "primary"},
        {"label": "View Menu", "href": "/menu", "style": "outline"}
      ],
      "featured_eyebrow": "Linton Menu",
      "featured_title": "Hibachi Favorites",
      "story_eyebrow": "Now in Linton, IN",
      "story_title": "Same Samurai. New Home in Linton.",
      "story_body": [
        "Samurai Hibachi brings its signature flame-grilled hibachi from Martinsville to Linton, Indiana.",
        "Same recipes, same quality, same Samurai spirit — now closer to you. Photos and full address coming soon."
      ],
      "stats": [],
      "reviews": [],
      "brochures": [],
      "menu_page_title": "Linton Menu",
      "menu_page_subtitle": "Menu syncs from Square Linton when connected. Pickup only for now.",
      "cta_title": "Pickup in Linton, IN",
      "cta_subtitle": "Order ahead and skip the wait. Delivery coming soon.",
      "cta_buttons": [
        {"label": "Start Pickup Order", "href": "/order"}
      ]
    },

    "assets": {
      "logo": "/samurai-logo.png",
      "favicon": "/favicon.svg",
      "og_image": "/og-image.jpg"
    },

    "identity": {
      "name": "Samurai Hibachi — Linton",
      "brand": "samurai",
      "tagline": "Now in Linton, IN",
      "cuisine": "Japanese Hibachi & Sushi",
      "city": "Linton",
      "state": "IN",
      "order_types": ["pickup"],
      "languages": ["en"],
      "notes": "Square Linton + address/phone/hours/photos TBD from Malik. Do not use Martinsville Square catalog or photos."
    },

    "seo": {
      "title": "Samurai Hibachi — Linton, IN — Order Pickup Online",
      "description": "Samurai Hibachi in Linton, Indiana. Fresh hibachi made to order — pickup online. Same Samurai brand, new location.",
      "canonical": "https://samurailinton.com",
      "og_title": "Samurai Hibachi — Linton, IN",
      "og_description": "The same Samurai fire you love, now serving Linton, Indiana. Order pickup online.",
      "og_image": "https://samurailinton.com/og-image.jpg",
      "og_url": "https://samurailinton.com",
      "og_site_name": "Samurai Hibachi — Linton",
      "keywords": "samurai hibachi linton indiana, hibachi linton in, japanese restaurant linton, samurai linton order online"
    }
  }$$::jsonb,
  'platform',
  'active',
  'square',
  'pos-full'
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  logo_url = EXCLUDED.logo_url,
  favicon_url = EXCLUDED.favicon_url,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  postcode = EXCLUDED.postcode,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  service_area_radius = EXCLUDED.service_area_radius,
  pickup_phone = EXCLUDED.pickup_phone,
  pickup_business_name = EXCLUDED.pickup_business_name,
  languages = EXCLUDED.languages,
  hours = EXCLUDED.hours,
  theme = EXCLUDED.theme,
  anchor_mode = EXCLUDED.anchor_mode,
  status = EXCLUDED.status,
  pos_type = EXCLUDED.pos_type,
  data_mode = EXCLUDED.data_mode;

-- Never inherit Martinsville / Kirin menu
DELETE FROM menu_items WHERE tenant_id = 'samurai-linton';
DELETE FROM menu_categories WHERE tenant_id = 'samurai-linton';

SELECT id, slug, domain, city, state, anchor_mode,
       theme->'layout'->>'hero_variant' AS hero,
       theme->'layout'->>'featured_variant' AS featured,
       theme->'layout'->'sections' AS sections,
       theme->>'use_shared_food_photos' AS shared_photos,
       theme->'seo'->>'canonical' AS canonical
FROM tenants WHERE id = 'samurai-linton';
