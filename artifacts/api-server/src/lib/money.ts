/**
 * Money helpers — store and compute in integer cents only.
 * Tip is restaurant money; delivery_fee is customer-paid; platform/processing fees are 0 until Stripe.
 */
export type OrderMoneyCents = {
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  platformFeeCents: number;
  deliveryFeeCents: number;
  processingFeeCents: number;
  discountCents: number;
  totalCents: number;
};

/** Convert a dollar float to cents (banker's round via Math.round). */
export function dollarsToCents(dollars: number): number {
  return Math.round(Number(dollars) * 100);
}

/** Convert cents to dollar float for legacy Square/API fields. */
export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Build canonical money snapshot at order-create time.
 * totalCents = subtotal + tax + tip + deliveryFee + platformFee + processingFee - discount
 * (tip stays restaurant-owned; still included in customer-facing total when charged).
 */
export function buildOrderMoneyCents(input: {
  subtotalCents: number;
  taxCents: number;
  tipCents?: number;
  platformFeeCents?: number;
  deliveryFeeCents?: number;
  processingFeeCents?: number;
  discountCents?: number;
  /** If Square charged a different amount, prefer that as totalCents. */
  chargedTotalCents?: number;
}): OrderMoneyCents {
  const subtotalCents = Math.max(0, Math.round(input.subtotalCents));
  const taxCents = Math.max(0, Math.round(input.taxCents));
  const tipCents = Math.max(0, Math.round(input.tipCents ?? 0));
  const platformFeeCents = Math.max(0, Math.round(input.platformFeeCents ?? 0));
  const deliveryFeeCents = Math.max(0, Math.round(input.deliveryFeeCents ?? 0));
  const processingFeeCents = Math.max(0, Math.round(input.processingFeeCents ?? 0));
  const discountCents = Math.max(0, Math.round(input.discountCents ?? 0));

  const computed =
    subtotalCents +
    taxCents +
    tipCents +
    deliveryFeeCents +
    platformFeeCents +
    processingFeeCents -
    discountCents;

  const totalCents =
    input.chargedTotalCents != null
      ? Math.max(0, Math.round(input.chargedTotalCents))
      : Math.max(0, computed);

  return {
    subtotalCents,
    taxCents,
    tipCents,
    platformFeeCents,
    deliveryFeeCents,
    processingFeeCents,
    discountCents,
    totalCents,
  };
}
