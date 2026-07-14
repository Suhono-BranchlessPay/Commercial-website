import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import {
  getLoyaltyProgram,
  getOrCreateLoyaltyAccount,
  isLoyaltyEngineEnabled,
  listLoyaltyTransactions,
  redeemLoyaltyPoints,
  redeemPointsToDiscountCents,
} from "../lib/loyaltyEngine";
import { logger } from "../lib/logger";

const router = Router();

/** Public program config for storefront / app (no secrets). */
router.get("/loyalty/program", async (req, res): Promise<void> => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      res.status(404).json({ error: "Unknown tenant" });
      return;
    }
    const program = await getLoyaltyProgram(tenantId);
    res.json({
      engineEnabled: isLoyaltyEngineEnabled(),
      program: program
        ? {
            enabled: program.enabled && program.status === "active",
            status: program.status,
            pointsPerDollar: program.pointsPerDollar,
            redemptionRules: program.redemptionRules,
            expiryDays: program.expiryDays,
          }
        : null,
    });
  } catch (err) {
    logger.error({ err }, "GET /loyalty/program failed");
    res.status(500).json({ error: "Failed to load loyalty program" });
  }
});

/**
 * Balance lookup by phone (E.164 or digits) for the Host tenant.
 * Used by account page / checkout — not a cross-tenant search.
 */
router.get("/loyalty/balance", async (req, res): Promise<void> => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      res.status(404).json({ error: "Unknown tenant" });
      return;
    }
    const phoneRaw =
      typeof req.query.phone === "string" ? req.query.phone.trim() : "";
    const customerId =
      typeof req.query.customer_id === "string"
        ? req.query.customer_id.trim()
        : "";
    if (!phoneRaw && !customerId) {
      res.status(400).json({ error: "phone or customer_id required" });
      return;
    }

    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId) {
      const digits = phoneRaw.replace(/\D/g, "");
      const e164 = phoneRaw.startsWith("+")
        ? phoneRaw
        : digits.length === 10
          ? `+1${digits}`
          : digits.length === 11 && digits.startsWith("1")
            ? `+${digits}`
            : phoneRaw;
      const rows = await db
        .select({ id: customersTable.id })
        .from(customersTable)
        .where(
          and(
            eq(customersTable.tenantId, tenantId),
            eq(customersTable.phone, e164),
          ),
        )
        .limit(1);
      if (!rows[0]) {
        res.json({
          found: false,
          pointsBalance: 0,
          lifetimePoints: 0,
          engineEnabled: isLoyaltyEngineEnabled(),
        });
        return;
      }
      resolvedCustomerId = rows[0].id;
    }

    const account = await getOrCreateLoyaltyAccount({
      tenantId,
      customerId: resolvedCustomerId,
    });
    const program = await getLoyaltyProgram(tenantId);
    res.json({
      found: true,
      customerId: resolvedCustomerId,
      pointsBalance: account.pointsBalance,
      lifetimePoints: account.lifetimePoints,
      engineEnabled: isLoyaltyEngineEnabled(),
      programActive: Boolean(program?.enabled && program.status === "active"),
    });
  } catch (err) {
    logger.error({ err }, "GET /loyalty/balance failed");
    res.status(500).json({ error: "Failed to load balance" });
  }
});

router.get("/loyalty/transactions", async (req, res): Promise<void> => {
  try {
    const tenantId = req.tenant?.id;
    const customerId =
      typeof req.query.customer_id === "string"
        ? req.query.customer_id.trim()
        : "";
    if (!tenantId || !customerId) {
      res.status(400).json({ error: "customer_id required" });
      return;
    }
    const rows = await listLoyaltyTransactions({
      tenantId,
      customerId,
      limit: 50,
    });
    res.json({
      transactions: rows.map((t) => ({
        id: t.id,
        type: t.type,
        points: t.points,
        reason: t.reason,
        orderId: t.orderId,
        createdAt: t.createdAt,
        bpAnchorStatus: t.bpAnchorStatus,
      })),
    });
  } catch (err) {
    logger.error({ err }, "GET /loyalty/transactions failed");
    res.status(500).json({ error: "Failed to list transactions" });
  }
});

/** Quote a redeem (does not commit). */
router.post("/loyalty/quote-redeem", async (req, res): Promise<void> => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      res.status(404).json({ error: "Unknown tenant" });
      return;
    }
    const points = Number(req.body?.points);
    const subtotalCents = Number(req.body?.subtotal_cents);
    if (!Number.isFinite(points) || points <= 0) {
      res.status(400).json({ error: "points required" });
      return;
    }
    const program = await getLoyaltyProgram(tenantId);
    if (!program?.enabled || program.status !== "active") {
      res.status(400).json({ error: "Loyalty program not active" });
      return;
    }
    const discountCents = redeemPointsToDiscountCents(
      points,
      program.redemptionRules ?? {},
      Number.isFinite(subtotalCents) ? subtotalCents : 0,
    );
    res.json({
      points,
      discountCents,
      discountDollars: (discountCents / 100).toFixed(2),
      rules: program.redemptionRules,
    });
  } catch (err) {
    logger.error({ err }, "POST /loyalty/quote-redeem failed");
    res.status(500).json({ error: "Failed to quote redeem" });
  }
});

/** Commit redeem — used when checkout wires discount. */
router.post("/loyalty/redeem", async (req, res): Promise<void> => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      res.status(404).json({ error: "Unknown tenant" });
      return;
    }
    const customerId = String(req.body?.customer_id || "").trim();
    const points = Number(req.body?.points);
    const orderId =
      typeof req.body?.order_id === "string" ? req.body.order_id : undefined;
    if (!customerId || !Number.isFinite(points)) {
      res.status(400).json({ error: "customer_id and points required" });
      return;
    }
    const result = await redeemLoyaltyPoints({
      tenantId,
      customerId,
      points,
      orderId,
      tenantSlug: req.tenant?.slug,
    });
    if (!result.ok) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "POST /loyalty/redeem failed");
    res.status(500).json({ error: "Failed to redeem" });
  }
});

export default router;
