import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
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
  if (!WEBHOOK_USER || !WEBHOOK_PASS) return true;
  if (!authHeader?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
  const [user, pass] = decoded.split(":");
  return user === WEBHOOK_USER && pass === WEBHOOK_PASS;
}

router.post("/webhooks/doordash", async (req, res): Promise<void> => {
  if (!verifyWebhookAuth(req.headers.authorization)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const eventRaw =
    body.event_name ?? body.event ?? body.type ?? "";
  const eventType = String(eventRaw).trim().toLowerCase().replace(/_/g, ".");
  const externalDeliveryId = String(
    body.external_delivery_id ?? body.externalDeliveryId ?? "",
  );

  if (!externalDeliveryId) {
    res.status(400).json({ error: "missing external_delivery_id" });
    return;
  }

  const trackingUrl =
    typeof body.tracking_url === "string" ? body.tracking_url : undefined;

  const rows = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.doordashExternalDeliveryId, externalDeliveryId));

  const order = rows[0];
  if (!order) {
    res.status(200).json({ ok: true, note: "order not found" });
    return;
  }

  const mappedStatus = mapDoordashEventToOrderStatus(eventType);
  const updates: Partial<typeof ordersTable.$inferInsert> = {
    doordashStatus: eventType,
    ...(trackingUrl ? { doordashTrackingUrl: trackingUrl } : {}),
    ...(mappedStatus ? { status: mappedStatus } : {}),
  };

  await db
    .update(ordersTable)
    .set(updates)
    .where(eq(ordersTable.id, order.id));

  if (
    mappedStatus === "completed" &&
    order.squareOrderId &&
    isSquareConfigured()
  ) {
    try {
      await syncSquareOrderFromOwnerStatus(order.squareOrderId, "completed");
    } catch (err) {
      req.log.error({ err }, "Square complete sync from DoorDash webhook failed");
    }
  }

  res.status(200).json({ ok: true });
});

export default router;
