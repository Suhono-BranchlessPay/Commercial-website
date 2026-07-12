# Split: Orderly console vs Samurai (client) site

## Product rule

| Domain | Role |
|--------|------|
| `samurairesto.com` | **Client** storefront + `/owner` (PIN) |
| `orderlyfoods.com` | **Orderly Foods** Master/Manager console `/dashboard` |

Never serve the Master multi-tenant console on a restaurant domain.

## Code

- Host allowlist: `ORDERLY_DASHBOARD_HOSTS` (default `orderlyfoods.com,www.orderlyfoods.com,localhost,127.0.0.1`)
- `/dashboard` and `/api/dashboard/*` return **404** on other hosts (e.g. samurairesto.com)

## Nginx on Orderly VPS (`69.62.65.34` / orderlyfoods.com)

Proxy console + its API to the Samurai API process (same DB), forcing `Host: orderlyfoods.com` so the allowlist passes:

```nginx
# /etc/nginx/sites-available/orderlyfoods-console
server {
    listen 443 ssl http2;
    server_name orderlyfoods.com www.orderlyfoods.com;
    # ssl_certificate ... (certbot)

    location /dashboard {
        proxy_pass http://127.0.0.1:8080;   # OR http://46.202.179.234:8080 if API stays on Samurai VPS
        proxy_http_version 1.1;
        proxy_set_header Host orderlyfoods.com;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/dashboard/ {
        proxy_pass http://127.0.0.1:8080;   # same upstream as above
        proxy_http_version 1.1;
        proxy_set_header Host orderlyfoods.com;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Optional: landing page for /
    location / {
        return 302 https://orderlyfoods.com/dashboard;
    }
}
```

**Recommended ASAP setup:** keep API on Samurai VPS (`46.202.179.234:8080`), and on Orderly VPS proxy to that IP (firewall: allow only Orderly VPS → 8080, or proxy via HTTPS with Host header).

If proxying cross-VPS to port 8080 is blocked, proxy to `https://samurairesto.com` with:

```nginx
proxy_pass https://samurairesto.com;
proxy_ssl_server_name on;
proxy_set_header Host orderlyfoods.com;
```

That only works if Samurai nginx forwards `/dashboard` and `/api/dashboard/` to Express **with the incoming Host** (or you set Host in the Samurai nginx location). Simpler: open `8080` from Orderly VPS IP only.

## Samurai VPS env

```js
ORDERLY_DASHBOARD_HOSTS: "orderlyfoods.com,www.orderlyfoods.com",
```

(Do **not** include `samurairesto.com`.)

## Verify

```bash
# Must 404
curl -sS -o /dev/null -w "%{http_code}\n" https://samurairesto.com/dashboard
curl -sS -w "\n%{http_code}\n" https://samurairesto.com/api/dashboard/me

# Must 200 / 401 (login gate)
curl -sS -o /dev/null -w "%{http_code}\n" https://orderlyfoods.com/dashboard
curl -sS -w "\n%{http_code}\n" https://orderlyfoods.com/api/dashboard/me
```
