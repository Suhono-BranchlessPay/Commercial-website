#!/usr/bin/env bash
# Deploy clean API source from GitHub — fixes broken hotpatch on VPS
set -eu

APP_ROOT="${1:-/var/www/samurai-resto}"
REPO="https://github.com/Suhono-BranchlessPay/orderly-platform.git"
TMP="/tmp/commercial-website-src"

echo "==> Clone GitHub repo"
rm -rf "$TMP"
git clone --depth 1 "$REPO" "$TMP"

API="$APP_ROOT/artifacts/api-server"

echo "==> Restore clean orders.ts + square.ts"
cp "$TMP/artifacts/api-server/src/routes/orders.ts" "$API/src/routes/orders.ts"
cp "$TMP/artifacts/api-server/src/integrations/square.ts" "$API/src/integrations/square.ts"

echo "==> Remove hotfix debris (optional duplicate modules)"
rm -rf "$API/src/services/square" 2>/dev/null || true
rm -f "$API/src/db/orderSquareUpdate.ts" "$API/src/db/orderSquareDrizzle.ts" 2>/dev/null || true
rm -f "$API/scripts/apply-square-wire.mjs" 2>/dev/null || true

echo "==> Build api-server"
cd "$API"
pnpm run build

echo "==> Restart PM2"
pm2 restart samurai-api --update-env
sleep 2
pm2 logs samurai-api --lines 20 --nostream

echo "DONE — place test order on samurairesto.com"
echo "Then: pm2 logs samurai-api --lines 40 --nostream | grep -i square"
