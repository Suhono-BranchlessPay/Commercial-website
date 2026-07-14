# AI Social Posting Engine — Stage 1 (manual-assisted)

**Trial tenant:** Samurai Martinsville · **Platform:** Facebook first  
**Hard rule:** human approve → Malik posts manually. **No Meta Graph auto-publish.**

## Why Stage 1 first

Prove the closed loop (post → unique `src` → clicks → paid orders → $) before
any auto-post risk. Meta app may still be Unpublished — that does not block Stage 1.

## Status

| Piece | Status |
|-------|--------|
| Schema `social_posting_config` / `social_posts` | ✅ |
| Facts-only draft + angle rotation | ✅ (templates; no invented claims) |
| Dashboard queue: draft → approve → copy → mark posted | ✅ |
| Tracked link `/r/{slug}?src=` | ✅ (already live) |
| Performance: clicks + orders + revenue by `src` | ✅ |
| Auto rotation / schedule / Graph publish | ❌ Stage 2+ |
| Instagram / TikTok | ❌ later |

## First test (Steak Bento)

Live menu name is **Steak Bento** (not “Beef Bento”). Use that item.

1. Verify redirect (already OK):  
   `https://samurairesto.com/r/samurai?src=fb-steakbento-YYYYMMDD` → menu + `src` logged
2. Dashboard → tenant **samurai** → Social posts → pick Steak Bento → **Generate draft**
3. **Approve** → **Copy post + link** → paste into Facebook Page (attach photo if POS has none)
4. **Mark posted**
5. Wait 48h → **Performance** — real clicks / orders / $ only (empty = zero)

Optional src for the SPEC naming: when drafting, API accepts `src_tag: "fb-beefbento-20260715"`.

## Env

```js
ORDERLY_SOCIAL_POSTING_ENABLED: "0", // Stage 2 scheduler gate; Stage 1 drafts work without it
SOCIAL_KILL_SWITCH_SAMURAI: "0",     // "1" blocks approve + mark-posted
```

`require_approval` is **forced true** in Stage 1 product logic.

## Migrate

```bash
psql "$DATABASE_URL" -f scripts/migrate-social-posts-stage1.sql
```

## Dashboard API

| Method | Path |
|--------|------|
| GET/PUT | `/api/dashboard/social-posts/config` |
| GET | `/api/dashboard/social-posts/candidates` |
| GET | `/api/dashboard/social-posts` |
| POST | `/api/dashboard/social-posts/draft` `{ tenant_id, menu_item_id \| item_name }` |
| POST | `/api/dashboard/social-posts/:id/approve` |
| POST | `/api/dashboard/social-posts/:id/skip` |
| POST | `/api/dashboard/social-posts/:id/mark-posted` |
| GET | `/api/dashboard/social-posts/performance` |

## Hard rules (draft)

- Only POS facts: name, description (as listed), price, category, restaurant, city
- No invented health/allergen claims, awards, discounts, or rankings
- Re-check availability before approve and mark-posted (never promote 86'd items)
- Angle rotation: appetite / value / convenience / story / question / seasonal

## Attribution

```
https://{domain}/r/{tenantSlug}?src=fb-{itemslug}-{yyyymmdd}
```

- Clicks: `qr_scans.meta.src`
- Orders: `orders.source_detail.src` (paid only)
- Channel mapping: `src` starting with `fb` / facebook → channel `facebook`

## Stage 2+ (not in this PR)

- Auto item rotation + prime-time schedule
- Meta `pages_manage_posts` after app Published
- Still approval-gated until weeks of clean Stage 1
- Kill switch + audit + owner notification on every post
