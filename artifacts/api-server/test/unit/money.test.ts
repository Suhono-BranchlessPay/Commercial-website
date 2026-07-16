/**
 * Money path — the most expensive thing to get wrong. Verifies integer-cents
 * math, tip resolution/caps, discounts, and the "charged amount is the single
 * source of truth" rule (no recompute drift, no accidental double-add of tip).
 */
import {
  dollarsToCents,
  centsToDollars,
  buildOrderMoneyCents,
} from "../../src/lib/money";
import { resolveTipCents } from "../../src/lib/orderSeams";

describe("money: dollars <-> integer cents", () => {
  it("converts dollars to integer cents", () => {
    expect(dollarsToCents(19.99)).toBe(1999);
    expect(dollarsToCents(8.99)).toBe(899);
    expect(dollarsToCents(0)).toBe(0);
    expect(dollarsToCents(0.1)).toBe(10);
  });

  it("always returns an integer number of cents", () => {
    for (const d of [1.005, 2.675, 9.999, 0.245, 123.456]) {
      const c = dollarsToCents(d);
      expect(Number.isInteger(c)).toBe(true);
    }
  });

  it("round-trips cents to dollars", () => {
    expect(centsToDollars(1999)).toBe(19.99);
    expect(centsToDollars(0)).toBe(0);
    expect(centsToDollars(5)).toBe(0.05);
  });
});

describe("money: buildOrderMoneyCents", () => {
  it("totals = subtotal + tax + tip + fees - discount", () => {
    const m = buildOrderMoneyCents({
      subtotalCents: 1000,
      taxCents: 70,
      tipCents: 200,
      deliveryFeeCents: 300,
      platformFeeCents: 50,
      processingFeeCents: 30,
      discountCents: 100,
    });
    // 1000 + 70 + 200 + 300 + 50 + 30 - 100
    expect(m.totalCents).toBe(1550);
    expect(m.subtotalCents).toBe(1000);
    expect(m.tipCents).toBe(200);
    expect(m.discountCents).toBe(100);
  });

  it("defaults optional components to 0", () => {
    const m = buildOrderMoneyCents({ subtotalCents: 1500, taxCents: 105 });
    expect(m.tipCents).toBe(0);
    expect(m.deliveryFeeCents).toBe(0);
    expect(m.totalCents).toBe(1605);
  });

  it("prefers the actually-charged total (no recompute drift)", () => {
    const m = buildOrderMoneyCents({
      subtotalCents: 1000,
      taxCents: 70,
      tipCents: 200,
      chargedTotalCents: 1275, // authoritative amount Square actually charged
    });
    expect(m.totalCents).toBe(1275);
  });

  it("clamps negatives to zero (never a negative charge)", () => {
    const m = buildOrderMoneyCents({
      subtotalCents: -500,
      taxCents: -10,
      discountCents: 999999,
    });
    expect(m.subtotalCents).toBe(0);
    expect(m.taxCents).toBe(0);
    expect(m.totalCents).toBe(0);
  });

  it("keeps every component an integer", () => {
    const m = buildOrderMoneyCents({
      subtotalCents: 1000.6,
      taxCents: 70.4,
      tipCents: 199.5,
    });
    for (const v of Object.values(m)) {
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe("money: resolveTipCents", () => {
  it("uses explicit tip cents when provided", () => {
    expect(resolveTipCents({ subtotalCents: 2000, tipCents: 350 })).toBe(350);
  });

  it("computes tip from a percentage of subtotal (rounded to cents)", () => {
    expect(resolveTipCents({ subtotalCents: 1000, tipPercent: 15 })).toBe(150);
    expect(resolveTipCents({ subtotalCents: 999, tipPercent: 15 })).toBe(150); // 149.85 -> 150
    expect(resolveTipCents({ subtotalCents: 2000, tipPercent: 20 })).toBe(400);
  });

  it("defaults to 0 tip when nothing is provided", () => {
    expect(resolveTipCents({ subtotalCents: 2000 })).toBe(0);
  });

  it("never returns a negative tip", () => {
    expect(resolveTipCents({ subtotalCents: 2000, tipCents: -500 })).toBe(0);
    expect(resolveTipCents({ subtotalCents: 2000, tipPercent: -10 })).toBe(0);
  });

  it("caps an absurd tip (floor cap of $200 for small carts)", () => {
    expect(resolveTipCents({ subtotalCents: 1000, tipCents: 999999 })).toBe(
      20000,
    );
    // percent over 100 is clamped to 100% of subtotal, then the cap applies
    expect(resolveTipCents({ subtotalCents: 1000, tipPercent: 500 })).toBe(1000);
  });
});
