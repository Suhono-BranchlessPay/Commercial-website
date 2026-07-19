/**
 * Content calendar menu matching — prefer id/sku over fuzzy names.
 * Name-only matching is easy to swap (Hibachi Chicken vs Hibachi Chicken & Scallop).
 */

export type MenuMatchCatalogItem = {
  id: string;
  name: string;
  sku?: string | null;
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Exact id, then sku, then exact name; fuzzy name only with a unique clear winner. */
export function matchMenuItem(
  nameOrIdOrSku: string | null | undefined,
  catalog: MenuMatchCatalogItem[],
): MenuMatchCatalogItem | null {
  if (!nameOrIdOrSku?.trim() || !catalog.length) return null;
  const raw = nameOrIdOrSku.trim();
  const byId = catalog.find((c) => c.id === raw);
  if (byId) return byId;

  const rawNorm = norm(raw);
  const bySku = catalog.find(
    (c) => c.sku && norm(String(c.sku)) === rawNorm,
  );
  if (bySku) return bySku;

  const byExactName = catalog.find((c) => norm(c.name) === rawNorm);
  if (byExactName) return byExactName;

  // Fuzzy: catalog name contains query, or query contains catalog name.
  // Prefer closest length; require a unique top score (no ties).
  type Scored = { item: MenuMatchCatalogItem; score: number };
  const scored: Scored[] = [];
  for (const c of catalog) {
    const n = norm(c.name);
    if (n.length < 4) continue;
    let score = 0;
    if (n === rawNorm) score = 10_000;
    else if (n.startsWith(rawNorm) || rawNorm.startsWith(n)) {
      score = 5000 + Math.min(n.length, rawNorm.length);
    } else if (n.includes(rawNorm) || rawNorm.includes(n)) {
      // Longer shared span wins; penalize large length gaps (Chicken vs Crab Meat Bento).
      const shared = Math.min(n.length, rawNorm.length);
      const gap = Math.abs(n.length - rawNorm.length);
      score = 1000 + shared * 10 - gap * 3;
    }
    if (score > 0) scored.push({ item: c, score });
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score || b.item.name.length - a.item.name.length);
  const top = scored[0]!;
  const second = scored[1];
  if (second && second.score === top.score) return null;
  // Require a clear margin when both are mere substring hits.
  if (second && top.score < 5000 && top.score - second.score < 15) return null;
  return top.item;
}

/** Prefer longest menu-name mention in hook/caption so links match the copy. */
export function matchMenuItemFromText(
  text: string | null | undefined,
  catalog: MenuMatchCatalogItem[],
): MenuMatchCatalogItem | null {
  const hay = norm(String(text || ""));
  if (!hay.trim() || !catalog.length) return null;
  let best: MenuMatchCatalogItem | null = null;
  for (const item of catalog) {
    const name = norm(item.name);
    if (name.length < 4) continue;
    if (!hay.includes(name)) continue;
    if (!best || name.length > norm(best.name).length) best = item;
  }
  return best;
}

/** True when caption/hook uses ranking language that must be re-checked at publish. */
export const RANKING_CLAIM_RE =
  /\b(most[\s-]?ordered|#1|number\s*one|top[\s-]?seller|best[\s-]?seller)\b/i;

export function textHasRankingClaim(text: string): boolean {
  return RANKING_CLAIM_RE.test(text);
}

/** Whether target item appears in Square top rows (name overlap, normalized). */
export function itemNameInTopProducts(
  itemName: string,
  topRows: Array<{ name: string }>,
  topN = 5,
): boolean {
  const target = norm(itemName);
  if (!target) return false;
  const slice = topRows.slice(0, topN);
  return slice.some((r) => {
    const n = norm(r.name);
    if (!n) return false;
    return n === target || n.includes(target) || target.includes(n);
  });
}
