# Spec — Anchor Mode Per Tenant (Orderly)

Architecture rule. Do not invent a new BP API key per restaurant.

## Model (agreed with BranchlessPay)

- **1 platform API key** for all Orderly restaurants (`BRANCHLESSPAY_LICENSE_KEY`)
- **No new API key** when adding a restaurant
- Restaurants are rows in **`tenants`** (not a separate `orderly_tenants` table)
- Each anchor request sends `merchant_id: "orderly"` + `metadata.tenant_id`

```
Authorization: Bearer <BRANCHLESSPAY_LICENSE_KEY>
POST /api/v1/anchor
{
  "reference_id": "<orderly order uuid>",
  "amount": 45.50,
  "currency": "USD",
  "merchant_id": "orderly",
  "metadata": {
    "tenant_id": "kirin",
    "restaurant_name": "Kirin Hibachi Express",
    "source": "website"
  }
}
```

## Add a new restaurant

1. Insert / upsert into `tenants` (`id`/`slug` = tenant_id, e.g. `shogun-henderson`)
2. Set `anchor_mode`:
   - `platform` — website anchors with platform key (default)
   - `pos-native` — POS already anchors (Samurai only today)
3. Domain + Square/DoorDash secrets as needed (env / secret manager — never commit)
4. **Do not** create a new BP API key

## VPS env (`ecosystem.config.cjs`) — placeholders only

```js
BRANCHLESSPAY_LICENSE_KEY: "<platform-key>",   // master — all platform tenants
BRANCHLESSPAY_MERCHANT_ID: "orderly",          // optional, default orderly
BRANCHLESSPAY_WEBHOOK_SECRET: "<webhook-secret>", // for pos-native proof callback
```

Samurai stays `anchor_mode=pos-native` (Square↔BP already anchors; website stores proof only).

## Modes

| Mode | Who anchors | Tenants |
|------|-------------|---------|
| `platform` (default) | Orderly website + platform key | Kirin + new restos |
| `pos-native` | POS (Square) already on BP | Samurai |

## Migrate

See `scripts/migrate-anchor-mode.sql` and runbook in `deploy/ANCHOR_MODE.md`.

## Agent / automation guardrails

- Never change Samurai to `platform` without an explicit product decision.
- Never put BP / Square / DoorDash secrets in the app bundle, frontend, or git.
- Mobile and web must honor the same `anchor_mode` per tenant.
