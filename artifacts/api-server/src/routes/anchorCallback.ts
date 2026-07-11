import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { and, eq, or } from "drizzle-orm";
import {
  explorerUrlForTx,
  parseAnchorProofPayload,
  verifyBpWebhookRequest,
} from "../integrations/branchlesspay";

const router = Router();

/**
 * BP Audit Shield → Orderly proof webhook (pos-native tenants).
 * Matches Square payment reference_id to orders.square_reference_id / square_payment_id.
 * Idempotent: re-delivery with same proof is a no-op success.
 *
 * Auth (any one):
 *   Authorization: Bearer <BRANCHLESSPAY_WEBHOOK_SECRET>
 *   X-BP-Webhook-Secret: <secret>
 *   X-BranchlessPay-Signature: sha256=<hmac>  (requires raw body capture)
 */
router.post("/anchor-callback", async (req, res): Promise<void> => {
  const rawBody =
    typeof (req as { rawBody?: string }).rawBody === "string"
      ? (req as { rawBody?: string }).rawBody
      : undefined;

  const authorized = verifyBpWebhookRequest({
    authorization: req.headers.authorization,
    signatureHeader:
      (typeof req.headers["x-branchlesspay-signature"] === "string"
        ? req.headers["x-branchlesspay-signature"]
        : undefined) ||
      (typeof req.headers["x-bp-signature"] === "string"
        ? req.headers["x-bp-signature"]
        : undefined),
    webhookSecretHeader:
      typeof req.headers["x-bp-webhook-secret"] === "string"
        ? req.headers["x-bp-webhook-secret"]
        : undefined,
    rawBody,
    tenantSlug: req.tenant?.slug,
  });

  if (!authorized) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const proof = parseAnchorProofPayload(body);
  if (!proof?.referenceId) {
    res.status(400).json({ error: "reference_id required" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(ordersTable)
      .where(
        or(
          eq(ordersTable.squareReferenceId, proof.referenceId),
          eq(ordersTable.squarePaymentId, proof.referenceId),
          eq(ordersTable.squareOrderId, proof.referenceId),
          eq(ordersTable.id, proof.referenceId),
        ),
      )
      .limit(5);

    // Prefer tenant match when Host resolved a tenant
    const tenantId = req.tenant?.id;
    const order =
      (tenantId
        ? rows.find((r) => r.tenantId === tenantId)
        : undefined) ?? rows[0];

    if (!order) {
      req.log.warn(
        { referenceId: proof.referenceId },
        "BP anchor-callback: no matching order",
      );
      res.status(404).json({ error: "Order not found for reference_id" });
      return;
    }

    const sameProof =
      order.bpAnchorId &&
      proof.anchorId &&
      order.bpAnchorId === proof.anchorId &&
      (order.bpTxHash == null ||
        proof.txHash == null ||
        order.bpTxHash === proof.txHash);

    if (sameProof && order.bpAnchorStatus === "anchored") {
      res.json({
        ok: true,
        idempotent: true,
        orderId: order.id,
        bpAnchorId: order.bpAnchorId,
      });
      return;
    }

    const nextStatus =
      proof.status === "anchored" || proof.txHash
        ? "anchored"
        : proof.status || "pending";

    await db
      .update(ordersTable)
      .set({
        bpAnchorId: proof.anchorId ?? order.bpAnchorId,
        bpContentHash: proof.contentHash ?? order.bpContentHash,
        bpAnchorStatus: nextStatus,
        bpTxHash: proof.txHash ?? order.bpTxHash,
        bpExplorerUrl:
          proof.explorerUrl ??
          explorerUrlForTx(proof.txHash) ??
          order.bpExplorerUrl,
        squareReferenceId: order.squareReferenceId ?? proof.referenceId,
      })
      .where(
        and(eq(ordersTable.id, order.id), eq(ordersTable.tenantId, order.tenantId)),
      );

    req.log.info(
      {
        orderId: order.id,
        referenceId: proof.referenceId,
        anchorId: proof.anchorId,
        status: nextStatus,
      },
      "BP anchor proof stored from callback",
    );

    res.json({
      ok: true,
      orderId: order.id,
      bpAnchorId: proof.anchorId ?? order.bpAnchorId,
      bpAnchorStatus: nextStatus,
    });
  } catch (err) {
    req.log.error({ err }, "BP anchor-callback failed");
    res.status(500).json({ error: "Failed to store anchor proof" });
  }
});

export default router;
