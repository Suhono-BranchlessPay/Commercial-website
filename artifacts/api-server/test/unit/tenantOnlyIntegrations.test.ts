import {
  isBpAnchorConfigured,
  isBranchlesspayConfigured,
} from "../../src/integrations/branchlesspay";
import { isDoordashConfigured } from "../../src/integrations/doordash";

describe("BranchlessPay + DoorDash tenantOnlySecret", () => {
  const keys = [
    "BRANCHLESSPAY_LICENSE_KEY",
    "BP_LICENSE_KEY",
    "BRANCHLESSPAY_API_KEY",
    "BRANCHLESSPAY_MERCHANT_ID",
    "TENANT_SAMURAI_BRANCHLESSPAY_LICENSE_KEY",
    "TENANT_SAMURAI_BP_LICENSE_KEY",
    "TENANT_SAMURAI_BRANCHLESSPAY_API_KEY",
    "TENANT_SAMURAI_BRANCHLESSPAY_MERCHANT_ID",
    "TENANT_KIRIN_BRANCHLESSPAY_LICENSE_KEY",
    "DOORDASH_DEVELOPER_ID",
    "DOORDASH_KEY_ID",
    "DOORDASH_SIGNING_SECRET",
    "TENANT_SAMURAI_DOORDASH_DEVELOPER_ID",
    "TENANT_SAMURAI_DOORDASH_KEY_ID",
    "TENANT_SAMURAI_DOORDASH_SIGNING_SECRET",
    "TENANT_KIRIN_DOORDASH_DEVELOPER_ID",
    "TENANT_KIRIN_DOORDASH_KEY_ID",
    "TENANT_KIRIN_DOORDASH_SIGNING_SECRET",
  ] as const;

  const prev: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of keys) {
      prev[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterAll(() => {
    for (const k of keys) {
      if (prev[k] == null) delete process.env[k];
      else process.env[k] = prev[k];
    }
  });

  test("BP: global LICENSE_KEY ignored; tenant-prefixed used", () => {
    process.env.BRANCHLESSPAY_LICENSE_KEY = "global-must-never-win";
    expect(isBpAnchorConfigured("samurai")).toBe(false);
    process.env.TENANT_SAMURAI_BRANCHLESSPAY_LICENSE_KEY = "samurai-key";
    expect(isBpAnchorConfigured("samurai")).toBe(true);
    expect(isBpAnchorConfigured("kirin")).toBe(false);
  });

  test("BP shield: global API/MERCHANT ignored", () => {
    process.env.BRANCHLESSPAY_API_KEY = "global-api";
    process.env.BRANCHLESSPAY_MERCHANT_ID = "global-merchant";
    expect(isBranchlesspayConfigured("samurai")).toBe(false);
    process.env.TENANT_SAMURAI_BRANCHLESSPAY_API_KEY = "s-api";
    process.env.TENANT_SAMURAI_BRANCHLESSPAY_MERCHANT_ID = "s-merch";
    expect(isBranchlesspayConfigured("samurai")).toBe(true);
    expect(isBranchlesspayConfigured("kirin")).toBe(false);
  });

  test("DoorDash: global creds ignored; tenant-prefixed used", () => {
    process.env.DOORDASH_DEVELOPER_ID = "g-dev";
    process.env.DOORDASH_KEY_ID = "g-key";
    process.env.DOORDASH_SIGNING_SECRET = "g-secret";
    expect(isDoordashConfigured("samurai")).toBe(false);
    process.env.TENANT_SAMURAI_DOORDASH_DEVELOPER_ID = "s-dev";
    process.env.TENANT_SAMURAI_DOORDASH_KEY_ID = "s-key";
    process.env.TENANT_SAMURAI_DOORDASH_SIGNING_SECRET = "s-secret";
    expect(isDoordashConfigured("samurai")).toBe(true);
    expect(isDoordashConfigured("kirin")).toBe(false);
  });
});
