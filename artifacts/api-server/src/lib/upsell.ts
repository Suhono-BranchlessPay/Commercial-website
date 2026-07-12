/**
 * C4 — simple co-occurrence upsell from paid order lines (no LLM).
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { menuItemsTable, orderLinesTable, ordersTable } from "@workspace/db";

export async function suggestUpsells(input: {
  tenantId: string;
  cartMenuItemIds: string[];
  limit?: number;
}): Promise<
  Array<{
    menu_item_id: string;
    name: string;
    category: string;
    price_cents: number;
    score: number;
    reason: string;
  }>
> {
  const cart = [...new Set(input.cartMenuItemIds.filter(Boolean))];
  const limit = Math.min(input.limit ?? 3, 8);
  if (cart.length === 0) return [];

  const paid = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.tenantId, input.tenantId),
        eq(ordersTable.paymentStatus, "paid"),
      ),
    );
  const orderIds = paid.map((o) => o.id);
  if (orderIds.length === 0) return [];

  const lines = await db
    .select()
    .from(orderLinesTable)
    .where(inArray(orderLinesTable.orderId, orderIds));

  const byOrder = new Map<string, Set<string>>();
  const nameById = new Map<string, string>();
  for (const line of lines) {
    const set = byOrder.get(line.orderId) ?? new Set();
    set.add(line.menuItemId);
    byOrder.set(line.orderId, set);
    nameById.set(line.menuItemId, line.menuItemName);
  }

  const pairCount = new Map<string, number>();
  for (const items of byOrder.values()) {
    const arr = [...items];
    for (const a of arr) {
      if (!cart.includes(a)) continue;
      for (const b of arr) {
        if (b === a || cart.includes(b)) continue;
        pairCount.set(b, (pairCount.get(b) ?? 0) + 1);
      }
    }
  }

  const ranked = [...pairCount.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, limit * 3);

  if (ranked.length === 0) return [];

  const menu = await db
    .select()
    .from(menuItemsTable)
    .where(
      and(
        eq(menuItemsTable.tenantId, input.tenantId),
        eq(menuItemsTable.available, true),
      ),
    );
  const menuById = new Map(menu.map((m) => [m.id, m]));

  const out: Array<{
    menu_item_id: string;
    name: string;
    category: string;
    price_cents: number;
    score: number;
    reason: string;
  }> = [];

  for (const [id, score] of ranked) {
    const m = menuById.get(id);
    if (!m) continue;
    out.push({
      menu_item_id: id,
      name: m.name,
      category: m.category,
      price_cents: Math.round(m.price * 100),
      score,
      reason: "Often ordered together in this restaurant",
    });
    if (out.length >= limit) break;
  }

  return out;
}
