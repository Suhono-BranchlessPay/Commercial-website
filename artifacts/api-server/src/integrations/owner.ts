/**
 * Owner.com Integration
 *
 * Owner.com adalah platform all-in-one untuk restoran yang menyediakan:
 * - Online ordering system
 * - Customer loyalty program
 * - Marketing automation (email, SMS)
 * - Analytics dashboard
 *
 * Setup:
 * 1. Login ke https://app.owner.com
 * 2. Buka Settings → Integrations → API
 * 3. Generate API Key
 * 4. Set environment variables:
 *    OWNER_API_KEY=<your_api_key>
 *    OWNER_RESTAURANT_ID=<your_restaurant_id>
 *
 * Catatan: Hubungi tim Owner.com support untuk:
 * - Mendapatkan restaurant_id Anda
 * - Dokumentasi webhook untuk sync order real-time
 * - Setup loyalty points per order
 */

const OWNER_API_KEY = process.env.OWNER_API_KEY;
const OWNER_RESTAURANT_ID = process.env.OWNER_RESTAURANT_ID;
const OWNER_BASE_URL = "https://api.owner.com";

export interface OwnerOrderInput {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  orderType: "pickup" | "delivery";
  deliveryAddress?: string | null;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  specialInstructions?: string | null;
}

export interface OwnerOrderResult {
  ownerOrderId: string;
  loyaltyPointsEarned: number;
}

export function isOwnerConfigured(): boolean {
  return Boolean(OWNER_API_KEY && OWNER_RESTAURANT_ID);
}

/**
 * Sync order ke Owner.com untuk loyalty tracking, marketing, dan analytics.
 * Pelanggan akan mendapat poin loyalty dan bisa menerima follow-up marketing.
 */
export async function syncOrderToOwner(
  input: OwnerOrderInput,
): Promise<OwnerOrderResult> {
  if (!isOwnerConfigured()) {
    throw new Error(
      "Owner.com not configured. Set OWNER_API_KEY and OWNER_RESTAURANT_ID.",
    );
  }

  const body = {
    restaurant_id: OWNER_RESTAURANT_ID,
    external_order_id: input.orderId,
    source: "website",
    customer: {
      name: input.customerName,
      phone: input.customerPhone,
      ...(input.customerEmail ? { email: input.customerEmail } : {}),
    },
    order_type: input.orderType,
    ...(input.deliveryAddress
      ? { delivery_address: input.deliveryAddress }
      : {}),
    items: input.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit_price: Math.round(item.unitPrice * 100),
    })),
    totals: {
      subtotal: Math.round(input.subtotal * 100),
      tax: Math.round(input.tax * 100),
      total: Math.round(input.total * 100),
      currency: "USD",
    },
    ...(input.specialInstructions
      ? { notes: input.specialInstructions }
      : {}),
  };

  const response = await fetch(
    `${OWNER_BASE_URL}/v1/restaurants/${OWNER_RESTAURANT_ID}/orders`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OWNER_API_KEY}`,
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Owner.com API error ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as {
    id: string;
    loyalty_points_earned: number;
  };

  return {
    ownerOrderId: data.id,
    loyaltyPointsEarned: data.loyalty_points_earned ?? 0,
  };
}
