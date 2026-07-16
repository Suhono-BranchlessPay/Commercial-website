/**
 * Anchor integrity (BranchlessPay Audit Shield):
 *  - content hash is deterministic & canonical (order-independent, excludes the
 *    content_hash field itself) so the same order always anchors identically.
 *  - refunds anchor a NEGATIVE amount that offsets the original order anchor.
 */
import {
  legacyContentHash,
  negativeAnchorAmount,
} from "../../src/integrations/branchlesspay";

describe("anchor: legacyContentHash determinism", () => {
  it("is independent of key insertion order (canonical, sorted keys)", () => {
    const a = legacyContentHash({ amount: 19.99, reference_id: "o1", currency: "USD" });
    const b = legacyContentHash({ currency: "USD", reference_id: "o1", amount: 19.99 });
    expect(a).toBe(b);
  });

  it("excludes the content_hash field from the hash (self-referential safety)", () => {
    const base = { event_type: "orderly_order_paid", reference_id: "o1", amount: 19.99 };
    const withHash = { ...base, content_hash: "deadbeef" };
    expect(legacyContentHash(base)).toBe(legacyContentHash(withHash));
  });

  it("produces a 64-char hex sha256 digest", () => {
    const h = legacyContentHash({ reference_id: "o1", amount: 1 });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when a material field changes", () => {
    const h1 = legacyContentHash({ reference_id: "o1", amount: 19.99 });
    const h2 = legacyContentHash({ reference_id: "o1", amount: 20.0 });
    expect(h1).not.toBe(h2);
  });
});

describe("anchor: refund is a negative offset", () => {
  it("normalizes any refund amount to negative", () => {
    expect(negativeAnchorAmount(19.99)).toBe(-19.99);
    expect(negativeAnchorAmount(-19.99)).toBe(-19.99);
    expect(negativeAnchorAmount(0)).toBe(-0);
    expect(Math.sign(negativeAnchorAmount(50))).toBe(-1);
  });

  it("coerces non-finite/garbage to 0 (never NaN into an anchor)", () => {
    expect(negativeAnchorAmount(undefined)).toBe(-0);
    expect(negativeAnchorAmount(null)).toBe(-0);
    expect(negativeAnchorAmount("abc")).toBe(-0);
    expect(Number.isNaN(negativeAnchorAmount("abc"))).toBe(false);
  });

  it("an order anchor and its refund anchor hash differently", () => {
    const orderHash = legacyContentHash({
      event_type: "orderly_order_paid",
      reference_id: "o1",
      amount: 19.99,
    });
    const refundHash = legacyContentHash({
      event_type: "orderly_order_refunded",
      reference_id: "o1:refund",
      amount: negativeAnchorAmount(19.99),
    });
    expect(orderHash).not.toBe(refundHash);
  });
});
