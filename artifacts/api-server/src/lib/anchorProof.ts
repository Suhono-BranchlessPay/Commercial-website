/**
 * Write BP anchor proof onto orders + sync missing proofs from BP.
 */

import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import {
  fetchAnchorProof,
  mapBpStatus,
} from "../integrations/branchlesspay";
import { defaultExplorerUrl } from "./bridgeWebhook";
import { logger } from "./logger";

export type ApplyAnchorProofInput = {
  referenceId: string;
  status?: string | null;
  txHash?: string | null;
  explorerUrl?: string | null;
  anchorId?: string | null;
  contentHash?: string | null;
};

export async function applyAnchorProof(
  input: ApplyAnchorProofInput,
): Promise<{ ok: boolean; orderId?: string; error?: string }> {
  const referenceId = input.referenceId.trim();
  if (!referenceId) {
    return { ok: false, error: "missing reference_id" };
  }

  let order =
    (
      await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, referenceId))
        .limit(1)
    )[0] ?? undefined;

  // Dashboard shows 8-char prefixes — accept only when uniquely matched.
  if (!order && referenceId.length >= 8 && referenceId.length < 36) {
    const matches = await db
      .select()
      .from(ordersTable)
      .where(sql`${ordersTable.id} LIKE ${`${referenceId}%`}`)
      .limit(2);
    if (matches.length === 1) order = matches[0];
  }

  if (!order) {
    return { ok: false, error: "order not found" };
  }

  const txHash =
    (input.txHash && String(input.txHash).trim()) || order.chainTxHash || null;
  const status =
    mapBpStatus(input.status, Boolean(txHash)) ||
    (txHash ? "anchored" : order.bpAnchorStatus || "pending");
  const explorerUrl =
    (input.explorerUrl && String(input.explorerUrl).trim()) ||
    defaultExplorerUrl(txHash) ||
    order.bpExplorerUrl ||
    null;

  await db
    .update(ordersTable)
    .set({
      bpAnchorStatus: status,
      chainTxHash: txHash,
      bpExplorerUrl: explorerUrl,
      ...(input.anchorId
        ? { bpAnchorId: String(input.anchorId).trim() }
        : {}),
      ...(input.contentHash
        ? { bpContentHash: String(input.contentHash).trim() }
        : {}),
    })
    .where(eq(ordersTable.id, order.id));

  return { ok: true, orderId: order.id };
}

/**
 * Pull latest proof from BP for one order (by anchor_id and/or reference_id).
 */
export async function syncOrderAnchorFromBp(order: {
  id: string;
  tenantId: string;
  bpAnchorId: string | null;
  squarePaymentId: string | null;
  chainTxHash: string | null;
}): Promise<{ updated: boolean; txHash: string | null; error?: string }> {
  if (order.chainTxHash) {
    return { updated: false, txHash: order.chainTxHash };
  }

  const slug = order.tenantId; // tenant id === slug in this platform
  const candidates = [
    order.bpAnchorId,
    order.id,
    order.squarePaymentId,
  ].filter((v): v is string => Boolean(v && String(v).trim()));

  let lastError: string | undefined;
  for (const key of candidates) {
    const proof = await fetchAnchorProof({
      tenantSlug: slug,
      anchorId: order.bpAnchorId === key ? key : undefined,
      referenceId: order.bpAnchorId === key ? undefined : key,
    });
    if (!proof.ok) {
      lastError = proof.error;
      continue;
    }
    if (!proof.txHash && !(proof.status && /anchor|confirm|complet/i.test(proof.status))) {
      // Still queued — keep pending, store status/id if useful
      if (proof.status || proof.anchorId) {
        await applyAnchorProof({
          referenceId: order.id,
          status: proof.status ?? "pending",
          txHash: proof.txHash,
          explorerUrl: proof.explorerUrl,
          anchorId: proof.anchorId,
          contentHash: proof.contentHash,
        });
      }
      continue;
    }
    const applied = await applyAnchorProof({
      referenceId: order.id,
      status: proof.status ?? (proof.txHash ? "anchored" : "pending"),
      txHash: proof.txHash,
      explorerUrl: proof.explorerUrl,
      anchorId: proof.anchorId,
      contentHash: proof.contentHash,
    });
    if (applied.ok && proof.txHash) {
      return { updated: true, txHash: proof.txHash };
    }
  }

  return { updated: false, txHash: null, error: lastError };
}

/**
 * Sync paid orders missing chain_tx_hash (pending, queued, or blank legacy).
 */
export async function syncMissingAnchorProofs(input: {
  tenantId: string | null;
  limit?: number;
}): Promise<{
  scanned: number;
  updated: number;
  errors: number;
}> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const parts = [
    eq(ordersTable.paymentStatus, "paid"),
    or(isNull(ordersTable.chainTxHash), eq(ordersTable.chainTxHash, "")),
  ];
  if (input.tenantId) {
    parts.push(eq(ordersTable.tenantId, input.tenantId));
  }

  const orders = await db
    .select({
      id: ordersTable.id,
      tenantId: ordersTable.tenantId,
      bpAnchorId: ordersTable.bpAnchorId,
      squarePaymentId: ordersTable.squarePaymentId,
      chainTxHash: ordersTable.chainTxHash,
    })
    .from(ordersTable)
    .where(and(...parts))
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit);

  let updated = 0;
  let errors = 0;
  for (const order of orders) {
    try {
      const result = await syncOrderAnchorFromBp(order);
      if (result.updated) updated += 1;
      else if (result.error) errors += 1;
    } catch (err) {
      errors += 1;
      logger.warn({ err, orderId: order.id }, "Anchor sync failed for order");
    }
  }

  return { scanned: orders.length, updated, errors };
}

export function parseAnchorCallbackBody(
  body: Record<string, unknown>,
): ApplyAnchorProofInput | null {
  const nested =
    body.data && typeof body.data === "object" && !Array.isArray(body.data)
      ? (body.data as Record<string, unknown>)
      : null;
  const payload = nested ?? body;

  const referenceId = String(
    payload.reference_id ??
      payload.referenceId ??
      payload.order_id ??
      payload.orderId ??
      body.reference_id ??
      body.order_id ??
      "",
  ).trim();
  if (!referenceId) return null;

  const txRaw =
    payload.tx_hash ??
    payload.chain_tx_hash ??
    payload.txHash ??
    payload.chainTxHash;
  const txHash =
    typeof txRaw === "string" && txRaw.trim() && txRaw !== "pending"
      ? txRaw.trim()
      : null;

  const statusRaw = payload.status ?? payload.anchor_status ?? payload.bp_status;
  const explorerRaw =
    payload.explorer_url ?? payload.explorerUrl ?? payload.bp_explorer_url;
  const anchorRaw = payload.anchor_id ?? payload.anchorId ?? payload.id;
  const hashRaw = payload.content_hash ?? payload.contentHash;

  return {
    referenceId,
    status: typeof statusRaw === "string" ? statusRaw : null,
    txHash,
    explorerUrl: typeof explorerRaw === "string" ? explorerRaw : null,
    anchorId: typeof anchorRaw === "string" ? anchorRaw : null,
    contentHash: typeof hashRaw === "string" ? hashRaw : null,
  };
}
