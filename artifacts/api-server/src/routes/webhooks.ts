import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  canonicalDoordashStatus,
  mapDoordashEventToOrderStatus,
} from "../integrations/doordash";
import {
  isSquareConfigured,
  syncSquareOrderFromOwnerStatus,
} from "../integrations/square";

const router = Router();

const WEBHOOK_USER = process.env.DOORDASH_WEBHOOK_BASIC_USER;
const WEBHOOK_PASS = process.env.DOORDASH_WEBHOOK_BASIC_PASSWORD;

function verifyWebhookAuth(authHeader: string | undefined): boolean {
  // If creds not configured, accept (dev) — production should set both
  if (!WEBHOOK_USER || !WEBHOOK_PASS) return true;
  if (!authHeader?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
  const [user, pass] = decoded.split(":");
  return user === WEBHOOK_USER && pass === WEBHOOK_PASS;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/**
 * DoorDash Drive webhooks — keep orders.doordash_status + orders.status in sync.
 * Docs use event_name; some payloads use event_type. Nested `delivery` is supported.
 *
 * Configure in DoorDash Developer portal:
 *   POST https://samurairesto.com/api/webhooks/doordash
 */
router.post("/webhooks/doordash", async (req, res): Promise<void> => {
  if (!verifyWebhookAuth(req.headers.authorization)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const delivery = asRecord(body.delivery) ?? asRecord(body.data) ?? {};

  const eventRaw =
    pickString(
      body.event_name,
      body.event_type,
      body.event,
      body.type,
      delivery.event_name,
      delivery.event_type,
    ) ?? "";

  const externalDeliveryId =
    pickString(
      body.external_delivery_id,
      body.externalDeliveryId,
      delivery.external_delivery_id,
      delivery.externalDeliveryId,
      body.delivery_id,
      delivery.id,
    ) ?? "";

  const trackingUrl = pickString(
    body.tracking_url,
    body.trackingUrl,
    delivery.tracking_url,
    delivery.trackingUrl,
  );

  const cancelReason = pickString(
    body.cancellation_reason,
    body.cancellation_reason_message,
    delivery.cancellation_reason,
    delivery.cancellation_reason_message,
  );

  const estimatedDropoff = pickString(
    body.dropoff_time_estimated,
    delivery.dropoff_time_estimated,
  );

  if (!externalDeliveryId && !trackingUrl) {
    req.log.warn({ body }, "DoorDash webhook missing delivery id");
    res.status(400).json({ error: "missing external_delivery_id" });
    return;
  }

  const eventType = canonicalDoordashStatus(eventRaw);

  try {
    let order =
      (externalDeliveryId
        ? (
            await db
              .select()
              .from(ordersTable)
              .where(
                eq(ordersTable.doordashExternalDeliveryId, externalDeliveryId),
              )
              .limit(1)
          )[0]
        : undefined) ?? undefined;

    // Fallback: match tracking URL (urlCode=...) when id field differs
    if (!order && trackingUrl) {
      const rows = await db
        .select()
        .from(ordersTable)
        .where(
          sql`${ordersTable.doordashTrackingUrl} IS NOT NULL AND ${ordersTable.doordashTrackingUrl} LIKE ${"%" + trackingUrl.slice(-36) + "%"}`,
        )
        .limit(1);
      order = rows[0];
    }

    if (!order && trackingUrl) {
      const rows = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.doordashTrackingUrl, trackingUrl))
        .limit(1);
      order = rows[0];
    }

    if (!order) {
      req.log.warn(
        { externalDeliveryId, eventType, trackingUrl },
        "DoorDash webhook: order not found",
      );
      // 200 so DoorDash does not retry forever for unknown ids
      res.status(200).json({ ok: true, note: "order not found" });
      return;
    }

    const mappedStatus = mapDoordashEventToOrderStatus(eventRaw || eventType);
    const updates: Partial<typeof ordersTable.$inferInsert> = {
      doordashStatus: eventType || order.doordashStatus || "unknown",
      ...(trackingUrl ? { doordashTrackingUrl: trackingUrl } : {}),
      ...(estimatedDropoff ? { estimatedDropoffTime: estimatedDropoff } : {}),
      ...(mappedStatus ? { status: mappedStatus } : {}),
    };

    // Ensure external id is stored if webhook carried the canonical id
    if (
      externalDeliveryId &&
      order.doordashExternalDeliveryId !== externalDeliveryId
    ) {
      updates.doordashExternalDeliveryId = externalDeliveryId;
    }

    await db
      .update(ordersTable)
      .set(updates)
      .where(eq(ordersTable.id, order.id));

    req.log.info(
      {
        orderId: order.id,
        externalDeliveryId:
          externalDeliveryId || order.doordashExternalDeliveryId,
        eventType,
        mappedStatus,
        cancelReason: cancelReason ?? null,
      },
      "DoorDash webhook applied",
    );

    if (
      mappedStatus === "completed" &&
      order.squareOrderId &&
      isSquareConfigured(order.tenantId)
    ) {
      try {
        await syncSquareOrderFromOwnerStatus(
          order.squareOrderId,
          "completed",
          order.tenantId,
        );
      } catch (err) {
        req.log.error(
          { err },
          "Square complete sync from DoorDash webhook failed",
        );
      }
    }

    res.status(200).json({
      ok: true,
      orderId: order.id,
      doordashStatus: eventType,
      orderStatus: mappedStatus ?? order.status,
    });
  } catch (err) {
    req.log.error({ err, externalDeliveryId, eventType }, "DoorDash webhook failed");
    res.status(500).json({ error: "webhook processing failed" });
  }
});

/** Quick probe — DoorDash portal / ops can hit this to verify routing. */
router.get("/webhooks/doordash", (_req, res): void => {
  res.json({
    ok: true,
    endpoint: "POST /api/webhooks/doordash",
    auth: WEBHOOK_USER && WEBHOOK_PASS ? "basic" : "open",
  });
});

export default router;
