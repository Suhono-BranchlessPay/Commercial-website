#!/usr/bin/env bash
set -eu

ROOT="${1:-/var/www/samurai-resto}"
API="$ROOT/artifacts/api-server"
WEB="$ROOT/artifacts/samurai-resto"

echo "==> Samurai: kitchen auto-fire + dual payment modes"
echo "    ROOT=$ROOT"
echo "    (Use deploy/deploy-vps-kitchen-payments.sh for full VPS deploy)"
echo ""

DBURL=""
if [ -f "$ROOT/.env" ]; then
  DBURL=$(grep -E '^DATABASE_URL=' "$ROOT/.env" | head -1 | sed 's/^DATABASE_URL=//' | tr -d '"' | tr -d "'")
fi

if [ -n "$DBURL" ]; then
  echo "==> DB migration..."
  psql "$DBURL" -v ON_ERROR_STOP=1 <<'SQL'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_timing text NOT NULL DEFAULT 'pay_at_pickup';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_payment_id text;
SQL
else
  echo "    Skip DB — set DATABASE_URL in .env"
fi

cd "$API"
pnpm run build

cd "$WEB"
PORT="${PORT:-26204}" BASE_PATH="${BASE_PATH:-/}" pnpm run build

pm2 restart samurai-api --update-env
pm2 status samurai-api
