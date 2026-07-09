/**
 * DoorDash Drive (On-Demand Delivery) — quote → pay → accept dispatch.
 * JWT auth: DD-JWT-V1 HS256 (same pattern as BP Doordash collector).
 */

import { createHmac, randomUUID } from "crypto";

const DOORDASH_DEVELOPER_ID = process.env.DOORDASH_DEVELOPER_ID;
const DOORDASH_KEY_ID = process.env.DOORDASH_KEY_ID;
const DOORDASH_SIGNING_SECRET = process.env.DOORDASH_SIGNING_SECRET;
const DOORDASH_BASE_URL =
  process.env.DOORDASH_API_BASE?.replace(/\/$/, "") ??
  "https://openapi.doordash.com";

const PICKUP_ADDRESS = "789 E Morgan St, Martinsville, IN 46151";
const PICKUP_BUSINESS_NAME = "Samurai Hibachi & Sushi";
const PICKUP_PHONE = "+17653150073";

const QUOTE_TTL_MS = 30 * 60 * 1000;

export interface DeliveryQuoteInput {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  orderValueCents: number;
}

export interface DeliveryQuoteResult {
  externalDeliveryId: string;
  deliveryFee: number;
  deliveryFeeCents: number;
  currency: string;
  estimatedPickupTime: string | null;
  estimatedDropoffTime: string | null;
  expiresAt: string;
}

export interface AcceptDeliveryInput {
  externalDeliveryId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  orderValueCents: number;
  items: Array<{ name: string; quantity: number }>;
  specialInstructions?: string | null;
}

export interface DoordashDeliveryResult {
  deliveryId: string;
  trackingUrl: string;
  estimatedPickupTime: string;
  estimatedDropoffTime: string;
  status: string;
}

type CachedQuote = {
  deliveryFeeCents: number;
  deliveryAddress: string;
  customerName: string;
  customerPhone: string;
  orderValueCents: number;
  expiresAt: number;
};

const quoteCache = new Map<string, CachedQuote>();

export function isDoordashConfigured(): boolean {
  return Boolean(
    DOORDASH_DEVELOPER_ID && DOORDASH_KEY_ID && DOORDASH_SIGNING_SECRET,
  );
}

function generateJwt(): string {
  if (!DOORDASH_DEVELOPER_ID || !DOORDASH_KEY_ID || !DOORDASH_SIGNING_SECRET) {
    throw new Error("DoorDash credentials not configured");
  }

  const headerObj = { alg: "HS256", "dd-ver": "DD-JWT-V1", kid: DOORDASH_KEY_ID };
  const header = Buffer.from(JSON.stringify(headerObj)).toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      aud: "doordash",
      iss: DOORDASH_DEVELOPER_ID,
      kid: DOORDASH_KEY_ID,
      exp: now + 300,
      iat: now,
    }),
  ).toString("base64url");

  const signature = createHmac("sha256", DOORDASH_SIGNING_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.trim().startsWith("+")) return phone.trim();
  return `+${digits}`;
}

function buildQuoteBody(
  externalDeliveryId: string,
  input: DeliveryQuoteInput,
) {
  return {
    external_delivery_id: externalDeliveryId,
    pickup_address: PICKUP_ADDRESS,
    pickup_business_name: PICKUP_BUSINESS_NAME,
    pickup_phone_number: PICKUP_PHONE,
    dropoff_address: input.deliveryAddress,
    dropoff_phone_number: normalizePhone(input.customerPhone),
    order_value: input.orderValueCents,
    currency: "USD",
  };
}

async function ddRequest<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const jwt = generateJwt();
  const response = await fetch(`${DOORDASH_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`DoorDash API error ${response.status}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export function getCachedQuote(externalDeliveryId: string): CachedQuote | null {
  const cached = quoteCache.get(externalDeliveryId);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    quoteCache.delete(externalDeliveryId);
    return null;
  }
  return cached;
}

/**
 * Step 1 — POST /drive/v2/quotes before checkout payment.
 */
export async function createDeliveryQuote(
  input: DeliveryQuoteInput,
): Promise<DeliveryQuoteResult> {
  if (!isDoordashConfigured()) {
    throw new Error("DoorDash Drive is not configured on this server.");
  }

  const externalDeliveryId = randomUUID();
  const data = await ddRequest<{
    fee?: number;
    currency?: string;
    estimated_pickup_time?: string;
    estimated_dropoff_time?: string;
  }>("/drive/v2/quotes", {
    method: "POST",
    body: JSON.stringify(
      buildQuoteBody(externalDeliveryId, input),
    ),
  });

  const deliveryFeeCents = data.fee ?? 0;
  const expiresAt = Date.now() + QUOTE_TTL_MS;

  quoteCache.set(externalDeliveryId, {
    deliveryFeeCents,
    deliveryAddress: input.deliveryAddress,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    orderValueCents: input.orderValueCents,
    expiresAt,
  });

  return {
    externalDeliveryId,
    deliveryFee: deliveryFeeCents / 100,
    deliveryFeeCents,
    currency: data.currency ?? "USD",
    estimatedPickupTime: data.estimated_pickup_time ?? null,
    estimatedDropoffTime: data.estimated_dropoff_time ?? null,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

/**
 * Step 2 — after card payment succeeds, accept quote → Dasher dispatched.
 */
export async function acceptDeliveryQuote(
  input: AcceptDeliveryInput,
): Promise<DoordashDeliveryResult> {
  if (!isDoordashConfigured()) {
    throw new Error("DoorDash Drive is not configured.");
  }

  const cached = getCachedQuote(input.externalDeliveryId);
  if (!cached) {
    throw new Error("Delivery quote expired. Please get a new delivery quote.");
  }
  if (cached.deliveryAddress.trim() !== input.deliveryAddress.trim()) {
    throw new Error("Delivery address does not match the quoted address.");
  }

  const body = {
    ...buildQuoteBody(input.externalDeliveryId, {
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      deliveryAddress: input.deliveryAddress,
      orderValueCents: input.orderValueCents,
    }),
    dropoff_contact_given_name: input.customerName,
    dropoff_contact_family_name: "",
    dropoff_contact_send_notifications: true,
    pickup_instructions: input.specialInstructions
      ? `Samurai order. ${input.specialInstructions}`
      : "Samurai website delivery pickup",
    items: input.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
    })),
  };

  const data = await ddRequest<{
    external_delivery_id: string;
    tracking_url?: string;
    estimated_pickup_time?: string;
    estimated_dropoff_time?: string;
    delivery_status?: string;
    status?: string;
  }>(`/drive/v2/quotes/${encodeURIComponent(input.externalDeliveryId)}/accept`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  quoteCache.delete(input.externalDeliveryId);

  return {
    deliveryId: data.external_delivery_id,
    trackingUrl: data.tracking_url ?? "",
    estimatedPickupTime: data.estimated_pickup_time ?? "",
    estimatedDropoffTime: data.estimated_dropoff_time ?? "",
    status: data.delivery_status ?? data.status ?? "created",
  };
}

(eventType: string): string | null {
  const e = eventType.toLowerCase().replace(/_/g, ".");
  if (e === "dasher.confirmed") return "preparing";
  if (e === "dasher.picked.up") return "ready";
  if (e === "dasher.dropped.off") return "completed";
  if (e === "delivery.cancelled" || e === "delivery.returned") return "cancelled";
  return null;
}
