/**
 * Loyalty engine — restaurant-owned points (Orderly non-custodial).
 *
 * Earn/redeem do not move money through Orderly. Checkout discounts are applied
 * as order.discountCents by the order path when a redeem is approved.
 */
import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  loyaltyAccountsTable,
  loyaltyProgramsTable,
  loyaltyTransactionsTable,
  type LoyaltyProgram,
  type LoyaltyRedemptionRules,
} from "@workspace/db";
import {
  createLoyaltyAnchor,
  isBranchlessPayConfigured,
} from "../integrations/branchlesspay";
import { logger } from "./logger";

export function isLoyaltyEngineEnabled(): boolean {
  const v = process.env.ORDERLY_LOYALTY_ENABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function accountId(tenantId: string, customerId: string): string {
  return `lya_${createHash("sha1").update(`${tenantId}:${customerId}`).digest("hex").slice(0, 20)}`;
}

export async function getLoyaltyProgram(
  tenantId: string,
): Promise<LoyaltyProgram | null> {
  const rows = await db
    .select()
    .from(loyaltyProgramsTable)
    .where(eq(loyaltyProgramsTable.tenantId, tenantId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertLoyaltyProgram(input: {
  tenantId: string;
  enabled?: boolean;
  pointsPerDollar?: number;
  redemptionRules?: LoyaltyRedemptionRules;
  expiryDays?: number | null;
  status?: string;
}): Promise<LoyaltyProgram> {
  const existing = await getLoyaltyProgram(input.tenantId);
  const now = new Date();
  if (!existing) {
    await db.insert(loyaltyProgramsTable).values({
      tenantId: input.tenantId,
      enabled: input.enabled ?? false,
      pointsPerDollar: input.pointsPerDollar ?? 1,
      redemptionRules: input.redemptionRules ?? {
        min_redeem_points: 100,
        points_per_dollar_off: 100,
        max_percent_of_subtotal: 50,
      },
      expiryDays: input.expiryDays ?? null,
      status: input.status ?? "draft",
      updatedAt: now,
      createdAt: now,
    });
  } else {
    await db
      .update(loyaltyProgramsTable)
      .set({
        enabled: input.enabled ?? existing.enabled,
        pointsPerDollar: input.pointsPerDollar ?? existing.pointsPerDollar,
        redemptionRules: input.redemptionRules ?? existing.redemptionRules,
        expiryDays:
          input.expiryDays !== undefined
            ? input.expiryDays
            : existing.expiryDays,
        status: input.status ?? existing.status,
        updatedAt: now,
      })
      .where(eq(loyaltyProgramsTable.tenantId, input.tenantId));
  }
  const row = await getLoyaltyProgram(input.tenantId);
  if (!row) throw new Error("loyalty program upsert failed");
  return row;
}

export async function getOrCreateLoyaltyAccount(input: {
  tenantId: string;
  customerId: string;
}) {
  const existing = await db
    .select()
    .from(loyaltyAccountsTable)
    .where(
      and(
        eq(loyaltyAccountsTable.tenantId, input.tenantId),
        eq(loyaltyAccountsTable.customerId, input.customerId),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0];
  const id = accountId(input.tenantId, input.customerId);
  const now = new Date();
  await db.insert(loyaltyAccountsTable).values({
    id,
    tenantId: input.tenantId,
    customerId: input.customerId,
    pointsBalance: 0,
    lifetimePoints: 0,
    updatedAt: now,
    createdAt: now,
  });
  const rows = await db
    .select()
    .from(loyaltyAccountsTable)
    .where(eq(loyaltyAccountsTable.id, id))
    .limit(1);
  return rows[0]!;
}

/** Points from eligible subtotal cents (tip/fees excluded). */
export function computeEarnPoints(
  subtotalCents: number,
  pointsPerDollar: number,
): number {
  if (subtotalCents <= 0 || pointsPerDollar <= 0) return 0;
  const dollars = Math.floor(subtotalCents / 100);
  return dollars * pointsPerDollar;
}

export async function earnLoyaltyForPaidOrder(input: {
  tenantId: string;
  customerId: string;
  orderId: string;
  subtotalCents: number;
  tenantSlug?: string;
}): Promise<{ ok: boolean; points?: number; skipped?: string; txnId?: string }> {
  if (!isLoyaltyEngineEnabled()) {
    return { ok: false, skipped: "ORDERLY_LOYALTY_ENABLED off" };
  }
  const program = await getLoyaltyProgram(input.tenantId);
  if (!program?.enabled || program.status !== "active") {
    return { ok: false, skipped: "program not active" };
  }
  const points = computeEarnPoints(
    input.subtotalCents,
    program.pointsPerDollar,
  );
  if (points <= 0) return { ok: false, skipped: "zero points" };

  const account = await getOrCreateLoyaltyAccount({
    tenantId: input.tenantId,
    customerId: input.customerId,
  });
  const txnId = `lyt_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  try {
    await db.insert(loyaltyTransactionsTable).values({
      id: txnId,
      tenantId: input.tenantId,
      customerId: input.customerId,
      accountId: account.id,
      orderId: input.orderId,
      type: "earn",
      points,
      reason: `Earn from order ${input.orderId}`,
      bpAnchorStatus: "pending",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/loyalty_txn_earn_order|unique/i.test(msg)) {
      return { ok: true, points, skipped: "already earned", txnId };
    }
    throw err;
  }

  await db
    .update(loyaltyAccountsTable)
    .set({
      pointsBalance: sql`${loyaltyAccountsTable.pointsBalance} + ${points}`,
      lifetimePoints: sql`${loyaltyAccountsTable.lifetimePoints} + ${points}`,
      updatedAt: new Date(),
    })
    .where(eq(loyaltyAccountsTable.id, account.id));

  void maybeAnchorLoyaltyTxn({
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    txnId,
    type: "earn",
    points,
    orderId: input.orderId,
    customerId: input.customerId,
  });

  return { ok: true, points, txnId };
}

export async function redeemLoyaltyPoints(input: {
  tenantId: string;
  customerId: string;
  points: number;
  orderId?: string;
  reason?: string;
  tenantSlug?: string;
}): Promise<
  | { ok: true; txnId: string; points: number; balance: number }
  | { ok: false; error: string }
> {
  if (!isLoyaltyEngineEnabled()) {
    return { ok: false, error: "Loyalty engine disabled" };
  }
  const program = await getLoyaltyProgram(input.tenantId);
  if (!program?.enabled || program.status !== "active") {
    return { ok: false, error: "Loyalty program not active" };
  }
  const rules = program.redemptionRules ?? {};
  const min = rules.min_redeem_points ?? 100;
  if (input.points < min) {
    return { ok: false, error: `Minimum redeem is ${min} points` };
  }
  if (input.points <= 0) {
    return { ok: false, error: "Points must be positive" };
  }

  const account = await getOrCreateLoyaltyAccount({
    tenantId: input.tenantId,
    customerId: input.customerId,
  });
  if (account.pointsBalance < input.points) {
    return { ok: false, error: "Insufficient points balance" };
  }

  const txnId = `lyt_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const delta = -Math.abs(input.points);
  await db.insert(loyaltyTransactionsTable).values({
    id: txnId,
    tenantId: input.tenantId,
    customerId: input.customerId,
    accountId: account.id,
    orderId: input.orderId ?? null,
    type: "redeem",
    points: delta,
    reason: input.reason ?? "Redeem at checkout",
    bpAnchorStatus: "pending",
  });
  await db
    .update(loyaltyAccountsTable)
    .set({
      pointsBalance: sql`${loyaltyAccountsTable.pointsBalance} + ${delta}`,
      updatedAt: new Date(),
    })
    .where(eq(loyaltyAccountsTable.id, account.id));

  void maybeAnchorLoyaltyTxn({
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    txnId,
    type: "redeem",
    points: delta,
    orderId: input.orderId,
    customerId: input.customerId,
  });

  const updated = await db
    .select()
    .from(loyaltyAccountsTable)
    .where(eq(loyaltyAccountsTable.id, account.id))
    .limit(1);

  return {
    ok: true,
    txnId,
    points: delta,
    balance: updated[0]?.pointsBalance ?? account.pointsBalance + delta,
  };
}

/**
 * Import / adjust path for Owner→Orderly migration and staff corrections.
 * type=migrate is append-only audit — does not delete Owner history.
 */
export async function applyLoyaltyLedgerEntry(input: {
  tenantId: string;
  customerId: string;
  type: "adjust" | "migrate" | "expire";
  points: number;
  reason: string;
  externalRef?: string;
  tenantSlug?: string;
}): Promise<{ ok: true; txnId: string; balance: number }> {
  const account = await getOrCreateLoyaltyAccount({
    tenantId: input.tenantId,
    customerId: input.customerId,
  });
  const txnId = `lyt_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const delta = input.points;
  if (input.type !== "migrate" && account.pointsBalance + delta < 0) {
    throw new Error("Balance would go negative");
  }

  await db.insert(loyaltyTransactionsTable).values({
    id: txnId,
    tenantId: input.tenantId,
    customerId: input.customerId,
    accountId: account.id,
    orderId: null,
    type: input.type,
    points: delta,
    reason: input.reason,
    externalRef: input.externalRef ?? null,
    bpAnchorStatus: "pending",
  });

  const lifetimeDelta = delta > 0 ? delta : 0;
  await db
    .update(loyaltyAccountsTable)
    .set({
      pointsBalance: sql`${loyaltyAccountsTable.pointsBalance} + ${delta}`,
      lifetimePoints:
        lifetimeDelta > 0
          ? sql`${loyaltyAccountsTable.lifetimePoints} + ${lifetimeDelta}`
          : loyaltyAccountsTable.lifetimePoints,
      updatedAt: new Date(),
    })
    .where(eq(loyaltyAccountsTable.id, account.id));

  void maybeAnchorLoyaltyTxn({
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    txnId,
    type: input.type,
    points: delta,
    customerId: input.customerId,
  });

  const updated = await db
    .select()
    .from(loyaltyAccountsTable)
    .where(eq(loyaltyAccountsTable.id, account.id))
    .limit(1);

  return {
    ok: true,
    txnId,
    balance: updated[0]?.pointsBalance ?? 0,
  };
}

export async function listLoyaltyTransactions(input: {
  tenantId: string;
  customerId: string;
  limit?: number;
}) {
  return db
    .select()
    .from(loyaltyTransactionsTable)
    .where(
      and(
        eq(loyaltyTransactionsTable.tenantId, input.tenantId),
        eq(loyaltyTransactionsTable.customerId, input.customerId),
      ),
    )
    .orderBy(desc(loyaltyTransactionsTable.createdAt))
    .limit(input.limit ?? 50);
}

export function redeemPointsToDiscountCents(
  points: number,
  rules: LoyaltyRedemptionRules,
  subtotalCents: number,
): number {
  const perDollar = rules.points_per_dollar_off ?? 100;
  if (perDollar <= 0 || points <= 0) return 0;
  let cents = Math.floor((points / perDollar) * 100);
  const maxPct = rules.max_percent_of_subtotal ?? 50;
  const cap = Math.floor((subtotalCents * maxPct) / 100);
  if (cents > cap) cents = cap;
  if (cents > subtotalCents) cents = subtotalCents;
  return Math.max(0, cents);
}

async function maybeAnchorLoyaltyTxn(input: {
  tenantId: string;
  tenantSlug?: string;
  txnId: string;
  type: string;
  points: number;
  orderId?: string;
  customerId: string;
}) {
  try {
    const slug = input.tenantSlug || input.tenantId;
    if (!isBranchlessPayConfigured(slug)) {
      await db
        .update(loyaltyTransactionsTable)
        .set({ bpAnchorStatus: "skipped" })
        .where(eq(loyaltyTransactionsTable.id, input.txnId));
      return;
    }
    const result = await createLoyaltyAnchor({
      tenantId: input.tenantId,
      tenantSlug: slug,
      txnId: input.txnId,
      type: input.type,
      points: input.points,
      orderId: input.orderId,
      customerId: input.customerId,
    });
    await db
      .update(loyaltyTransactionsTable)
      .set({
        bpAnchorId: result.anchorId ?? null,
        bpContentHash: result.contentHash ?? null,
        bpAnchorStatus: result.ok ? "pending" : "failed",
        chainTxHash: result.txHash ?? null,
        bpExplorerUrl: result.explorerUrl ?? null,
      })
      .where(eq(loyaltyTransactionsTable.id, input.txnId));
  } catch (err) {
    logger.warn({ err, txnId: input.txnId }, "Loyalty BP anchor skipped/failed");
    try {
      await db
        .update(loyaltyTransactionsTable)
        .set({ bpAnchorStatus: "failed" })
        .where(eq(loyaltyTransactionsTable.id, input.txnId));
    } catch {
      /* ignore */
    }
  }
}
