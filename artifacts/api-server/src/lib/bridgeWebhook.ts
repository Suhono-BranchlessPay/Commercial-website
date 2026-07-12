import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { db } from "@workspace/db";
import { bridgeWebhookDeliveriesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "./logger";

const EVENT_ORDER_COMPLETED = "order.completed.v1";

export type OrderCompletedPayload = {
  event: typeof EVENT_ORDER_COMPLETED;
  idempotency_key: string;
  tenant_id: string;
  order: {
    id: string;
    order_type: string;
    payment_status: string;
    status: string;
    money: {
      subtotal_cents: number;
      tax_cents: number;
      tip_cents: number;
      platform_fee_cents: number;
      delivery_fee_cents: number;
      processing_fee_cents: number;
      discount_cents: number;
      total_cents: number;
    };
    customer: {
      id: string | null;
      name: string;
      phone: string;
      email: string | null;
    };
    square_order_id: string | null;
    square_payment_id: string | null;
    created_at: string | null;
  };
  /** Orderly differentiator — always present keys (nullable values until anchored). */
  anchor: {
    bp_anchor_id: string | null;
    bp_anchor_status: string | null;
    bp_content_hash: string | null;
    chain_tx_hash: string | null;
    explorer_url: string | null;
  };
};

function webhookUrl(): string | null {
  const url = process.env.ORDERLY_BRIDGE_WEBHOOK_URL?.trim();
  return url || null;
}

function webhookSecret(): string | null {
  const s = process.env.ORDERLY_BRIDGE_WEBHOOK_SECRET?.trim();
  return s || null;
}

export function signBridgePayload(body: string, secret: string, timestamp: string): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

export function verifyBridgeSignature(
  body: string,
  secret: string,
  timestamp: string,
  signature: string,
): boolean {
  const expected = signBridgePayload(body, secret, timestamp);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Enqueue + best-effort deliver order.completed.v1.
 * Idempotent on (tenant_id, idempotency_key). Never throws to caller.
 */
export async function enqueueOrderCompletedWebhook(
  payload: OrderCompletedPayload,
): Promise<void> {
  const url = webhookUrl();
  const secret = webhookSecret();
  if (!url || !secret) {
    logger.debug("Bridge webhook skipped — URL/secret not configured");
    return;
  }

  const idempotencyKey = payload.idempotency_key;
  const existing = await db
    .select()
    .from(bridgeWebhookDeliveriesTable)
    .where(
      and(
        eq(bridgeWebhookDeliveriesTable.tenantId, payload.tenant_id),
        eq(bridgeWebhookDeliveriesTable.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);

  if (existing[0]?.status === "delivered") {
    return;
  }

  let deliveryId = existing[0]?.id;
  if (!deliveryId) {
    deliveryId = randomUUID();
    try {
      await db.insert(bridgeWebhookDeliveriesTable).values({
        id: deliveryId,
        tenantId: payload.tenant_id,
        eventType: EVENT_ORDER_COMPLETED,
        idempotencyKey,
        orderId: payload.order.id,
        payload: payload as unknown as Record<string, unknown>,
        status: "pending",
        attempts: 0,
      });
    } catch {
      // Unique race — another worker inserted; re-read
      const again = await db
        .select()
        .from(bridgeWebhookDeliveriesTable)
        .where(
          and(
            eq(bridgeWebhookDeliveriesTable.tenantId, payload.tenant_id),
            eq(bridgeWebhookDeliveriesTable.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);
      if (again[0]?.status === "delivered") return;
      deliveryId = again[0]?.id ?? deliveryId;
    }
  }

  await deliverWebhookAttempt(deliveryId, url, secret, payload);
}

async function deliverWebhookAttempt(
  deliveryId: string,
  url: string,
  secret: string,
  payload: OrderCompletedPayload,
): Promise<void> {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signBridgePayload(body, secret, timestamp);

  const row = await db
    .select()
    .from(bridgeWebhookDeliveriesTable)
    .where(eq(bridgeWebhookDeliveriesTable.id, deliveryId))
    .limit(1);
  const attempts = (row[0]?.attempts ?? 0) + 1;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Orderly-Timestamp": timestamp,
        "X-Orderly-Signature": signature,
        "X-Orderly-Event": EVENT_ORDER_COMPLETED,
        "Idempotency-Key": payload.idempotency_key,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    await db
      .update(bridgeWebhookDeliveriesTable)
      .set({
        status: "delivered",
        attempts,
        deliveredAt: new Date(),
        lastError: null,
      })
      .where(eq(bridgeWebhookDeliveriesTable.id, deliveryId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "webhook failed";
    logger.error({ err, deliveryId }, "Bridge webhook delivery failed");
    await db
      .update(bridgeWebhookDeliveriesTable)
      .set({
        status: "failed",
        attempts,
        lastError: message.slice(0, 500),
      })
      .where(eq(bridgeWebhookDeliveriesTable.id, deliveryId));
  }
}

export function defaultExplorerUrl(chainTxHash: string | null | undefined): string | null {
  if (!chainTxHash) return null;
  const base =
    process.env.ORDERLY_CHAIN_EXPLORER_TX_BASE?.trim() ||
    "https://testnet.monadvision.com/tx/";
  return `${base.replace(/\/?$/, "/")}${chainTxHash}`;
}
