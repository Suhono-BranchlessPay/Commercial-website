/**
 * Blok 4.2 — Google Business Profile trial config.
 *
 * Access tokens are resolved in this order (first hit wins):
 *   1. Self-serve OAuth connection in gbp_oauth_connections (encrypted refresh)
 *   2. TENANT_{ID}_GBP_ACCESS_TOKEN (manual short-lived — tenant-prefixed only)
 *   3. TENANT_{ID}_GBP_REFRESH_TOKEN + GOOGLE_OAUTH_CLIENT_ID/SECRET
 * Never use global GBP_* env (cross-tenant leak). Minted access tokens live
 * in-memory only. See docs/BLOK4_GBP_TRIAL.md.
 */
import { tenantOnlySecret } from "./tenant";
import { getGbpOauthConnection } from "./gbpOauth";
import { decryptToken } from "./tokenCrypto";
import { getGbpUnmappedSkipStats } from "./webhookUnmappedStats";

/** Hard-coded trial allow-list (same as social 4.1). */
export const GBP_TRIAL_TENANT_IDS = ["samurai"] as const;

export function isGbpTrialTenant(tenantId: string | null | undefined): boolean {
  return Boolean(tenantId) && (GBP_TRIAL_TENANT_IDS as readonly string[]).includes(tenantId as string);
}

export function isGbpKillSwitchOn(tenantId: string): boolean {
  const key = `GBP_KILL_SWITCH_${tenantId.toUpperCase()}`;
  return process.env[key]?.trim() === "1";
}

/** Global off-by-default send gate. */
export function isGbpSendGloballyEnabled(): boolean {
  return process.env.GBP_SEND_ENABLED?.trim() === "1";
}

/** Auto-draft each freshly ingested review/question. ON by default (still human-approve). */
export function isGbpAutoDraftEnabled(): boolean {
  const v = process.env.GBP_AUTO_DRAFT_ENABLED?.trim();
  return v !== "0" && v !== "false";
}

/**
 * Google Business Profile location resource for a tenant, e.g.
 * "accounts/1234567890/locations/9876543210". Used to list reviews.
 * Tenant-prefixed env only — no global GBP_LOCATION_RESOURCE fallback.
 */
export function getGbpLocationResource(tenantId: string): string | undefined {
  return tenantOnlySecret(tenantId, "GBP_LOCATION_RESOURCE");
}

/** Tenant-prefixed manual/short-lived access token (no global fallback). */
export function getGbpAccessToken(tenantId: string): string | undefined {
  return tenantOnlySecret(tenantId, "GBP_ACCESS_TOKEN");
}

/** Long-lived OAuth refresh token from tenant-prefixed env only. */
function getGbpRefreshToken(tenantId: string): string | undefined {
  return tenantOnlySecret(tenantId, "GBP_REFRESH_TOKEN");
}

function getGoogleOAuthClient(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

// Short-lived access tokens minted from the refresh token, cached in-memory.
const accessTokenCache = new Map<string, { token: string; expiresAt: number }>();

/** Exchange a refresh token for a short-lived access token (cached per key). */
async function mintAccessTokenFromRefresh(
  cacheKey: string,
  refreshToken: string,
): Promise<string | undefined> {
  const client = getGoogleOAuthClient();
  if (!client) return undefined;

  const now = Date.now();
  const cached = accessTokenCache.get(cacheKey);
  if (cached && cached.expiresAt > now + 60_000) return cached.token;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: client.clientId,
        client_secret: client.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return undefined;
    const expiresAt = now + (json.expires_in ?? 3600) * 1000;
    accessTokenCache.set(cacheKey, { token: json.access_token, expiresAt });
    return json.access_token;
  } catch {
    return undefined;
  }
}

/**
 * Resolve a usable Google access token for a tenant. Tries (in order):
 * self-serve OAuth DB, then tenant-prefixed env access/refresh.
 * Returns undefined when nothing is configured (send/sync then 501).
 */
