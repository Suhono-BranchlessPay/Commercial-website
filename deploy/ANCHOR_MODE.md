# Anchor mode + proof-back (Orderly)

## Modes

| Mode | Who anchors | Tenants |
|------|-------------|---------|
| `platform` (default) | Orderly `POST /api/v1/anchor` | Kirin, Linton, new restos |
| `pos-native` | Square ↔ BP | **Samurai only** (do not flip without product decision) |

## Migration

```bash
psql "$DATABASE_URL" -f scripts/migrate-anchor-mode.sql
```

## Proof-back (required for dashboard Anchor %)

Samurai anchors on-chain via Square, but Orderly must **receive** `chain_tx_hash`:

1. **Webhook (preferred):** BP → `POST /api/anchor-callback`  
   - Auth: `Authorization: Bearer <BRANCHLESSPAY_WEBHOOK_SECRET>`  
     or header `X-BranchlessPay-Secret: <secret>`  
   - Body (flexible): `reference_id` (Orderly order UUID), `tx_hash` / `chain_tx_hash`, `status`, optional `explorer_url`, `anchor_id`
2. **Poll fallback:** dashboard **Sync anchors** or `POST /api/dashboard/anchors/sync`  
   - Uses `GET /api/v1/anchor/{anchor_id}` when we have `bp_anchor_id`  
   - Else `GET /api/v1/anchor?reference_id=<order_id>` (and a few aliases)

## Env

```
BRANCHLESSPAY_LICENSE_KEY=<platform key>
BRANCHLESSPAY_WEBHOOK_SECRET=<shared secret with BP>
BRANCHLESSPAY_MERCHANT_ID=orderly
```

Alias also registered: `POST /api/webhooks/branchlesspay`
