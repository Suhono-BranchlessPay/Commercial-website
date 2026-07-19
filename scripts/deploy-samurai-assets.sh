#!/usr/bin/env bash
# Restore Vite-hashed storefront images from dist → attached_assets/, then rebuild.
# Formalizes the manual "aset dipulihkan dari dist" step — safe/idempotent on every deploy.
# Usage (on VPS): bash scripts/deploy-samurai-assets.sh
# Env: APP_DIR (default /var/www/samurai-resto), SKIP_STOREFRONT_BUILD=1 to restore only.
set -euo pipefail

APP="${APP_DIR:-/var/www/samurai-resto}"
cd "$APP"

DIST="${DIST_ASSETS:-artifacts/samurai-resto/dist/public/assets}"
OUT="${ATTACHED_ASSETS:-attached_assets}"

if [[ ! -d "$DIST" ]]; then
  echo "WARN: $DIST missing — skip restore (build storefront first, then re-run)."
  exit 0
fi

mkdir -p "$OUT"

echo "== restore hashed assets from dist → $OUT =="
python3 - "$DIST" "$OUT" <<'PY'
import os, re, shutil, sys
dist, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
pat = re.compile(
    r"^(?P<base>.+)-(?P<hash>[A-Za-z0-9_-]{6,12})\.(?P<ext>jpe?g|png|webp|gif)$",
    re.I,
)
restored = 0
for name in os.listdir(dist):
    m = pat.match(name)
    if not m:
        continue
    dest = os.path.join(out, f"{m.group('base')}.{m.group('ext')}")
    src = os.path.join(dist, name)
    shutil.copy2(src, dest)
    restored += 1
    print("restored", dest)
print("total_restored", restored)
PY

if [[ "${SKIP_STOREFRONT_BUILD:-0}" == "1" ]]; then
  echo "SKIP_STOREFRONT_BUILD=1 — done after restore only"
  exit 0
fi

echo "== rebuild storefront =="
PORT="${STOREFRONT_PORT:-26204}" BASE_PATH=/ pnpm --filter @workspace/samurai-resto run build 2>&1 | tail -30

echo "deploy-samurai-assets: OK"
