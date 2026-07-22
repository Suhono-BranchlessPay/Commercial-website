import { encryptToken } from "../../src/lib/tokenCrypto";

jest.mock("../../src/lib/gbpOauth", () => ({
  getGbpOauthConnection: jest.fn(),
}));

import { getGbpOauthConnection } from "../../src/lib/gbpOauth";
import {
  getGbpAccessToken,
  resolveGbpAccessToken,
  resolveGbpLocationResource,
} from "../../src/lib/gbpConfig";

describe("resolveGbpAccessToken (DB first, tenantOnly)", () => {
  const encKey = "test-orderly-token-encryption-key-gbp";
  const prevEnc = process.env.ORDERLY_TOKEN_ENCRYPTION_KEY;
  const prevGlobalAccess = process.env.GBP_ACCESS_TOKEN;
  const prevGlobalRefresh = process.env.GBP_REFRESH_TOKEN;
  const prevGlobalLoc = process.env.GBP_LOCATION_RESOURCE;
  const prevTenantAccess = process.env.TENANT_SAMURAI_GBP_ACCESS_TOKEN;
  const prevTenantRefresh = process.env.TENANT_SAMURAI_GBP_REFRESH_TOKEN;
  const prevTenantLoc = process.env.TENANT_SAMURAI_GBP_LOCATION_RESOURCE;
  const prevClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const prevClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  beforeEach(() => {
    process.env.ORDERLY_TOKEN_ENCRYPTION_KEY = encKey;
    delete process.env.GBP_ACCESS_TOKEN;
    delete process.env.GBP_REFRESH_TOKEN;
    delete process.env.GBP_LOCATION_RESOURCE;
    delete process.env.TENANT_SAMURAI_GBP_ACCESS_TOKEN;
    delete process.env.TENANT_SAMURAI_GBP_REFRESH_TOKEN;
    delete process.env.TENANT_SAMURAI_GBP_LOCATION_RESOURCE;
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    jest.resetAllMocks();
  });

  afterAll(() => {
    if (prevEnc == null) delete process.env.ORDERLY_TOKEN_ENCRYPTION_KEY;
    else process.env.ORDERLY_TOKEN_ENCRYPTION_KEY = prevEnc;
    if (prevGlobalAccess == null) delete process.env.GBP_ACCESS_TOKEN;
    else process.env.GBP_ACCESS_TOKEN = prevGlobalAccess;
    if (prevGlobalRefresh == null) delete process.env.GBP_REFRESH_TOKEN;
    else process.env.GBP_REFRESH_TOKEN = prevGlobalRefresh;
    if (prevGlobalLoc == null) delete process.env.GBP_LOCATION_RESOURCE;
    else process.env.GBP_LOCATION_RESOURCE = prevGlobalLoc;
    if (prevTenantAccess == null) delete process.env.TENANT_SAMURAI_GBP_ACCESS_TOKEN;
    else process.env.TENANT_SAMURAI_GBP_ACCESS_TOKEN = prevTenantAccess;
    if (prevTenantRefresh == null)
      delete process.env.TENANT_SAMURAI_GBP_REFRESH_TOKEN;
    else process.env.TENANT_SAMURAI_GBP_REFRESH_TOKEN = prevTenantRefresh;
    if (prevTenantLoc == null)
      delete process.env.TENANT_SAMURAI_GBP_LOCATION_RESOURCE;
    else process.env.TENANT_SAMURAI_GBP_LOCATION_RESOURCE = prevTenantLoc;
    if (prevClientId == null) delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    else process.env.GOOGLE_OAUTH_CLIENT_ID = prevClientId;
    if (prevClientSecret == null) delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    else process.env.GOOGLE_OAUTH_CLIENT_SECRET = prevClientSecret;
  });

  test("never uses global GBP_ACCESS_TOKEN", () => {
    process.env.GBP_ACCESS_TOKEN = "global-must-never-win";
    expect(getGbpAccessToken("samurai")).toBeUndefined();
  });

  test("tenant-prefixed access token used when no DB", async () => {
    (getGbpOauthConnection as jest.Mock).mockResolvedValue(null);
    process.env.GBP_ACCESS_TOKEN = "global-must-never-win";
    process.env.TENANT_SAMURAI_GBP_ACCESS_TOKEN = "samurai-only";
    const tok = await resolveGbpAccessToken("samurai");
    expect(tok).toBe("samurai-only");
  });

  test("OAuth DB refresh wins over tenant env access token", async () => {
    process.env.TENANT_SAMURAI_GBP_ACCESS_TOKEN = "env-should-lose";
    process.env.GOOGLE_OAUTH_CLIENT_ID = "cid";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "csec";
    (getGbpOauthConnection as jest.Mock).mockResolvedValue({
      tenantId: "samurai",
      refreshTokenEnc: encryptToken("db-refresh"),
      locationResource: "accounts/1/locations/2",
    });

    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "db-minted-token", expires_in: 3600 }),
    } as Response);

    const tok = await resolveGbpAccessToken("samurai");
    expect(tok).toBe("db-minted-token");
    expect(fetchMock).toHaveBeenCalled();
    const body = (fetchMock.mock.calls[0][1] as RequestInit).body as string;
    expect(body).toContain("refresh_token=db-refresh");
    fetchMock.mockRestore();
  });

  test("location: DB wins over tenant env; global ignored", async () => {
    process.env.GBP_LOCATION_RESOURCE = "global/loc";
    process.env.TENANT_SAMURAI_GBP_LOCATION_RESOURCE = "env/loc";
    (getGbpOauthConnection as jest.Mock).mockResolvedValue({
      locationResource: "accounts/db/locations/db",
    });
    const loc = await resolveGbpLocationResource("samurai");
    expect(loc).toBe("accounts/db/locations/db");
  });

  test("location: tenant env when no DB; global ignored", async () => {
    process.env.GBP_LOCATION_RESOURCE = "global/loc";
    process.env.TENANT_SAMURAI_GBP_LOCATION_RESOURCE = "env/loc";
    (getGbpOauthConnection as jest.Mock).mockResolvedValue(null);
    const loc = await resolveGbpLocationResource("samurai");
    expect(loc).toBe("env/loc");
  });
});
