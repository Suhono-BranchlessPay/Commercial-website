import type { RequestHandler } from "express";
import { resolveTenant } from "../lib/tenant";
import { listIndexableTags } from "../lib/seoTags";
import { listIndexablePlaces } from "../lib/seoPlaces";
import { rebuildSeoTagsForTenant } from "../lib/seoTags";
import { rebuildSeoPlacesForTenant } from "../lib/seoPlaces";
import {
  absoluteLocaleUrl,
  resolveSeoLocales,
  type SeoLocale,
} from "../lib/seoLocales";
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

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

type SitemapUrl = {
  loc: string;
  priority: string;
  changefreq: string;
  alternates: Array<{ hreflang: string; href: string }>;
};

function withAlternates(
  domain: string,
  logicalPath: string,
  locales: SeoLocale[],
  priority: string,
  changefreq: string,
): SitemapUrl {
  const alternates: Array<{ hreflang: string; href: string }> = locales.map(
    (loc) => ({
      hreflang: loc,
      href: absoluteLocaleUrl(domain, loc, logicalPath),
    }),
  );
  alternates.push({
    hreflang: "x-default",
    href: absoluteLocaleUrl(domain, "en", logicalPath),
  });
  return {
    loc: absoluteLocaleUrl(domain, "en", logicalPath),
    priority,
    changefreq,
    alternates,
  };
}

/** Per-tenant sitemap.xml — includes hreflang alternates per locale. */
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
    const locales = resolveSeoLocales(tenant);
    const urls: SitemapUrl[] = [
      withAlternates(tenant.domain, "/", locales, "1.0", "daily"),
      withAlternates(tenant.domain, "/menu", locales, "0.9", "daily"),
      withAlternates(tenant.domain, "/order", locales, "0.8", "weekly"),
      withAlternates(tenant.domain, "/catering", locales, "0.6", "monthly"),
    ];
    for (const t of tags) {
      urls.push(
        withAlternates(
          tenant.domain,
          `/tags/${t.slug}`,
          locales,
          "0.7",
          "weekly",
        ),
      );
    }
    for (const p of places) {
      urls.push(
        withAlternates(
          tenant.domain,
          `/places/${p.slug}`,
          locales,
          "0.6",
          "weekly",
        ),
      );
    }

    // Also list each non-en locale URL as its own <url> entry (Google-friendly)
    const expanded: SitemapUrl[] = [...urls];
    for (const u of urls) {
      const pathOnly =
        u.alternates.find((a) => a.hreflang === "en")?.href.replace(
          `https://${tenant.domain}`,
          "",
        ) || "/";
      for (const loc of locales) {
        if (loc === "en") continue;
        expanded.push({
          loc: absoluteLocaleUrl(tenant.domain, loc, pathOnly),
          priority: u.priority,
          changefreq: u.changefreq,
          alternates: u.alternates,
        });
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${expanded
  .map((u) => {
    const alts = u.alternates
      .map(
        (a) =>
          `    <xhtml:link rel="alternate" hreflang="${escapeXml(a.hreflang)}" href="${escapeXml(a.href)}" />`,
      )
      .join("\n");
    return `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
${alts}
  </url>`;
  })
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
