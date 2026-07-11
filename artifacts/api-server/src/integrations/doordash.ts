/**
 * DoorDash Drive — quote → pay → accept dispatch.
 * Credentials + pickup identity resolved per tenant.
 */

import { createHmac, randomUUID } from "crypto";
import type { StructuredAddress } from "../lib/address";
import { addressFingerprint, formatAddress } from "../lib/address";
import { normalizePhoneE164 } from "../lib/phone";
import { tenantSecret, type TenantContext } from "../lib/tenant";

const DOORDASH_BASE_URL =
  process.env.DOORDASH_API_BASE?.replace(/\/$/, "") ??
  "https://openapi.doordash.com";

const QUOTE_TTL_MS = 30 * 60 * 1000;

export interface DeliveryQuoteInput {
  firstName: string;
  lastName?: string | null;
  customerPhone: string;
  address: StructuredAddress;
  orderValueCents: number;
  tenant: TenantContext;
}

export interface DeliveryQuoteResult {
  externalDeliveryId: string;
  deliveryFee: number;
  deliveryFeeCents: number;
  currency: string;
  estimatedPickupTime: string | null;
  estimatedDropoffTime: string | null;
  expiresAt: string;
  addressKey: string;
}

export interface AcceptDeliveryInput {
  externalDeliveryId: string;
  firstName: string;
  lastName?: string | null;
  customerPhone: string;
  address: StructuredAddress;
  orderValueCents: number;
  items: Array<{ name: string; quantity: number }>;
  specialInstructions?: string | null;
  tenant: TenantContext;
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
  addressKey: string;
  firstName: string;
  lastName: string | null;
  customerPhone: string;
  orderValueCents: number;
  expiresAt: number;
  tenantSlug: string;
};

const quoteCache = new Map<string, CachedQuote>();

type DdCreds = {
  developerId: string;
  keyId: string;
  signingSecret: string;
};

function resolveDdCreds(slug: string): DdCreds | null {
  const developerId = tenantSecret(slug, "DOORDASH_DEVELOPER_ID");
  const keyId = tenantSecret(slug, "DOORDASH_KEY_ID");
  const signingSecret = tenantSecret(slug, "DOORDASH_SIGNING_SECRET");
  if (!developerId || !keyId || !signingSecret) return null;
  return { developerId, keyId, signingSecret };
}

export function isDoordashConfigured(slug?: string): boolean {
  const s = slug ?? process.env.TENANT_ID?.trim() ?? "samurai";
  return resolveDdCreds(s) !== null;
}

function decodeSigningSecret(signingSecret: string): Buffer {
  const raw = signingSecret.trim();
  try {
    return Buffer.from(raw, "base64");
  } catch {
    return Buffer.from(raw, "utf-8");
  }
}

function generateJwt(creds: DdCreds): string {
  const headerObj = {
    alg: "HS256",
    typ: "JWT",
    "dd-ver": "DD-JWT-V1",
    kid: creds.keyId,
  };
  const header = Buffer.from(JSON.stringify(headerObj)).toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      aud: "doordash",
      iss: creds.developerId,
      kid: creds.keyId,
      exp: now + 300,
      iat: now,
    }),
  ).toString("base64url");

  const secretKey = decodeSigningSecret(creds.signingSecret);
  const signature = createHmac("sha256", secretKey)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

function pickupFromTenant(tenant: TenantContext) {
  return {
    pickup_address: tenant.pickupAddressFormatted,
    pickup_business_name:
      tenant.pickupBusinessName?.trim() || tenant.name,
    pickup_phone_number: tenant.pickupPhone || "+10000000000",
  };
}

function buildQuoteBody(
  externalDeliveryId: string,
  input: Omit<DeliveryQuoteInput, "tenant"> & { tenant: TenantContext },
) {
  return {
    external_delivery_id: externalDeliveryId,
    ...pickupFromTenant(input.tenant),
    dropoff_address: formatAddress(input.address),
    dropoff_phone_number: normalizePhoneE164(input.customerPhone),
    order_value: input.orderValueCents,
    currency: "USD",
  };
}

