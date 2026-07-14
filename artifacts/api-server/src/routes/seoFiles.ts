import type { RequestHandler } from "express";
import { resolveTenant } from "../lib/tenant";
import { listIndexableTags } from "../lib/seoTags";
import { listIndexablePlaces } from "../lib/seoPlaces";
import { rebuildSeoTagsForTenant } from "../lib/seoTags";
import { rebuildSeoPlacesForTenant } from "../lib/seoPlaces";
import { logger } from "../lib/logger";

async function tenantFromReq(req: {
  headers: { host?: string; [k: string]: unknown };
  query: Record<string, unknown>;
}) {
  return resolveTenant({
    host: req.headers.host,
    slugHint:
      typeof req.headers["x-tenant-slug"] === "string"
        ? (req.headers["x-tenant-slug"] as string)
        : typeof req.query.tenant === "string"
          ? req.query.tenant
          : undefined,
    allowEnvFallback: true,
  });
}

async function ensureBuilt(
  tenant: NonNullable<Awaited<ReturnType<typeof resolveTenant>>>,
) {
  const [tags, places] = await Promise.all([
    listIndexableTags(tenant.id),
    listIndexablePlaces(tenant.id),
  ]);
  if (tags.length === 0) await rebuildSeoTagsForTenant(tenant);
  if (places.length === 0) await rebuildSeoPlacesForTenant(tenant);
}

/** Per-tenant robots.txt — disallow owner/account; point at sitemap. */
export const robotsTxtHandler: RequestHandler = async (req, res, next) => {
  try {
    const tenant = await tenantFromReq(req);
    if (!tenant) {
      res.status(404).type("text/plain").send("User-agent: *\nDisallow: /\n");
      return;
    }
    const body = `User-agent: *
Allow: /
Disallow: /owner
Disallow: /account
Disallow: /api/
Disallow: /dashboard
Disallow: /onboarding

Sitemap: https://${tenant.domain}/sitemap.xml
`;
    res
      .status(200)
      .type("text/plain; charset=utf-8")
      .setHeader("Cache-Control", "public, max-age=3600")
      .send(body);
  } catch (err) {
    logger.error({ err }, "robots.txt failed");
    next(err);
  }
};

/** Per-tenant sitemap.xml — home, menu, order, catering, tags, places. */
export const sitemapXmlHandler: RequestHandler = async (req, res, next) => {
  try {
    const tenant = await tenantFromReq(req);
    if (!tenant) {
      res.status(404).type("application/xml").send("<urlset/>");
      return;
    }
    await ensureBuilt(tenant);
    const [tags, places] = await Promise.all([
      listIndexableTags(tenant.id),
      listIndexablePlaces(tenant.id),
    ]);
    const base = `https://${tenant.domain}`;
    const urls: Array<{ loc: string; priority: string; changefreq: string }> = [
      { loc: `${base}/`, priority: "1.0", changefreq: "daily" },
      { loc: `${base}/menu`, priority: "0.9", changefreq: "daily" },
      { loc: `${base}/order`, priority: "0.8", changefreq: "weekly" },
      { loc: `${base}/catering`, priority: "0.6", changefreq: "monthly" },
    ];
    for (const t of tags) {
      urls.push({
        loc: `${base}/tags/${encodeURIComponent(t.slug)}`,
        priority: "0.7",
        changefreq: "weekly",
      });
    }
    for (const p of places) {
      urls.push({
        loc: `${base}/places/${encodeURIComponent(p.slug)}`,
        priority: "0.6",
        changefreq: "weekly",
      });
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;
    res
      .status(200)
      .type("application/xml; charset=utf-8")
      .setHeader("Cache-Control", "public, max-age=1800")
      .send(xml);
  } catch (err) {
    logger.error({ err }, "sitemap.xml failed");
    next(err);
  }
};
