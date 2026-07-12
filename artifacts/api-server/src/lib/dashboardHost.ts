import type { RequestHandler } from "express";

/**
 * Orderly Master/Manager console is NOT a restaurant storefront.
 * It must only be served on Orderly hosts (orderlyfoods.com), never on
 * client domains like samurairesto.com.
 */
export function dashboardAllowedHosts(): string[] {
  const raw =
    process.env.ORDERLY_DASHBOARD_HOSTS?.trim() ||
    "orderlyfoods.com,www.orderlyfoods.com,localhost,127.0.0.1";
  return raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeRequestHost(hostHeader: string | undefined): string {
  if (!hostHeader) return "";
  return hostHeader.split(":")[0].trim().toLowerCase();
}

export function isOrderlyDashboardHost(hostHeader: string | undefined): boolean {
  const host = normalizeRequestHost(hostHeader);
  if (!host) return false;
  const allowed = dashboardAllowedHosts();
  return allowed.includes(host);
}

/** Block /api/dashboard/* unless Host is an Orderly console domain. */
export const requireOrderlyDashboardHost: RequestHandler = (req, res, next) => {
  if (isOrderlyDashboardHost(req.headers.host)) {
    next();
    return;
  }
  res.status(404).json({
    error:
      "Orderly console is not available on this restaurant domain. Use https://orderlyfoods.com/dashboard",
  });
};

/** Block /dashboard UI on client restaurant domains. */
export const requireOrderlyDashboardHostPage: RequestHandler = (
  req,
  res,
  next,
) => {
  if (isOrderlyDashboardHost(req.headers.host)) {
    next();
    return;
  }
  res
    .status(404)
    .type("html")
    .send(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="robots" content="noindex"/>
<title>Not available</title>
</head><body style="font-family:system-ui;padding:40px;max-width:520px">
<h1>Wrong domain</h1>
<p>This is a <b>restaurant</b> site. The Orderly Foods internal console lives at:</p>
<p><a href="https://orderlyfoods.com/dashboard">https://orderlyfoods.com/dashboard</a></p>
<p>Samurai staff tools: <a href="/owner">/owner</a> (PIN).</p>
</body></html>`);
};