async function ddRequest<T>(
  creds: DdCreds,
  path: string,
  init: RequestInit,
): Promise<T> {
  const jwt = generateJwt(creds);
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

export async function createDeliveryQuote(
  input: DeliveryQuoteInput,
): Promise<DeliveryQuoteResult> {
  const creds = resolveDdCreds(input.tenant.slug);
  if (!creds) {
    throw new Error("DoorDash Drive is not configured on this server.");
  }

  const externalDeliveryId = randomUUID();
  const data = await ddRequest<{
    fee?: number;
    currency?: string;
    estimated_pickup_time?: string;
    estimated_dropoff_time?: string;
  }>(creds, "/drive/v2/quotes", {
    method: "POST",
    body: JSON.stringify(buildQuoteBody(externalDeliveryId, input)),
  });

  const deliveryFeeCents = data.fee ?? 0;
  const expiresAt = Date.now() + QUOTE_TTL_MS;

  quoteCache.set(externalDeliveryId, {
    deliveryFeeCents,
    addressKey: addressFingerprint(input.address),
    firstName: input.firstName,
    lastName: input.lastName?.trim() || null,
    customerPhone: input.customerPhone,
    orderValueCents: input.orderValueCents,
    expiresAt,
    tenantSlug: input.tenant.slug,
  });

  return {
    externalDeliveryId,
    deliveryFee: deliveryFeeCents / 100,
    deliveryFeeCents,
    currency: data.currency ?? "USD",
    estimatedPickupTime: data.estimated_pickup_time ?? null,
    estimatedDropoffTime: data.estimated_dropoff_time ?? null,
    expiresAt: new Date(expiresAt).toISOString(),
    addressKey: addressFingerprint(input.address),
  };
}

export async function acceptDeliveryQuote(
  input: AcceptDeliveryInput,
): Promise<DoordashDeliveryResult> {
  const creds = resolveDdCreds(input.tenant.slug);
  if (!creds) {
    throw new Error("DoorDash Drive is not configured.");
  }

  const cached = getCachedQuote(input.externalDeliveryId);
  if (!cached) {
    throw new Error("Delivery quote expired. Please get a new delivery quote.");
  }
  if (cached.addressKey !== addressFingerprint(input.address)) {
    throw new Error("Delivery address does not match the quoted address.");
  }

  const brand = input.tenant.name;
  const body = {
    ...buildQuoteBody(input.externalDeliveryId, {
      firstName: input.firstName,
      lastName: input.lastName,
      customerPhone: input.customerPhone,
      address: input.address,
      orderValueCents: input.orderValueCents,
      tenant: input.tenant,
    }),
    dropoff_contact_given_name: input.firstName,
    dropoff_contact_family_name: input.lastName?.trim() || "",
    dropoff_contact_send_notifications: true,
    pickup_instructions: input.specialInstructions
      ? `${brand} order. ${input.specialInstructions}`
      : `${brand} website delivery pickup`,
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
  }>(
    creds,
    `/drive/v2/quotes/${encodeURIComponent(input.externalDeliveryId)}/accept`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  quoteCache.delete(input.externalDeliveryId);

  return {
    deliveryId: data.external_delivery_id,
    trackingUrl: data.tracking_url ?? "",
    estimatedPickupTime: data.estimated_pickup_time ?? "",
    estimatedDropoffTime: data.estimated_dropoff_time ?? "",
    status: data.delivery_status ?? data.status ?? "created",
  };
}

/** Normalize DoorDash webhook event names to dotted lowercase. */
export function normalizeDoordashEventName(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/_/g, ".");
}

/**
 * Map Drive webhook event → our orders.status.
 * DoorDash sends event_name or event_type like DELIVERY_CANCELLED, DASHER_DROPPED_OFF.
 */
export function mapDoordashEventToOrderStatus(eventType: string): string | null {
  const e = normalizeDoordashEventName(eventType);

  if (
    e === "delivery.cancelled" ||
    e === "delivery.canceled" ||
    e === "delivery.returned" ||
    e.includes("cancel")
  ) {
    return "cancelled";
  }
  if (e === "dasher.dropped.off" || e === "delivery.delivered") {
    return "completed";
  }
  if (
    e === "dasher.picked.up" ||
    e === "dasher.confirmed.pickup.arrival" ||
    e === "dasher.enroute.to.dropoff"
  ) {
    return "ready";
  }
  if (
    e === "dasher.confirmed" ||
    e === "dasher.enroute.to.pickup" ||
    e === "dasher.confirmed.dropoff.arrival"
  ) {
    return "preparing";
  }
  return null;
}

/** Canonical doordash_status value stored on the order row. */
export function canonicalDoordashStatus(eventType: string): string {
  const e = normalizeDoordashEventName(eventType);
  return e || "unknown";
}
