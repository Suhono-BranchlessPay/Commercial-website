/**
 * BranchlessPay integrations:
 * 1) Optional pre-pay Audit Shield fraud check (legacy soft gate)
 * 2) Post-pay blockchain anchor via POST /api/v1/anchor (required path per Orderly brief)
 *
 * Secrets (per tenant, then global fallback):
 *   BRANCHLESSPAY_LICENSE_KEY  — Bearer for /api/v1/anchor
 *   BRANCHLESSPAY_API_KEY + BRANCHLESSPAY_MERCHANT_ID — optional shield pre-check
 */

import { createHash } from "crypto";
import { tenantSecret } from "../lib/tenant";

const BP_ANCHOR_URL =
  process.env.BRANCHLESSPAY_ANCHOR_URL?.replace(/\/$/, "") ||
  "https://branchlesspay.com/api/v1/anchor";

const BRANCHLESSPAY_ENVIRONMENT =
  process.env.BRANCHLESSPAY_ENVIRONMENT ?? "sandbox";

const BRANCHLESSPAY_SHIELD_BASE =
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
  tenantSlug: string;
}

export interface AuditEventResult {
  auditId: string;
  riskScore: number;
  approved: boolean;
  message: string;
}

export interface AnchorPaidOrderInput {
  orderId: string;
  tenantSlug: string;
  tenantName: string;
  orderType: "pickup" | "delivery";
  total: number;
  currency?: string;
  squarePaymentId?: string | null;
  squareOrderId?: string | null;
  customerName: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
}

export interface AnchorPaidOrderResult {
  ok: boolean;
  anchorId?: string;
  contentHash?: string;
  txHash?: string | null;
  status?: string;
  error?: string;
}

function licenseKey(slug: string): string | undefined {
  return (
    tenantSecret(slug, "BRANCHLESSPAY_LICENSE_KEY") ||
    tenantSecret(slug, "BP_LICENSE_KEY")
  );
}

export function isBranchlesspayConfigured(slug?: string): boolean {
  const s = slug ?? process.env.TENANT_ID?.trim() ?? "samurai";
  return Boolean(
    tenantSecret(s, "BRANCHLESSPAY_API_KEY") &&
      tenantSecret(s, "BRANCHLESSPAY_MERCHANT_ID"),
  );
}

export function isBpAnchorConfigured(slug?: string): boolean {
  const s = slug ?? process.env.TENANT_ID?.trim() ?? "samurai";
  return Boolean(licenseKey(s));
}

/** Legacy SHA-256 of JSON payload (matches branchlesspay_core legacy_content_hash). */
function legacyContentHash(payload: Record<string, unknown>): string {
  const data = { ...payload };
  delete data.content_hash;
  const canonical = JSON.stringify(data, Object.keys(data).sort());
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Optional pre-pay fraud check. Failures should not block checkout unless approved=false.
 */
export async function auditOrderWithBpShield(
  input: AuditEventInput,
): Promise<AuditEventResult> {
  const apiKey = tenantSecret(input.tenantSlug, "BRANCHLESSPAY_API_KEY");
  const merchantId = tenantSecret(input.tenantSlug, "BRANCHLESSPAY_MERCHANT_ID");
  if (!apiKey || !merchantId) {
    throw new Error(
      "Branchlesspay shield not configured. Set BRANCHLESSPAY_API_KEY and BRANCHLESSPAY_MERCHANT_ID.",
    );
  }

  const body = {
    merchant_id: merchantId,
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
      source: "orderly-website",
      tenant: input.tenantSlug,
    },
  };

  const response = await fetch(`${BRANCHLESSPAY_SHIELD_BASE}/v1/audit/shield`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Branchlesspay API error ${response.status}: ${errorBody}`);
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

/**
 * Post-pay immutable anchor — only call after CARD charge succeeds.
 * Non-blocking for order success: caller should log failures and continue.
 */
export async function anchorPaidOrder(
  input: AnchorPaidOrderInput,
): Promise<AnchorPaidOrderResult> {
  const key = licenseKey(input.tenantSlug);
  if (!key) {
    return { ok: false, error: "BRANCHLESSPAY_LICENSE_KEY not configured" };
  }

  const payload: Record<string, unknown> = {
    event_type: "orderly_order_paid",
    reference_id: input.orderId,
    amount: input.total,
    currency: input.currency ?? "USD",
    timestamp: new Date().toISOString(),
    metadata: {
      erp: "orderly",
      tenant: input.tenantSlug,
      restaurant: input.tenantName,
      order_type: input.orderType,
      square_payment_id: input.squarePaymentId ?? undefined,
      square_order_id: input.squareOrderId ?? undefined,
      customer_name: input.customerName,
      item_count: input.items.length,
      items: input.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit_price: i.unitPrice,
      })),
    },
  };
  payload.content_hash = legacyContentHash(payload);

  try {
    const response = await fetch(BP_ANCHOR_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    if (response.status !== 200 && response.status !== 202) {
      return { ok: false, error: `BP anchor ${response.status}: ${text}` };
    }
    const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    return {
      ok: data.ok !== false,
      anchorId: typeof data.anchor_id === "string" ? data.anchor_id : undefined,
      contentHash:
        typeof data.content_hash === "string"
          ? data.content_hash
          : String(payload.content_hash),
      txHash: typeof data.tx_hash === "string" ? data.tx_hash : null,
      status: typeof data.status === "string" ? data.status : "queued",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "BP anchor request failed",
    };
  }
}
