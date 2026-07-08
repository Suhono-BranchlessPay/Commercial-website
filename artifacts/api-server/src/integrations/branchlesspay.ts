/**
 * Branchlesspay BP Audit Shield Integration
 *
 * BP Audit Shield dari Branchlesspay digunakan untuk fraud prevention
 * dan audit trail pada transaksi pembayaran.
 *
 * Setup:
 * 1. Login ke dashboard Branchlesspay
 * 2. Aktifkan BP Audit Shield untuk merchant account Anda
 * 3. Ambil API credentials dari Settings → API Keys:
 *    BRANCHLESSPAY_API_KEY=<your_api_key>
 *    BRANCHLESSPAY_MERCHANT_ID=<your_merchant_id>
 *    BRANCHLESSPAY_ENVIRONMENT=production  (atau "sandbox" untuk testing)
 * 4. Hubungi tim Branchlesspay untuk endpoint URL yang spesifik
 *    jika berbeda dari default di bawah
 *
 * Catatan: Dokumentasi lengkap tersedia di dashboard Branchlesspay Anda.
 */

const BRANCHLESSPAY_API_KEY = process.env.BRANCHLESSPAY_API_KEY;
const BRANCHLESSPAY_MERCHANT_ID = process.env.BRANCHLESSPAY_MERCHANT_ID;
const BRANCHLESSPAY_ENVIRONMENT =
  process.env.BRANCHLESSPAY_ENVIRONMENT ?? "sandbox";

const BRANCHLESSPAY_BASE_URL =
  BRANCHLESSPAY_ENVIRONMENT === "production"
    ? "https://api.branchlesspay.com"
    : "https://sandbox-api.branchlesspay.com";

export interface AuditEventInput {
  orderId: string;
  customerName: string;
  customerPhone: string;
  orderType: "pickup" | "delivery";
  total: number;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditEventResult {
  auditId: string;
  riskScore: number;
  approved: boolean;
  message: string;
}

export function isBranchlesspayConfigured(): boolean {
  return Boolean(BRANCHLESSPAY_API_KEY && BRANCHLESSPAY_MERCHANT_ID);
}

/**
 * Kirim event ke BP Audit Shield untuk fraud check dan audit trail.
 * Panggil ini saat order dibuat, sebelum menyimpan ke database.
 * Jika riskScore tinggi, order bisa ditolak atau ditandai untuk review.
 */
export async function auditOrderWithBpShield(
  input: AuditEventInput,
): Promise<AuditEventResult> {
  if (!isBranchlesspayConfigured()) {
    throw new Error(
      "Branchlesspay not configured. Set BRANCHLESSPAY_API_KEY and BRANCHLESSPAY_MERCHANT_ID.",
    );
  }

  const body = {
    merchant_id: BRANCHLESSPAY_MERCHANT_ID,
    event_type: "order_created",
    transaction: {
      reference_id: input.orderId,
      amount: Math.round(input.total * 100),
      currency: "USD",
      order_type: input.orderType,
    },
    customer: {
      name: input.customerName,
      phone: input.customerPhone,
    },
    items: input.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit_price: Math.round(item.unitPrice * 100),
    })),
    context: {
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
      source: "samurai-website",
    },
  };

  const response = await fetch(`${BRANCHLESSPAY_BASE_URL}/v1/audit/shield`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": BRANCHLESSPAY_API_KEY!,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Branchlesspay API error ${response.status}: ${errorBody}`,
    );
  }

  const data = (await response.json()) as {
    audit_id: string;
    risk_score: number;
    approved: boolean;
    message: string;
  };

  return {
    auditId: data.audit_id,
    riskScore: data.risk_score,
    approved: data.approved,
    message: data.message,
  };
}
