/**
 * Square POS Integration
 *
 * Kitchen auto-fire: create order → accept fulfillment (RESERVED) → optional payment.
 * Pay at pickup skips payment so order stays OPEN/UNPAID in Square.
 */

export type PaymentTiming = "pay_now" | "pay_at_pickup";

export interface SquareOrderItem {
  menuItemId: string;
  menuItemName: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  specialInstructions?: string | null;
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
  paymentTiming: PaymentTiming;
  /** Card nonce from Square Web Payments SDK (pay_now). */
  squarePaymentSourceId?: string | null;
}

export interface SquareOrderResult {
  squareOrderId: string;
  squareOrderVersion: number;
  squarePaymentId: string | null;
  paid: boolean;
}

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const SQUARE_APPLICATION_ID = process.env.SQUARE_APPLICATION_ID;
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT ?? "sandbox";
const SQUARE_API_VERSION = "2024-11-20";

const SQUARE_BASE_URL =
  SQUARE_ENVIRONMENT === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

/** Default kitchen prep window shown on website (20–30 min). */
const PREP_TIME_DURATION = "PT20M";

type CatalogVariation = { id: string; version: number };

/** SKU → Square ITEM_VARIATION (kitchen printers route by catalog category). */
const catalogBySku = new Map<string, CatalogVariation>();

export function isSquareConfigured(): boolean {
  return Boolean(SQUARE_ACCESS_TOKEN && SQUARE_LOCATION_ID);
}

export function isSquareWebPaymentsConfigured(): boolean {
  return Boolean(SQUARE_APPLICATION_ID && SQUARE_LOCATION_ID);
}

export function getSquarePublicConfig():
  | { enabled: false }
  | {
      enabled: true;
      applicationId: string;
      locationId: string;
      environment: string;
    } {
  if (!isSquareWebPaymentsConfigured()) {
    return { enabled: false };
  }
  return {
    enabled: true,
    applicationId: SQUARE_APPLICATION_ID!,
    locationId: SQUARE_LOCATION_ID!,
    environment: SQUARE_ENVIRONMENT,
  };
}

