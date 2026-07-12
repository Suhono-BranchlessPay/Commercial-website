import { Router } from "express";
import { z } from "zod";
import { getTenantId } from "../lib/tenant";
import { suggestUpsells } from "../lib/upsell";

const router = Router();

const bodySchema = z.object({
  menu_item_ids: z.array(z.string().min(1)).min(1).max(40),
  limit: z.number().int().min(1).max(8).optional(),
});

/**
 * C4 — co-occurrence suggestions for checkout cart.
 * Tenant-scoped; no invented popularity — empty when history too thin.
 */
router.post("/upsell/suggestions", async (req, res): Promise<void> => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const tenantId = req.tenant?.id ?? getTenantId();
    const suggestions = await suggestUpsells({
      tenantId,
      cartMenuItemIds: parsed.data.menu_item_ids,
      limit: parsed.data.limit,
    });
    res.json({
      tenant_id: tenantId,
      suggestions,
      method: "co_occurrence",
      note:
        suggestions.length === 0
          ? "Not enough paid co-occurrence data yet for this cart."
          : undefined,
    });
  } catch (err) {
    req.log?.error({ err }, "Upsell suggestions failed");
    res.status(500).json({ error: "Failed to build upsell suggestions" });
  }
});

export default router;
