## Summary

- Filter known scrapers (`facebookexternalhit`, `curl`, …) from social ROI **clicks** and QR `human_scans`.
- Keep raw/bot counts visible for transparency — do not invent metrics.
- Fixes inflated click counts after Facebook link-preview crawls a new post.

## Test plan

- [ ] Deploy; open QR scans — see human vs bot totals
- [ ] Social posts → Performance for `fb-crabmeatbento-20260714` — human clicks < raw scans
- [ ] Paid order attribution unchanged
