#!/usr/bin/env bash
set -eu

ROOT="${1:-/var/www/samurai-resto}"
API="$ROOT/artifacts/api-server"
BASE_URL="${DEPLOY_BASE_URL:-https://branchlesspay.com/samurai-debug}"

echo "==> Samurai catalog + kitchen print fix"
echo "    ROOT=$ROOT"

curl -fsSL -o "$API/src/integrations/square.ts" "$BASE_URL/square-catalog.ts"
curl -fsSL -o "$API/src/routes/orders.ts" "$BASE_URL/orders-catalog.ts"

cd "$API"
pnpm run build

pm2 restart samurai-api --update-env
pm2 status samurai-api

echo "==> Done. Place test order; kitchen ticket should print if printer profile includes item category."
