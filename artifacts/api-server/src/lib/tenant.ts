/** Per-tenant scope — one deployment = one restaurant tenant. */
export function getTenantId(): string {
  return process.env.TENANT_ID?.trim() || "default";
}

export const RESTAURANT_LAT = Number(
  process.env.RESTAURANT_LAT ?? "39.4278",
);
export const RESTAURANT_LNG = Number(
  process.env.RESTAURANT_LNG ?? "-86.4281",
);
export const DELIVERY_RADIUS_MILES = Number(
  process.env.DELIVERY_RADIUS_MILES ?? "12",
);

export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? "";

export const SQUARE_ORDER_SOURCE_NAME =
  process.env.SQUARE_ORDER_SOURCE_NAME?.trim() || "Orderly Order Hub";