export async function resolveGbpAccessToken(tenantId: string): Promise<string | undefined> {
  try {
    const conn = await getGbpOauthConnection(tenantId);
    if (conn?.refreshTokenEnc) {
      const refresh = decryptToken(conn.refreshTokenEnc);
      const tok = await mintAccessTokenFromRefresh(`${tenantId}:db`, refresh);
      if (tok) return tok;
    }
  } catch {
    /* non-fatal — fall through to tenant env */
  }

  const manual = getGbpAccessToken(tenantId);
  if (manual) return manual;

  const envRefresh = getGbpRefreshToken(tenantId);
  if (envRefresh) {
    const tok = await mintAccessTokenFromRefresh(`${tenantId}:env`, envRefresh);
    if (tok) return tok;
  }

  return undefined;
}

/**
 * Resolve the Business Profile location resource for a tenant. Prefers the
 * self-serve OAuth connection, then tenant-prefixed env override.
 */
export async function resolveGbpLocationResource(
  tenantId: string,
): Promise<string | undefined> {
  try {
    const conn = await getGbpOauthConnection(tenantId);
    if (conn?.locationResource) return conn.locationResource;
  } catch {
    /* non-fatal */
  }
  return getGbpLocationResource(tenantId);
}

/**
 * Map Google Business Profile location resource name / id → tenant.
 * Example: {"locations/12345":"samurai"} or {"12345":"samurai"}
 * Fail-closed: unmapped / missing / bad JSON → null (caller must drop).
 */
export function resolveTenantIdForGbpLocation(
  locationId: string | null | undefined,
): string | null {
  if (!locationId?.trim()) return null;
  const raw = process.env.GBP_LOCATION_ID_TENANT_MAP_JSON?.trim();
  if (!raw) return null;
  try {
    const map = JSON.parse(raw) as Record<string, string>;
    const id = locationId.trim();
    const bare = id.replace(/^locations\//, "");
    const hit =
      map[id] ||
      map[bare] ||
      map[`locations/${bare}`];
    if (hit && typeof hit === "string" && hit.trim()) return hit.trim();
  } catch {
    /* bad JSON → fail closed */
  }
  return null;
}

export async function buildGbpHealth(tenantIds: readonly string[]) {
  const oauthAppConfigured = Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim(),
  );
  const tenants = await Promise.all(
    tenantIds.map(async (tenant_id) => {
      let dbConnected = false;
      let dbGoogleEmail: string | null = null;
      let dbLocation: string | null = null;
      try {
        const conn = await getGbpOauthConnection(tenant_id);
        dbConnected = Boolean(conn?.refreshTokenEnc);
        dbGoogleEmail = conn?.googleEmail ?? null;
        dbLocation = conn?.locationResource ?? null;
      } catch {
        /* non-fatal — report as not connected */
      }
      return {
        tenant_id,
        kill_switch: isGbpKillSwitchOn(tenant_id),
        send_globally_enabled: isGbpSendGloballyEnabled(),
        gbp_token_configured: Boolean(getGbpAccessToken(tenant_id)),
        gbp_oauth_configured: Boolean(
          tenantOnlySecret(tenant_id, "GBP_REFRESH_TOKEN") && oauthAppConfigured,
        ),
        // Self-serve OAuth connection (Stage 2).
        oauth_app_configured: oauthAppConfigured,
        oauth_connected: dbConnected,
        google_email: dbGoogleEmail,
        gbp_location_configured: Boolean(
          getGbpLocationResource(tenant_id) || dbLocation,
        ),
        trial: isGbpTrialTenant(tenant_id),
      };
    }),
  );
  return {
    send_globally_enabled: isGbpSendGloballyEnabled(),
    auto_draft_enabled: isGbpAutoDraftEnabled(),
    oauth_app_configured: oauthAppConfigured,
    tenants,
    webhook_unmapped_skips: getGbpUnmappedSkipStats(),
  };
}
