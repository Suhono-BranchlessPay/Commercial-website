import type { CartItem } from "@/lib/cart";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

type ShareResponse = {
  token: string;
  expires_at: string;
};

type RestoreResponse = {
  token: string;
  expires_at: string;
  items: CartItem[];
};

/** Persist cart on server; returns token for Safari handoff URL. */
export async function shareCart(items: CartItem[]): Promise<string | null> {
  if (!items.length) return null;
  try {
    const res = await fetch(`${API_BASE}/api/cart/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({
          menuItem: {
            id: i.menuItem.id,
            sku: i.menuItem.sku || i.menuItem.id,
            name: i.menuItem.name,
            price: i.menuItem.price,
            description: i.menuItem.description ?? null,
            imageUrl: i.menuItem.imageUrl ?? null,
            category: i.menuItem.category || "Menu",
            available: i.menuItem.available !== false,
            featured: Boolean(i.menuItem.featured),
          },
          quantity: i.quantity,
          specialInstructions: i.specialInstructions,
        })),
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as ShareResponse;
    return body.token || null;
  } catch {
    return null;
  }
}

export async function restoreCart(token: string): Promise<CartItem[] | null> {
  const t = token.trim();
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(t)) return null;
  try {
    const res = await fetch(`${API_BASE}/api/cart/share/${encodeURIComponent(t)}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as RestoreResponse;
    if (!Array.isArray(body.items) || body.items.length === 0) return null;
    return body.items.map((row) => ({
      quantity: row.quantity,
      specialInstructions: row.specialInstructions,
      menuItem: {
        id: row.menuItem.id,
        sku: row.menuItem.sku || row.menuItem.id,
        name: row.menuItem.name,
        price: row.menuItem.price,
        description: row.menuItem.description ?? null,
        imageUrl: row.menuItem.imageUrl ?? null,
        category: row.menuItem.category || "Menu",
        available: row.menuItem.available !== false,
        featured: Boolean(row.menuItem.featured),
      },
    }));
  } catch {
    return null;
  }
}

/** Current page URL with cart token (+ keep src/item/utm params). */
export function withCartToken(url: string, token: string): string {
  try {
    const u = new URL(url, window.location.origin);
    u.searchParams.set("cart", token);
    return u.toString();
  } catch {
    const join = url.includes("?") ? "&" : "?";
    return `${url}${join}cart=${encodeURIComponent(token)}`;
  }
}

export function readCartTokenFromUrl(): string | null {
  try {
    const raw = new URLSearchParams(window.location.search).get("cart");
    const t = (raw || "").trim();
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(t)) return null;
    return t;
  } catch {
    return null;
  }
}

export function stripCartTokenFromUrl(): void {
  try {
    const u = new URL(window.location.href);
    if (!u.searchParams.has("cart")) return;
    u.searchParams.delete("cart");
    window.history.replaceState({}, "", u.pathname + u.search + u.hash);
  } catch {
    /* ignore */
  }
}
