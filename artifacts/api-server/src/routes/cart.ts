import { Router } from "express";
import { randomBytes } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db, cartSharesTable } from "@workspace/db";
import { getTenantId } from "../lib/tenant";
import { logger } from "../lib/logger";

const router = Router();

const CART_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_LINES = 40;

const shareItemSchema = z.object({
  menuItem: z.object({
    id: z.string().min(1).max(128),
    sku: z.string().max(128).optional(),
    name: z.string().min(1).max(200),
    price: z.number().finite().nonnegative().max(100_000),
    description: z.string().max(2000).nullable().optional(),
    imageUrl: z.string().max(2000).nullable().optional(),
    category: z.string().max(200).nullable().optional(),
    available: z.boolean().optional(),
    featured: z.boolean().optional(),
  }),
  quantity: z.number().int().min(1).max(99),
  specialInstructions: z.string().max(500).optional(),
});

const shareBodySchema = z.object({
  items: z.array(shareItemSchema).min(1).max(MAX_LINES),
});

function newCartToken(): string {
  return randomBytes(18).toString("base64url");
}

/** POST /api/cart/share — persist cart for WebView→Safari handoff. */
router.post("/cart/share", async (req, res): Promise<void> => {
  const parsed = shareBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid cart payload" });
    return;
  }

  const tenantId = req.tenant?.id ?? getTenantId();
  const id = newCartToken();
  const expiresAt = new Date(Date.now() + CART_TTL_MS);

  try {
    await db.insert(cartSharesTable).values({
      id,
      tenantId,
      payload: { items: parsed.data.items },
      expiresAt,
    });
    res.status(201).json({
      token: id,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "cart share insert failed");
    res.status(500).json({ error: "Could not save cart" });
  }
});

/** GET /api/cart/share/:token — restore cart in Safari (or any browser). */
router.get("/cart/share/:token", async (req, res): Promise<void> => {
  const token = String(req.params.token || "").trim();
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  const tenantId = req.tenant?.id ?? getTenantId();

  try {
    const rows = await db
      .select()
      .from(cartSharesTable)
      .where(
        and(
          eq(cartSharesTable.id, token),
          eq(cartSharesTable.tenantId, tenantId),
          gt(cartSharesTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      res.status(404).json({ error: "Cart link expired or not found" });
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      token: row.id,
      expires_at: row.expiresAt.toISOString(),
      items: row.payload.items,
    });
  } catch (err) {
    logger.error({ err }, "cart share fetch failed");
    res.status(500).json({ error: "Could not load cart" });
  }
});

export default router;
