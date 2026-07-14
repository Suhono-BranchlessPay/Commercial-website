import { createHmac, timingSafeEqual } from "crypto";
import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, squareOauthConnectionsTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  mapDoordashEventToOrderStatus,
} from "../integrations/doordash";
import {
  isSquareConfigured,
  syncSquareOrderFromOwnerStatus,
  getSquareCredsForTenantSlug,
} from "../integrations/square";
import {
  applyAnchorProof,
  parseAnchorCallbackBody,
} from "../lib/anchorProof";
import {
  noteAnchorWebhookFailure,
  noteAnchorWebhookSuccess,
} from "../lib/anchorAlerts";
import { getTenantSlugById, syncSquareMenuForTenant } from "../lib/squareMenuSync";
import { logger } from "../lib/logger";

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

function verifyBpWebhookAuth(req: {
  headers: import("express").Request["headers"];
}): boolean {
  const secret = process.env.BRANCHLESSPAY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // Dev/sandbox only — production must set BRANCHLESSPAY_WEBHOOK_SECRET.
    return process.env.NODE_ENV !== "production";
  }

  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    if (auth.slice(7).trim() === secret) return true;
  }

  const headerCandidates = [
    req.headers["x-branchlesspay-secret"],
    req.headers["x-webhook-secret"],
    req.headers["x-bp-webhook-secret"],
  ];
  for (const h of headerCandidates) {
    if (typeof h === "string" && h.trim() === secret) return true;
  }

  return false;
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
    (await isSquareConfigured(order.tenantId))
  ) {
    try {
      await syncSquareOrderFromOwnerStatus(
        order.squareOrderId,
        "completed",
        order.tenantId,
      );
    } catch (err) {
      req.log.error({ err }, "Square complete sync from DoorDash webhook failed");
    }
  }

  res.status(200).json({ ok: true });
});

/**
 * BP → Orderly proof-back (pos-native + queued platform anchors).
 * Spec: BRANCHLESSPAY_WEBHOOK_SECRET; reference_id = Orderly order UUID.
 */
