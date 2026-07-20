/**
 * Per-tenant sales tax — fail-closed.
 * Missing / invalid rate → checkout must refuse (not invent 7% from Samurai).
 */

export type TaxRateSource = {
  taxRate?: number | null;
};

/**
 * Returns a finite rate in (0, 0.25], or null if the tenant must not charge.
 * 0 is allowed only if explicitly stored (tax-exempt edge); null = not configured.
 */
export function resolveTenantTaxRate(
  tenant: TaxRateSource | null | undefined,
): number | null {
  const r = tenant?.taxRate;
  if (r == null || Number.isNaN(Number(r))) return null;
  const n = Number(r);
  if (!Number.isFinite(n) || n < 0 || n > 0.25) return null;
  return n;
}

export function taxRateLabel(rate: number): string {
  const pct = rate * 100;
  const rounded = Math.round(pct * 1000) / 1000;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded}%`;
}
