#!/usr/bin/env bash
set -euo pipefail
cd /var/www/samurai-resto

echo "== backup ecosystem =="
mkdir -p ~/backups
cp -a ecosystem.config.cjs "~/backups/ecosystem.config.cjs.bak.$(date +%Y%m%d%H%M)" || true

echo "== git reset to origin/main =="
git fetch origin '+refs/heads/main:refs/remotes/origin/main'
git checkout main
git reset --hard origin/main
git log -1 --oneline

if [[ ! -f ecosystem.config.cjs ]]; then
  LATEST=$(ls -t ~/backups/ecosystem.config.cjs.bak* 2>/dev/null | head -1 || true)
  if [[ -n "${LATEST:-}" ]]; then
    cp "$LATEST" ecosystem.config.cjs
  else
    echo "Missing ecosystem.config.cjs" >&2
    exit 1
  fi
fi

echo "== migrate SEO =="
DBURL=$(node -e "const m=require('./ecosystem.config.cjs'); console.log(m.apps[0].env.DATABASE_URL)")
psql "$DBURL" -v ON_ERROR_STOP=1 -f scripts/migrate-seo-programmatic.sql

echo "== build db decls + api-server =="
pnpm --filter @workspace/db exec tsc -p tsconfig.json
pnpm --filter @workspace/api-server build

echo "== build storefront =="
PORT=26204 BASE_PATH=/ pnpm --filter @workspace/samurai-resto run build

echo "== pm2 restart =="
pm2 restart ecosystem.config.cjs --update-env
sleep 2

echo "== smoke =="
curl -sS -o /dev/null -w 'healthz:%{http_code}\n' https://samurairesto.com/api/healthz
echo '--- robots.txt ---'
curl -sS https://samurairesto.com/robots.txt | head -20
echo '--- sitemap head ---'
curl -sS https://samurairesto.com/sitemap.xml | head -40
echo '--- git ---'
git log -1 --oneline

echo "OK deploy SEO programmatic"
