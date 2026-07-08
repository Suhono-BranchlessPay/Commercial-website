/**
 * Square POS Integration
 *
 * Setup:
 * 1. Daftar / login di https://developer.squareup.com
 * 2. Buat aplikasi baru → ambil Access Token (Production)
 * 3. Ambil Location ID dari Square Dashboard → Locations
 * 4. Set environment variables:
 *    SQUARE_ACCESS_TOKEN=<your_access_token>
 *    SQUARE_LOCATION_ID=<your_location_id>
 *    SQUARE_ENVIRONMENT=production  (atau "sandbox" untuk testing)
 *
 * Setelah kredensial tersedia, uncomment kode di bawah dan
 * panggil sendOrderToSquare() dari routes/orders.ts setelah
 * order disimpan ke database.
 */

export interface SquareOrderItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
}

export interface SquareOrderInput {
  orderId: string;
  customerName: string;
  customerPhone: string;
  orderType: "pickup" | "delivery";
  deliveryAddress?: string | null;
  items: SquareOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  specialInstructions?: string | null;
}

export interface SquareOrderResult {
  squareOrderId: string;
  squareOrderVersion: number;
}

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT ?? "sandbox";

const SQUARE_BASE_URL =
  SQUARE_ENVIRONMENT === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

export function isSquareConfigured(): boolean {
  return Boolean(SQUARE_ACCESS_TOKEN && SQUARE_LOCATION_ID);
}

/**
 * Kirim order ke Square POS.
 * Order akan muncul di Square Dashboard dan perangkat POS restoran.
 */
export async function sendOrderToSquare(
  input: SquareOrderInput,
): Promise<SquareOrderResult> {
  if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
    throw new Error(
      "Square not configured. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID.",
    );
  }

  const lineItems = input.items.map((item) => ({
    name: item.menuItemName,
    quantity: String(item.quantity),
    base_price_money: {
      amount: Math.round(item.unitPrice * 100),
      currency: "USD",
    },
  }));

  const orderBody = {
    idempotency_key: input.orderId,
    order: {
      location_id: SQUARE_LOCATION_ID,
      reference_id: input.orderId,
      line_items: lineItems,
      taxes: [
        {
          name: "Sales Tax",
          percentage: "7",
          scope: "ORDER",
        },
      ],
      fulfillments: [
        {
          type: input.orderType === "delivery" ? "DELIVERY" : "PICKUP",
          state: "PROPOSED",
          ...(input.orderType === "pickup"
            ? {
                pickup_details: {
                  recipient: {
                    display_name: input.customerName,
                    phone_number: input.customerPhone,
                  },
                },
              }
            : {
                delivery_details: {
                  recipient: {
                    display_name: input.customerName,
                    phone_number: input.customerPhone,
                    address: {
                      address_line_1: input.deliveryAddress ?? "",
                    },
                  },
                },
              }),
        },
      ],
      metadata: {
        source: "samurai-website",
        ...(input.specialInstructions
          ? { special_instructions: input.specialInstructions }
          : {}),
      },
    },
  };

  const response = await fetch(`${SQUARE_BASE_URL}/v2/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
      "Square-Version": "2024-11-20",
    },
    body: JSON.stringify(orderBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Square API error ${response.status}: ${errorBody}`,
    );
  }

  const data = (await response.json()) as {
    order: { id: string; version: number };
  };

  return {
    squareOrderId: data.order.id,
    squareOrderVersion: data.order.version,
  };
}