async function handleAnchorCallback(
  req: import("express").Request,
  res: import("express").Response,
): Promise<void> {
  if (!verifyBpWebhookAuth(req)) {
    noteAnchorWebhookFailure();
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {};
  const parsed = parseAnchorCallbackBody(body);
  if (!parsed) {
    noteAnchorWebhookFailure();
    res.status(400).json({ error: "missing reference_id" });
    return;
  }

  const result = await applyAnchorProof(parsed);
  if (!result.ok) {
    // 200 for unknown order — BP retries are noisy; log and ack.
    if (result.error === "order not found") {
      req.log.warn(
        { referenceId: parsed.referenceId },
        "Anchor callback: order not found",
      );
      res.status(200).json({ ok: true, note: "order not found" });
      return;
    }
    noteAnchorWebhookFailure();
    res.status(400).json({ error: result.error ?? "apply failed" });
    return;
  }

  noteAnchorWebhookSuccess();
  req.log.info(
    {
      orderId: result.orderId,
      status: parsed.status,
      txHash: parsed.txHash,
    },
    "Anchor proof applied from BP callback",
  );
  res.status(200).json({ ok: true, order_id: result.orderId });
}

router.post("/anchor-callback", async (req, res): Promise<void> => {
  await handleAnchorCallback(req, res);
});

router.post("/webhooks/branchlesspay", async (req, res): Promise<void> => {
  await handleAnchorCallback(req, res);
});

router.post("/webhooks/anchor-callback", async (req, res): Promise<void> => {
  await handleAnchorCallback(req, res);
});

/**
 * Blok A — Square catalog/inventory webhook. SQUARE remains the source of
 * truth; this endpoint only ever triggers a *read* sync (syncSquareMenuForTenant)
 * into Orderly's menu tables — it never writes back to Square and never
 * touches order/payment paths. Idempotent (upserts) — safe for Square's retries.
 *
 * Signature verification (HMAC-SHA256 of "<notification_url><raw_body>",
 * base64) only runs when SQUARE_WEBHOOK_SIGNATURE_KEY is set — see
 * app.ts for the raw-body capture this depends on and
 * docs/BLOK_A_SQUARE_MENU_SYNC.md for setup.
 */
function verifySquareWebhookSignature(
  req: import("express").Request,
  rawBody: Buffer,
  signatureKey: string,
): boolean {
  const provided = req.headers["x-square-hmacsha256-signature"];
  if (typeof provided !== "string" || !provided) return false;

  const notificationUrl =
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL?.trim() ||
    `${req.protocol}://${req.get("host") ?? ""}${req.originalUrl}`;

  const expected = createHmac("sha256", signatureKey)
    .update(notificationUrl + rawBody.toString("utf8"))
    .digest("base64");

  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(provided, "utf8");
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

function extractLocationIdFromSquarePayload(
  payload: Record<string, unknown>,
): string | undefined {
  const data = payload.data as Record<string, unknown> | undefined;
  const object = data?.object as Record<string, unknown> | undefined;
  if (typeof object?.location_id === "string") return object.location_id;
  const counts = object?.inventory_counts as Array<Record<string, unknown>> | undefined;
  const fromCounts = counts?.find((c) => typeof c.location_id === "string")?.location_id;
  return typeof fromCounts === "string" ? fromCounts : undefined;
}

async function resolveTenantForSquareWebhook(
  payload: Record<string, unknown>,
): Promise<{ tenantId: string; slug: string } | null> {
  const merchantId = typeof payload.merchant_id === "string" ? payload.merchant_id : undefined;

  if (merchantId) {
    const rows = await db
      .select()
      .from(squareOauthConnectionsTable)
      .where(
        eq(squareOauthConnectionsTable.merchantId, merchantId),
      );
    const withTenant = rows.find((r) => Boolean(r.tenantId));
    if (withTenant?.tenantId) {
      const slug = await getTenantSlugById(withTenant.tenantId);
      if (slug) return { tenantId: withTenant.tenantId, slug };
    }
  }

  // Fallback: match by location_id against every tenant's resolved Square
  // creds — this is how env-token tenants (e.g. Samurai, no merchant_id on
  // file) get matched, since inventory.count.updated carries a location_id.
  const locationId = extractLocationIdFromSquarePayload(payload);
  if (locationId) {
    const tenants = await db
      .select({ id: tenantsTable.id, slug: tenantsTable.slug })
      .from(tenantsTable);
    for (const t of tenants) {
      try {
        const creds = await getSquareCredsForTenantSlug(t.slug);
        if (creds?.locationId === locationId) return { tenantId: t.id, slug: t.slug };
      } catch {
        // best-effort — keep scanning other tenants
      }
    }
  }

  return null;
}

router.post("/webhooks/square", async (req, res): Promise<void> => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);

  let payload: Record<string, unknown>;
  try {
    payload = rawBody.length ? (JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>) : {};
  } catch {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim();
  if (signatureKey) {
    const valid = verifySquareWebhookSignature(req, rawBody, signatureKey);
    if (!valid) {
      logger.warn("Square webhook: signature verification failed");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  }

  const eventType = typeof payload.type === "string" ? payload.type : "";
  const relevant =
    eventType.startsWith("catalog.") || eventType.startsWith("inventory.");

  // Always ack 200 quickly (Square retries aggressively on non-2xx) — the
  // actual catalog pull happens fire-and-forget below.
  res.status(200).json({ ok: true, relevant });

  if (!relevant) return;

  try {
    const target = await resolveTenantForSquareWebhook(payload);
    if (!target) {
      logger.warn({ eventType }, "Square webhook: no matching tenant for this event");
      return;
    }
    void syncSquareMenuForTenant({
      tenantId: target.tenantId,
      slug: target.slug,
      reason: `square_webhook:${eventType}`,
    }).catch((err) => {
      logger.error({ err, tenantId: target.tenantId }, "Square webhook-triggered sync failed");
    });
  } catch (err) {
    logger.error({ err, eventType }, "Square webhook handling failed");
  }
});

export default router;
