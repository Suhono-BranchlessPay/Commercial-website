## Summary

- AI Social Posting Engine **Stage 1** (manual-assisted): schema, facts-only draft + angle rotation, dashboard queue (draft → approve → copy → mark posted), closed-loop performance by `src`.
- **No Meta Graph auto-publish.** `require_approval` forced true. Samurai Facebook trial first.
- Docs + VPS migrate script. First live test item: **Steak Bento** (menu name; SPEC “Beef Bento”).

## Test plan

- [ ] `psql … -f scripts/migrate-social-posts-stage1.sql`
- [ ] Confirm `https://samurairesto.com/r/samurai?src=fb-steakbento-20260715` → menu + scan logged
- [ ] Dashboard → samurai → Social posts → generate Steak Bento draft
- [ ] Approve → copy → (Malik) post to FB → Mark posted
- [ ] Performance shows zeros until real clicks/orders (do not invent)
- [ ] Confirm Blok 4.1 inbox + Square payments unchanged
