/**
 * Dashboard Connect Square for existing tenants (mirror GBP pattern).
 * Start: GET /api/dashboard/square/oauth/start?tenant_id=
 * Status: GET /api/dashboard/square/oauth/status?tenant_id=
 * Callback stays at /api/onboarding/square/callback (Square redirect URI).
 */
import { Router, type RequestHandler } from "express";
import {
  buildSquareAuthorizeUrl,
  checkSquareOauthReadiness,
  getSquareOauthConnectionForTenant,
  getSquareOauthAppConfig,
  signSquareTenantOauthState,
  squareOauthEnvironment,
} from "../lib/squareOauth";
import {
  readDashboardSessionToken,
  resolveDashboardSession,
  resolveScopedTenantId,
} from "../lib/dashboardAuth";
import { findTenantById, tenantSecret } from "../lib/tenant";

declare global {
  namespace Express {
    interface Request {
      squareOauthActor?: {
        label: string;
        role: "master" | "manager";
        tenantId: string | null;
      };
    }
  }
}

const router = Router();

const requireDashAccess: RequestHandler = async (req, res, next) => {
  try {
    const internalKey =
      process.env.SQUARE_OAUTH_INTERNAL_API_KEY?.trim() ||
      process.env.SOCIAL_INTERNAL_API_KEY?.trim();
    const headerKey =
      req.headers["x-square-oauth-internal-key"] ||
      req.headers["x-social-internal-key"];
    if (internalKey && typeof headerKey === "string" && headerKey === internalKey) {
      req.squareOauthActor = {
        label: "internal-key",
        role: "master",
        tenantId: null,
      };
      next();
      return;
    }
    const user = await resolveDashboardSession(readDashboardSessionToken(req));
    if (user) {
      req.squareOauthActor = {
        label: user.email,
        role: user.role,
        tenantId: user.tenantId,
      };
      next();
      return;
    }
    res.status(401).json({
      error:
        "Not authenticated. Sign in via /api/dashboard/login or send X-Square-Oauth-Internal-Key.",
    });
  } catch (err) {
    req.log?.error({ err }, "Square OAuth dash auth failed");
    res.status(500).json({ error: "Auth check failed" });
  }
};

router.use(requireDashAccess);

router.get("/oauth/status", async (req, res): Promise<void> => {
  try {
    const actor = req.squareOauthActor!;
    const requested =
      typeof req.query.tenant_id === "string" ? req.query.tenant_id.trim() : null;
    const scope = resolveScopedTenantId(
      { role: actor.role, tenantId: actor.tenantId },
      requested,
    );
    if (!scope.ok) {
      res.status(403).json({ error: scope.error });
      return;
    }
    const tenantId = scope.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: "Pick a single tenant_id." });
      return;
    }
    const tenant = await findTenantById(tenantId);
    const oauthRow = await getSquareOauthConnectionForTenant(tenantId);
    const slug = tenant?.slug || tenantId;
    const envToken = Boolean(tenantSecret(slug, "SQUARE_ACCESS_TOKEN"));
    const ready = checkSquareOauthReadiness();
    res.json({
      ok: true,
      tenant_id: tenantId,
      oauth_app_configured: ready.ok,
      oauth_app_error: ready.ok ? null : ready.error,
      environment: squareOauthEnvironment(),
      oauth_connected: Boolean(oauthRow),
      env_token_configured: envToken,
      location_id: oauthRow?.locationId ?? null,
      merchant_id: oauthRow?.merchantId ?? null,
      location_name:
        oauthRow?.meta && typeof oauthRow.meta === "object"
          ? String(
              (oauthRow.meta as Record<string, unknown>).locationName ?? "",
            ) || null
          : null,
      connected_via:
        oauthRow?.meta && typeof oauthRow.meta === "object"
          ? String(
              (oauthRow.meta as Record<string, unknown>).connectedVia ?? "",
            ) || null
          : null,
      note: envToken
        ? "Env TENANT_*_SQUARE_* takes precedence over OAuth DB tokens at charge time."
        : oauthRow
          ? "Orders will use encrypted OAuth tokens from square_oauth_connections."
          : "Not connected — use Connect Square.",
    });
  } catch (err) {
    req.log?.error({ err }, "Square OAuth status failed");
    res.status(500).json({ error: "Status failed" });
  }
});

router.get("/oauth/start", async (req, res): Promise<void> => {
  try {
    const ready = checkSquareOauthReadiness();
    if (!ready.ok) {
      res.status(503).json({ error: ready.error });
      return;
    }
    if (!getSquareOauthAppConfig()) {
      res.status(503).json({ error: "Square OAuth app not configured" });
      return;
    }
    const actor = req.squareOauthActor!;
    const requested =
      typeof req.query.tenant_id === "string" ? req.query.tenant_id.trim() : null;
    const scope = resolveScopedTenantId(
      { role: actor.role, tenantId: actor.tenantId },
      requested,
    );
    if (!scope.ok) {
      res.status(403).json({ error: scope.error });
      return;
    }
    const tenantId = scope.tenantId;
    if (!tenantId) {
      res.status(400).json({
        error: "Pick a single tenant (tenant_id) to connect Square.",
      });
      return;
    }
    const tenant = await findTenantById(tenantId);
    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    const authorizeUrl = buildSquareAuthorizeUrl(
      signSquareTenantOauthState(tenantId),
    );
    if (req.query.json === "1") {
      res.json({ ok: true, authorize_url: authorizeUrl, tenant_id: tenantId });
      return;
    }
    res.redirect(authorizeUrl);
  } catch (err) {
    req.log?.error({ err }, "Square OAuth dash start failed");
    res.status(500).json({ error: "Could not start Square OAuth." });
  }
});

export default router;
