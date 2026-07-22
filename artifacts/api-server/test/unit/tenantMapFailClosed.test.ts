import {
  resolveTenantIdForPageId,
} from "../../src/lib/socialConfig";
import { resolveTenantIdForGbpLocation } from "../../src/lib/gbpConfig";

describe("tenant map resolve (fail-closed)", () => {
  const prevMeta = process.env.META_PAGE_ID_TENANT_MAP_JSON;
  const prevGbp = process.env.GBP_LOCATION_ID_TENANT_MAP_JSON;
  const prevSocialDefault = process.env.SOCIAL_DEFAULT_TENANT_ID;
  const prevGbpDefault = process.env.GBP_DEFAULT_TENANT_ID;

  beforeEach(() => {
    delete process.env.META_PAGE_ID_TENANT_MAP_JSON;
    delete process.env.GBP_LOCATION_ID_TENANT_MAP_JSON;
    delete process.env.SOCIAL_DEFAULT_TENANT_ID;
    delete process.env.GBP_DEFAULT_TENANT_ID;
  });

  afterAll(() => {
    if (prevMeta == null) delete process.env.META_PAGE_ID_TENANT_MAP_JSON;
    else process.env.META_PAGE_ID_TENANT_MAP_JSON = prevMeta;
    if (prevGbp == null) delete process.env.GBP_LOCATION_ID_TENANT_MAP_JSON;
    else process.env.GBP_LOCATION_ID_TENANT_MAP_JSON = prevGbp;
    if (prevSocialDefault == null) delete process.env.SOCIAL_DEFAULT_TENANT_ID;
    else process.env.SOCIAL_DEFAULT_TENANT_ID = prevSocialDefault;
    if (prevGbpDefault == null) delete process.env.GBP_DEFAULT_TENANT_ID;
    else process.env.GBP_DEFAULT_TENANT_ID = prevGbpDefault;
  });

  test("Meta: mapped pageId → tenant", () => {
    process.env.META_PAGE_ID_TENANT_MAP_JSON = JSON.stringify({
      "1031895316670551": "samurai",
      "999": "kirin",
    });
    expect(resolveTenantIdForPageId("1031895316670551")).toBe("samurai");
    expect(resolveTenantIdForPageId("999")).toBe("kirin");
  });

  test("Meta: unmapped pageId → null (never samurai default)", () => {
    process.env.META_PAGE_ID_TENANT_MAP_JSON = JSON.stringify({
      "1031895316670551": "samurai",
    });
    process.env.SOCIAL_DEFAULT_TENANT_ID = "samurai";
    expect(resolveTenantIdForPageId("unmapped-page")).toBeNull();
    expect(resolveTenantIdForPageId(undefined)).toBeNull();
    expect(resolveTenantIdForPageId("")).toBeNull();
  });

  test("Meta: missing map JSON → null", () => {
    process.env.SOCIAL_DEFAULT_TENANT_ID = "samurai";
    expect(resolveTenantIdForPageId("1031895316670551")).toBeNull();
  });

  test("Meta: bad JSON → null", () => {
    process.env.META_PAGE_ID_TENANT_MAP_JSON = "{not-json";
    expect(resolveTenantIdForPageId("1031895316670551")).toBeNull();
  });

  test("GBP: mapped location → tenant", () => {
    process.env.GBP_LOCATION_ID_TENANT_MAP_JSON = JSON.stringify({
      "locations/12345": "samurai",
      "67890": "kirin",
    });
    expect(resolveTenantIdForGbpLocation("locations/12345")).toBe("samurai");
    expect(resolveTenantIdForGbpLocation("12345")).toBe("samurai");
    expect(resolveTenantIdForGbpLocation("67890")).toBe("kirin");
  });

  test("GBP: unmapped location → null (never samurai default)", () => {
    process.env.GBP_LOCATION_ID_TENANT_MAP_JSON = JSON.stringify({
      "locations/12345": "samurai",
    });
    process.env.GBP_DEFAULT_TENANT_ID = "samurai";
    expect(resolveTenantIdForGbpLocation("locations/999")).toBeNull();
    expect(resolveTenantIdForGbpLocation(null)).toBeNull();
    expect(resolveTenantIdForGbpLocation("")).toBeNull();
  });
});
