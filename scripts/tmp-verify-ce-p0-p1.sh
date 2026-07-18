#!/usr/bin/env bash
# Run on VPS after deploying Content Engine P0/P1 fixes.
# Verifies: SOCIAL_SEND off, shortlink human scan, square_push backfill, GSC token set.
set -euo pipefail
cd /var/www/samurai-resto

echo "== SOCIAL_SEND_ENABLED =="
node -e 'const e=require("./ecosystem.config.cjs").apps[0].env; console.log("SOCIAL_SEND_ENABLED=", e.SOCIAL_SEND_ENABLED); console.log("GSC_OAUTH_OPS_TOKEN set=", Boolean(e.GSC_OAUTH_OPS_TOKEN&&String(e.GSC_OAUTH_OPS_TOKEN).trim()))'

echo "== social/health =="
curl -sS https://samurairesto.com/api/social/health
echo

DBURL=$(node -e "process.stdout.write(require('./ecosystem.config.cjs').apps.find(a=>a.name==='samurai-api').env.DATABASE_URL||'')")
: "${DBURL:?DATABASE_URL missing}"

echo "== migrate square_push_status =="
psql "$DBURL" -v ON_ERROR_STOP=1 -f scripts/migrate-fix-square-push-status.sql

SRC="test-manual-$(date +%Y%m%d%H%M%S)"
echo "== shortlink smoke src=$SRC =="
curl -sS -o /dev/null -w "http=%{http_code} loc=%{redirect_url}\n" \
  -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148" \
  "https://samurairesto.com/s/crab-rangoon-4-pcs?src=${SRC}"

psql "$DBURL" -c "
SELECT created_at, user_agent, meta->>'src' AS src, meta->>'kind' AS kind
FROM qr_scans
WHERE meta->>'src' = '${SRC}'
ORDER BY created_at DESC
LIMIT 3;
"

echo "== pending_approval off-topic sample =="
psql "$DBURL" -c "
SELECT id, status, classification, left(body,80) AS body
FROM social_inbox
WHERE tenant_id = (SELECT id FROM tenants WHERE slug='samurai' LIMIT 1)
  AND status = 'pending_approval'
  AND body ~* 'donut|doughnut|glazed jelly'
LIMIT 10;
"

echo "Next: POST /api/social/inbox/reclassify-pending?tenant_id=samurai with dashboard cookie or X-Social-Internal-Key"
echo "Phone checkout smoke still required for order.source_detail.src"