async function squareRequest<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(`${SQUARE_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
      "Square-Version": SQUARE_API_VERSION,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Square API error ${response.status}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

async function resolveCatalogVariation(
  sku: string | null | undefined,
): Promise<CatalogVariation | null> {
  const trimmed = sku?.trim();
  if (!trimmed) return null;

  const cacheKey = trimmed.toUpperCase();
  const cached = catalogBySku.get(cacheKey);
  if (cached) return cached;

  try {
    const data = await squareRequest<{
      objects?: Array<{ id: string; version: number }>;
    }>("/v2/catalog/search", {
      method: "POST",
      body: JSON.stringify({
        object_types: ["ITEM_VARIATION"],
        query: {
          exact_query: {
            attribute_name: "sku",
            attribute_value: trimmed,
          },
        },
        limit: 1,
      }),
    });

    const variation = data.objects?.[0];
    if (!variation?.id) return null;

    const entry = { id: variation.id, version: variation.version };
    catalogBySku.set(cacheKey, entry);
    return entry;
  } catch (err) {
    console.error(`[Square] catalog lookup failed for SKU ${trimmed}:`, err);
    return null;
  }
}

async function buildSquareLineItems(
  items: SquareOrderItem[],
): Promise<Array<Record<string, unknown>>> {
  return Promise.all(
    items.map(async (item) => {
      const catalog = await resolveCatalogVariation(item.sku);
      const note = item.specialInstructions?.trim() || undefined;

      if (catalog) {
        return {
          catalog_object_id: catalog.id,
          catalog_version: catalog.version,
          quantity: String(item.quantity),
          ...(note ? { note } : {}),
        };
      }

      return {
        name: item.menuItemName,
        quantity: String(item.quantity),
        base_price_money: {
          amount: Math.round(item.unitPrice * 100),
          currency: "USD",
        },
        ...(note ? { note } : {}),
      };
    }),
  );
}

type SquareOrderPayload = {
  order: {
    id: string;
    version: number;
    fulfillments?: Array<{ uid?: string; state?: string }>;
  };
};

async function fetchSquareOrder(squareOrderId: string): Promise<SquareOrderPayload> {
  return squareRequest<SquareOrderPayload>(`/v2/orders/${squareOrderId}`, {
    method: "GET",
  });
}

async function updateFulfillmentState(
  squareOrderId: string,
  version: number,
  fulfillmentUid: string,
  state: string,
  idempotencySuffix: string,
): Promise<SquareOrderPayload> {
  return squareRequest<SquareOrderPayload>(`/v2/orders/${squareOrderId}`, {
    method: "PUT",
    body: JSON.stringify({
      idempotency_key: `${idempotencySuffix}-${squareOrderId}-${version}`,
      order: {
        version,
        fulfillments: [{ uid: fulfillmentUid, state }],
      },
    }),
  });
}

/**
 * Auto-accept online order → RESERVED (same as staff tapping Accept in Order Manager).
 * Must run before or without payment so kitchen ticket fires for pay-at-pickup orders.
 */
export async function acceptOrderForKitchen(squareOrderId: string): Promise<void> {
  const current = await fetchSquareOrder(squareOrderId);
  const fulfillment = current.order?.fulfillments?.[0];
  if (!fulfillment?.uid) {
    throw new Error("Square order has no fulfillment to accept");
  }

  if (fulfillment.state === "RESERVED" || fulfillment.state === "PREPARED") {
    return;
  }

  await updateFulfillmentState(
    squareOrderId,
    current.order.version,
    fulfillment.uid,
    "RESERVED",
    "accept-kitchen",
  );
}

async function createSquarePayment(
  input: SquareOrderInput,
  squareOrderId: string,
): Promise<string> {
  if (!input.squarePaymentSourceId) {
    throw new Error(
      "Pay now requires card payment. Set SQUARE_APPLICATION_ID and complete checkout card form.",
    );
  }

  const amountCents = Math.round(input.total * 100);
  const data = await squareRequest<{ payment: { id: string } }>("/v2/payments", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: `pay-${input.orderId}`,
      source_id: input.squarePaymentSourceId,
      amount_money: { amount: amountCents, currency: "USD" },
      order_id: squareOrderId,
      location_id: SQUARE_LOCATION_ID,
      autocomplete: true,
    }),
  });
  return data.payment.id;
}

/**
 * Kirim order ke Square POS.
 * Flow: CreateOrder → Accept (RESERVED / auto-fire kitchen) → Payment (pay_now only).
 */
export async function sendOrderToSquare(
  input: SquareOrderInput,
): Promise<SquareOrderResult> {
  if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
    throw new Error(
      "Square not configured. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID.",
    );
  }

  if (input.paymentTiming === "pay_now" && !input.squarePaymentSourceId) {
    throw new Error("Payment required. Complete card details to pay now.");
  }

  const lineItems = await buildSquareLineItems(input.items);
  const ticketName = input.customerName.slice(0, 30);

  const fulfillmentBase =
    input.orderType === "pickup"
      ? {
          type: "PICKUP" as const,
          pickup_details: {
            schedule_type: "ASAP",
            prep_time_duration: PREP_TIME_DURATION,
            recipient: {
              display_name: input.customerName,
              phone_number: input.customerPhone,
            },
            note: input.specialInstructions ?? "Samurai website pickup",
          },
        }
      : {
          type: "DELIVERY" as const,
          delivery_details: {
            schedule_type: "ASAP",
            prep_time_duration: PREP_TIME_DURATION,
            recipient: {
              display_name: input.customerName,
              phone_number: input.customerPhone,
              address: {
                address_line_1: input.deliveryAddress ?? "",
              },
            },
            note: input.specialInstructions ?? "Samurai website delivery",
          },
        };

  const orderBody = {
    idempotency_key: input.orderId,
    order: {
      location_id: SQUARE_LOCATION_ID,
      reference_id: input.orderId.slice(0, 40),
      state: "OPEN",
      ticket_name: ticketName,
      source: { name: "Samurai Order Hub" },
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
          ...fulfillmentBase,
          state: "PROPOSED",
        },
      ],
      metadata: {
        source: "samurai-website",
        payment_timing: input.paymentTiming,
        ...(input.specialInstructions
          ? { special_instructions: input.specialInstructions }
          : {}),
      },
    },
  };

  const data = await squareRequest<{ order: { id: string; version: number } }>(
    "/v2/orders",
    { method: "POST", body: JSON.stringify(orderBody) },
  );

  const squareOrderId = data.order.id;

  // Accept first — auto-fire kitchen without manual Accept tap (pay-at-pickup + pay-now)
  await acceptOrderForKitchen(squareOrderId);

  let squarePaymentId: string | null = null;
  if (input.paymentTiming === "pay_now") {
    squarePaymentId = await createSquarePayment(input, squareOrderId);
  }

  return {
    squareOrderId,
    squareOrderVersion: data.order.version,
    squarePaymentId,
    paid: input.paymentTiming === "pay_now",
  };
}
