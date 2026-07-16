/**
 * Menu sync from Square — the two things that hurt customers if wrong:
 *  - price accuracy (Square integer cents -> dollars)
 *  - 86'd / removed items must become unavailable (never sell what's out).
 */
import {
  centsToDollars,
  isPresentAtLocation,
  isVariationSoldOutAtLocation,
} from "../../src/lib/squareMenuSync";

const LOC = "LP2H0BGFJFQ1X";

describe("menu sync: price mapping (integer cents -> dollars)", () => {
  it("maps Square money amounts exactly", () => {
    expect(centsToDollars({ amount: 1999 } as any)).toBe(19.99);
    expect(centsToDollars({ amount: 500 } as any)).toBe(5);
    expect(centsToDollars({ amount: 1 } as any)).toBe(0.01);
  });

  it("treats missing/zero price as 0 (never NaN)", () => {
    expect(centsToDollars(undefined)).toBe(0);
    expect(centsToDollars({ amount: 0 } as any)).toBe(0);
  });
});

describe("menu sync: 86'd / sold-out detection", () => {
  it("flags a variation sold out via location override", () => {
    const variation = {
      item_variation_data: {
        location_overrides: [{ location_id: LOC, sold_out: true }],
      },
    } as any;
    expect(isVariationSoldOutAtLocation(variation, LOC)).toBe(true);
  });

  it("is not sold out when there is no override for this location", () => {
    const variation = {
      item_variation_data: {
        location_overrides: [{ location_id: "OTHER", sold_out: true }],
      },
    } as any;
    expect(isVariationSoldOutAtLocation(variation, LOC)).toBe(false);

    const noOverrides = { item_variation_data: {} } as any;
    expect(isVariationSoldOutAtLocation(noOverrides, LOC)).toBe(false);
  });
});

describe("menu sync: presence at location", () => {
  it("absent_at_location_ids removes the item", () => {
    expect(isPresentAtLocation({ absent_at_location_ids: [LOC] } as any, LOC)).toBe(false);
  });

  it("present_at_all_locations=false requires explicit inclusion", () => {
    expect(
      isPresentAtLocation(
        { present_at_all_locations: false, present_at_location_ids: [LOC] } as any,
        LOC,
      ),
    ).toBe(true);
    expect(
      isPresentAtLocation(
        { present_at_all_locations: false, present_at_location_ids: ["OTHER"] } as any,
        LOC,
      ),
    ).toBe(false);
  });

  it("defaults to present when nothing restricts it", () => {
    expect(isPresentAtLocation({} as any, LOC)).toBe(true);
  });
});

describe("menu sync: composite availability (the 86'd rule)", () => {
  // Mirrors syncSquareMenuForTenant:
  // available = !isArchived && itemPresent && variationPresent && !soldOut
  function isAvailable(item: any, variation: any, locationId: string): boolean {
    const isArchived = Boolean(item.item_data?.is_archived);
    const itemPresent = isPresentAtLocation(item, locationId);
    const variationPresent = isPresentAtLocation(variation, locationId);
    const soldOut = isVariationSoldOutAtLocation(variation, locationId);
    return !isArchived && itemPresent && variationPresent && !soldOut;
  }

  it("a normal item+variation is available", () => {
    expect(isAvailable({ item_data: {} }, { item_variation_data: {} }, LOC)).toBe(true);
  });

  it("a sold-out variation is NOT available (86'd)", () => {
    const variation = {
      item_variation_data: {
        location_overrides: [{ location_id: LOC, sold_out: true }],
      },
    };
    expect(isAvailable({ item_data: {} }, variation, LOC)).toBe(false);
  });

  it("an archived item is NOT available", () => {
    expect(
      isAvailable({ item_data: { is_archived: true } }, { item_variation_data: {} }, LOC),
    ).toBe(false);
  });

  it("an item absent at this location is NOT available", () => {
    expect(
      isAvailable({ item_data: {}, absent_at_location_ids: [LOC] }, { item_variation_data: {} }, LOC),
    ).toBe(false);
  });
});
