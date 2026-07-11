# Anchor mode (BP Audit Shield) — VPS notes

## Modes
| Mode | Who anchors | Tenants |
|------|-------------|---------|
| `platform` (default) | Orderly website (`TENANT_{SLUG}_BRANCHLESSPAY_LICENSE_KEY`) | Kirin + new |
| `pos-native` | POS (Square) already connected to BP | **Samurai** |

## Samurai (`pos-native`)
- Do **not** set website `BRANCHLESSPAY_LICENSE_KEY` for anchoring (optional only for pull fallback).
- Set webhook auth so BP can POST proofs:

```js
BRANCHLESSPAY_WEBHOOK_SECRET: "shared-secret-with-bp",
```

BP should call:
`POST https://samurairesto.com/api/anchor-callback`
Headers: `Authorization: Bearer <BRANCHLESSPAY_WEBHOOK_SECRET>`
Body: `{ "anchor_id", "content_hash", "chain_tx_hash", "status", "monad_explorer_url", "reference_id" }`
`reference_id` = Square payment id (same as receipt / `square_payment_id`).

## Kirin (`platform`)
```js
TENANT_KIRIN_BRANCHLESSPAY_LICENSE_KEY: "bp_live_or_test_...",
```

## Migrate
```bash
cd /var/www/samurai-resto
# from lib/db with DATABASE_URL:
node -e "
const {Client}=require('pg');
const env=require('../../ecosystem.config.cjs').apps[0].env;
const fs=require('fs');
(async()=>{
  const c=new Client({connectionString:env.DATABASE_URL});
  await c.connect();
  await c.query(fs.readFileSync('../../scripts/migrate-anchor-mode.sql','utf8'));
  console.log('migrate-anchor-mode OK');
  await c.end();
})().catch(e=>{console.error(e);process.exit(1)});
"
```
