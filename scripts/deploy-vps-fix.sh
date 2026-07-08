#!/usr/bin/env bash
# Restore clean source + Square ASAP/payment fix
set -eu
APP_ROOT="${1:-/var/www/samurai-resto}"
API="$APP_ROOT/artifacts/api-server"
BASE="https://branchlesspay.com/samurai-debug"

echo "==> Download fixed source files"
curl -fsSL -o "$API/src/routes/orders.ts" "$BASE/orders.ts"
curl -fsSL -o "$API/src/integrations/square.ts" "$BASE/square.ts"

echo "==> Remove hotfix debris"
rm -rf "$API/src/services/square" 2>/dev/null || true
rm -f "$API/src/db/orderSquareUpdate.ts" "$API/src/db/orderSquareDrizzle.ts" 2>/dev/null || true

echo "==> Build"
cd "$API"
pnpm run build

pm2 restart samurai-api --update-env
echo "DONE"
