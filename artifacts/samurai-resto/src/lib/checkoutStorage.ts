export interface StructuredAddress {
  street: string;
  unit?: string | null;
  city: string;
  state: string;
  postcode: string;
  lat: number;
  lng: number;
}

export interface CheckoutProfile {
  firstName: string;
  lastName?: string | null;
  customerPhone: string;
  customerEmail?: string;
  address?: StructuredAddress | null;
}

const ORDER_IDS_KEY = "orderly_order_ids";
const profileKey = (tenantId: string) => `orderly_checkout_${tenantId}`;

export function loadCheckoutProfile(tenantId: string): CheckoutProfile | null {
  try {
    const raw = localStorage.getItem(profileKey(tenantId));
    if (!raw) return null;
    return JSON.parse(raw) as CheckoutProfile;
  } catch {
    return null;
  }
}

export function saveCheckoutProfile(
  tenantId: string,
  profile: CheckoutProfile,
): void {
  localStorage.setItem(profileKey(tenantId), JSON.stringify(profile));
}

export function loadOrderIds(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_IDS_KEY);
    if (!raw) return [];
    const ids = JSON.parse(raw) as string[];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export function rememberOrderId(orderId: string): void {
  const ids = loadOrderIds().filter((id) => id !== orderId);
  ids.unshift(orderId);
  localStorage.setItem(ORDER_IDS_KEY, JSON.stringify(ids.slice(0, 20)));
}

export function formatAddressDisplay(addr: StructuredAddress): string {
  const line1 = [addr.street, addr.unit?.trim()].filter(Boolean).join(" ");
  return `${line1}, ${addr.city}, ${addr.state} ${addr.postcode}`;
}

export function displayName(
  firstName: string,
  lastName?: string | null,
): string {
  return [firstName.trim(), lastName?.trim()].filter(Boolean).join(" ");
}
