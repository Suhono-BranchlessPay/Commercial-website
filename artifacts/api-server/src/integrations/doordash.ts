/**
 * DoorDash Drive (On-Demand Delivery) Integration
 *
 * DoorDash Drive API memungkinkan restoran meminta kurir DoorDash
 * untuk mengantarkan order delivery tanpa pelanggan perlu buka app DoorDash.
 *
 * Setup:
 * 1. Daftar di https://developer.doordash.com
 * 2. Buat Developer Account dan buat aplikasi baru
 * 3. Ambil:
 *    - Developer ID (DOORDASH_DEVELOPER_ID)
 *    - Key ID (DOORDASH_KEY_ID)
 *    - Signing Secret (DOORDASH_SIGNING_SECRET)
 * 4. Set environment variables:
 *    DOORDASH_DEVELOPER_ID=<developer_id>
 *    DOORDASH_KEY_ID=<key_id>
 *    DOORDASH_SIGNING_SECRET=<signing_secret>
 *
 * Catatan: DoorDash Drive berbeda dengan link DoorDash marketplace
 * yang sudah ada di header/footer website. Drive digunakan untuk
 * dispatch kurir DoorDash dari sistem kita sendiri.
 */

import { createHmac } from "crypto";

const DOORDASH_DEVELOPER_ID = process.env.DOORDASH_DEVELOPER_ID;
const DOORDASH_KEY_ID = process.env.DOORDASH_KEY_ID;
const DOORDASH_SIGNING_SECRET = process.env.DOORDASH_SIGNING_SECRET;

const DOORDASH_BASE_URL = "https://openapi.doordash.com";

export interface DoordashDeliveryInput {
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  orderTotal: number;
  items: Array<{ name: string; quantity: number }>;
}

export interface DoordashDeliveryResult {
  deliveryId: string;
  trackingUrl: string;
  estimatedPickupTime: string;
  estimatedDropoffTime: string;
}

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

/**
 * Buat delivery request ke DoorDash Drive untuk order delivery.
 * Hanya dipanggil ketika orderType === "delivery".
 */
export async function createDoordashDelivery(
  input: DoordashDeliveryInput,
): Promise<DoordashDeliveryResult> {
  if (!isDoordashConfigured()) {
    throw new Error(
      "DoorDash not configured. Set DOORDASH_DEVELOPER_ID, DOORDASH_KEY_ID, DOORDASH_SIGNING_SECRET.",
    );
  }

  const jwt = generateJwt();

  const body = {
    external_delivery_id: input.orderId,
    pickup_address: "789 E Morgan St, Martinsville, IN 46151",
    pickup_business_name: "Samurai Hibachi & Sushi",
    pickup_phone_number: "+17653150073",
    pickup_instructions: "Order pickup for customer",
    dropoff_address: input.deliveryAddress,
    dropoff_contact_given_name: input.customerName,
    dropoff_contact_family_name: "",
    dropoff_contact_send_notifications: true,
    dropoff_phone_number: input.customerPhone,
    order_value: Math.round(input.orderTotal * 100),
    currency: "USD",
    items: input.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
    })),
  };

  const response = await fetch(`${DOORDASH_BASE_URL}/drive/v2/deliveries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`DoorDash API error ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as {
    external_delivery_id: string;
    tracking_url: string;
    estimated_pickup_time: string;
    estimated_dropoff_time: string;
  };

  return {
    deliveryId: data.external_delivery_id,
    trackingUrl: data.tracking_url,
    estimatedPickupTime: data.estimated_pickup_time,
    estimatedDropoffTime: data.estimated_dropoff_time,
  };
}
