/**
 * Closed-loop deep link (social/QR post of a single item -> land ON that item,
 * add-to-cart ready). Guards the buildTrackedUrl `item=` param + sanitizers so
 * this conversion path can't silently regress back to the generic menu.
 */
import {
  buildTrackedUrl,
  sanitizeMenuItemQueryId,
  buildSrcTag,
  slugifyItemName,
} from "../../src/lib/socialPostDraft";

describe("deep-link: buildTrackedUrl", () => {
  it("appends the item id so the landing opens that item", () => {
    const url = buildTrackedUrl({
      domain: "https://samurairesto.com",
      tenantSlug: "samurai",
      srcTag: "fb-omgroll-20260716",
      menuItemId: "mi_123",
    });
    expect(url).toBe(
      "https://samurairesto.com/r/samurai?src=fb-omgroll-20260716&item=mi_123",
    );
  });

  it("omits item when no menu item is given (generic menu link)", () => {
    const url = buildTrackedUrl({
      domain: "samurairesto.com",
      tenantSlug: "samurai",
      srcTag: "fb-generic-20260716",
    });
    expect(url).toContain("/r/samurai?src=fb-generic-20260716");
    expect(url).not.toContain("item=");
  });

  it("drops an unsafe item id rather than emitting a broken/injected param", () => {
    const url = buildTrackedUrl({
      domain: "samurairesto.com",
      tenantSlug: "samurai",
      srcTag: "fb-x-20260716",
      menuItemId: "bad id with spaces & stuff",
    });
    expect(url).not.toContain("item=");
  });

  it("normalizes the domain (strips scheme + trailing slash)", () => {
    const url = buildTrackedUrl({
      domain: "https://samurairesto.com/",
      tenantSlug: "samurai",
      srcTag: "s",
    });
    expect(url.startsWith("https://samurairesto.com/r/samurai")).toBe(true);
  });
});

describe("deep-link: sanitizeMenuItemQueryId", () => {
  it("accepts safe ids (alnum, dot, underscore, dash)", () => {
    expect(sanitizeMenuItemQueryId("mi_123")).toBe("mi_123");
    expect(sanitizeMenuItemQueryId("sqvar_ABC-1.2")).toBe("sqvar_ABC-1.2");
  });

  it("rejects empty / unsafe ids", () => {
    expect(sanitizeMenuItemQueryId("")).toBeNull();
    expect(sanitizeMenuItemQueryId("  ")).toBeNull();
    expect(sanitizeMenuItemQueryId("has space")).toBeNull();
    expect(sanitizeMenuItemQueryId("../etc")).toBeNull();
    expect(sanitizeMenuItemQueryId(null)).toBeNull();
    expect(sanitizeMenuItemQueryId(undefined)).toBeNull();
  });
});

describe("deep-link: src tag", () => {
  const fixedDate = new Date("2026-07-16T12:00:00.000Z");

  it("builds a platform-prefixed, dated, slugged src tag", () => {
    expect(
      buildSrcTag({ platform: "facebook", itemName: "OMG Roll", date: fixedDate }),
    ).toBe("fb-omgroll-20260716");
    expect(
      buildSrcTag({ platform: "instagram", itemName: "Beef Bento Box", date: fixedDate }),
    ).toBe("ig-beefbentobox-20260716");
  });

  it("slugifies item names to url-safe tokens", () => {
    expect(slugifyItemName("OMG Roll!")).toBe("omgroll");
    expect(slugifyItemName("Café Sushi #1")).toBe("cafsushi1");
    expect(slugifyItemName("")).toBe("item");
  });
});
