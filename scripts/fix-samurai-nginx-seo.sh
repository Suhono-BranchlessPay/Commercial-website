#!/usr/bin/env bash
# Point samurairesto.com document routes at Express (SEO injection + sitemap/robots).
set -euo pipefail

CONF=/etc/nginx/sites-enabled/samurai-resto
cp -a "$CONF" "/root/backups/samurai-resto.nginx.bak.$(date +%Y%m%d%H%M)"

python3 - <<'PY'
from pathlib import Path
path = Path("/etc/nginx/sites-enabled/samurai-resto")
text = path.read_text()
old = """    # Frontend SPA — semua route lain serve index.html
    root /var/www/samurai-resto/artifacts/samurai-resto/dist/public;
    index index.html;

    location / {
        try_files $uri /index.html;
    }"""
new = """    # Document routes → Express (tenant SEO head, /tags, /places, sitemap, robots)
    root /var/www/samurai-resto/artifacts/samurai-resto/dist/public;
    index index.html;

    location = /robots.txt {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /sitemap.xml {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }"""
if old not in text:
    raise SystemExit("Expected try_files block not found — aborting")
path.write_text(text.replace(old, new, 1))
print("patched", path)
PY

# Ensure STOREFRONT_DIST is set for PM2
node <<'NODE'
const fs = require('fs');
const p = '/var/www/samurai-resto/ecosystem.config.cjs';
let src = fs.readFileSync(p, 'utf8');
const dist = '/var/www/samurai-resto/artifacts/samurai-resto/dist/public';
if (!/STOREFRONT_DIST/.test(src)) {
  // Insert into first env: { block — best-effort string patch
  src = src.replace(
    /(env\s*:\s*\{)/,
    `$1\n      STOREFRONT_DIST: ${JSON.stringify(dist)},`,
  );
  fs.writeFileSync(p, src);
  console.log('added STOREFRONT_DIST');
} else {
  console.log('STOREFRONT_DIST already present');
}
const m = require(p);
console.log('STOREFRONT_DIST=', m.apps[0].env.STOREFRONT_DIST || '(missing)');
NODE

nginx -t
systemctl reload nginx
cd /var/www/samurai-resto
pm2 restart ecosystem.config.cjs --update-env
sleep 2

echo '== robots =='
curl -sS https://samurairesto.com/robots.txt | head -20
echo '== sitemap =='
curl -sS https://samurairesto.com/sitemap.xml | head -40
echo '== home title =='
curl -sS https://samurairesto.com/ | grep -E '<title>|canonical' | head -5
