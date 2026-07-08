#!/usr/bin/env bash
set -eu
API="${1:-/var/www/samurai-resto}/artifacts/api-server"
curl -fsSL -o "$API/src/integrations/square.ts" https://branchlesspay.com/samurai-debug/square-kitchen.ts
cd "$API" && pnpm run build
pm2 restart samurai-api --update-env
echo "Deployed square kitchen fix"
