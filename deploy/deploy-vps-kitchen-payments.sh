#!/usr/bin/env bash
# Deploy kitchen auto-fire + dual payment modes on Hostinger VPS
# Usage: bash deploy-vps-kitchen-payments.sh [/var/www/samurai-resto]
set -eu

ROOT="${1:-/var/www/samurai-resto}"
API="$ROOT/artifacts/api-server"
WEB="$ROOT/artifacts/samurai-resto"
REPO="${SAMURAI_GITHUB_REPO:-https://github.com/Suhono-BranchlessPay/Commercial-website.git}"
TMP="/tmp/samurai-deploy-src"

echo "==> Samurai deploy: prepaid card payments only (no EXTERNAL)"
echo "    ROOT=$ROOT"

# ── DATABASE_URL (avoid export \$(cat .env) — breaks on special chars) ──
DBURL=""
if [ -f "$ROOT/.env" ]; then
  DBURL=$(grep -E '^DATABASE_URL=' "$ROOT/.env" | head -1 | sed 's/^DATABASE_URL=//' | tr -d '"' | tr -d "'")
fi
if [ -z "$DBURL" ] && [ -f "$ROOT/ecosystem.config.cjs" ]; then
  DBURL=$(node -e "const c=require('$ROOT/ecosystem.config.cjs'); console.log(c.apps?.[0]?.env?.DATABASE_URL||'');")
fi

# ── 1. Sync source from GitHub (VPS project folder is not always a git repo) ──
if command -v git >/dev/null 2>&1; then
  echo "==> Fetching latest source from GitHub..."
  rm -rf "$TMP"
  if git clone --depth 1 "$REPO" "$TMP"; then
    for f in \
      "artifacts/api-server/src/integrations/square.ts" \
      "artifacts/api-server/src/routes/orders.ts" \
      "artifacts/api-server/src/routes/square.ts" \
      "artifacts/api-server/src/routes/index.ts" \
      "lib/db/src/schema/menu.ts" \
      "artifacts/samurai-resto/src/pages/order.tsx" \
      "artifacts/samurai-resto/src/components/SquareCardPayment.tsx" \
      "artifacts/samurai-resto/src/pages/owner.tsx" \
      "lib/api-zod/src/generated/types/orderInput.ts" \
      "lib/api-zod/src/generated/types/order.ts" \
      "lib/api-spec/openapi.yaml"
    do
      if [ -f "$TMP/$f" ]; then
        mkdir -p "$(dirname "$ROOT/$f")"
        cp "$TMP/$f" "$ROOT/$f"
        echo "    copied $f"
      else
        echo "    WARN missing in repo: $f"
      fi
    done
  else
    echo "    WARN git clone failed — building with files already on disk"
  fi
else
  echo "    WARN git not installed — building with files already on disk"
fi

# ── 2. DB migration (inline — no SQL file required) ──
if [ -n "$DBURL" ]; then
  echo "==> DB migration..."
  psql "$DBURL" -v ON_ERROR_STOP=1 <<'SQL'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_timing text NOT NULL DEFAULT 'pay_at_pickup';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_payment_id text;
SQL
else
  echo "    WARN DATABASE_URL not found — run migration manually:"
  echo "    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_timing text NOT NULL DEFAULT 'pay_at_pickup';"
  echo "    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';"
  echo "    ALTER TABLE orders ADD COLUMN IF NOT EXISTS square_payment_id text;"
fi

# ── 3. Build API ──
echo "==> Build API..."
cd "$API"
pnpm run build

# ── 4. Build frontend (BASE_PATH + PORT required by vite.config.ts) ──
echo "==> Build frontend..."
cd "$WEB"
PORT="${PORT:-26204}" BASE_PATH="${BASE_PATH:-/}" pnpm run build

# ── 5. Restart API ──
echo "==> Restart PM2..."
pm2 restart samurai-api --update-env
pm2 status samurai-api

echo ""
echo "==> Done."
echo "    Pay Now needs: SQUARE_APPLICATION_ID in ecosystem.config.cjs / .env"
echo "    Test: card charge → Square shows Visa/MC •••• → kitchen prints"
