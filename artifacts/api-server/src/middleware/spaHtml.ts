import fs from "node:fs";
import path from "node:path";
import type { RequestHandler } from "express";
import { and, eq } from "drizzle-orm";
import { db, menuItemsTable } from "@workspace/db";
import { resolveTenant } from "../lib/tenant";
import { buildTenantSeo, injectTenantHead } from "../lib/tenantSeo";
import {
  getTagPage,
  listIndexableTags,
  rebuildSeoTagsForTenant,
} from "../lib/seoTags";
import {
  getPlacePage,
  listIndexablePlaces,
  rebuildSeoPlacesForTenant,
} from "../lib/seoPlaces";
import {
  buildPageSeo,
  injectPageHead,
  injectSsrBody,
  renderPlaceSsrBody,
  renderTagSsrBody,
} from "../lib/seoRender";
import { logger } from "../lib/logger";

/**
 * Directory of the Vite storefront build (contains index.html + assets).
 * Set STOREFRONT_DIST in production so Express can inject per-tenant SEO.
 */
export function getStorefrontDist(): string | null {
  const fromEnv = process.env.STOREFRONT_DIST?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return null;
}

function isAssetPath(urlPath: string): boolean {
  return /\.[a-z0-9]+$/i.test(urlPath) && !urlPath.endsWith(".html");
}

async function ensureSeo(
  tenant: NonNullable<Awaited<ReturnType<typeof resolveTenant>>>,
) {
  const [tags, places] = await Promise.all([
    listIndexableTags(tenant.id),
    listIndexablePlaces(tenant.id),
  ]);
  if (tags.length === 0) await rebuildSeoTagsForTenant(tenant);
  if (places.length === 0) await rebuildSeoPlacesForTenant(tenant);
}

/**
 * Serve SPA index.html with Host-resolved tenant meta injected server-side.
 * For /tags/:slug and /places/:slug, also inject crawlable SSR body content.
 */
export function createSpaHtmlHandler(
  storefrontDist: string,
): RequestHandler {
  const indexPath = path.join(storefrontDist, "index.html");
  let cachedTemplate: string | null = null;
  let cachedMtimeMs = 0;

  function loadTemplate(): string {
    const stat = fs.statSync(indexPath);
    if (cachedTemplate && stat.mtimeMs === cachedMtimeMs) {
      return cachedTemplate;
    }
    cachedTemplate = fs.readFileSync(indexPath, "utf8");
    cachedMtimeMs = stat.mtimeMs;
    return cachedTemplate;
  }

  return async (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    const urlPath = req.path || "/";
    if (urlPath.startsWith("/api")) {
      next();
      return;
    }
    if (isAssetPath(urlPath)) {
      next();
      return;
    }

    try {
      if (!fs.existsSync(indexPath)) {
        res.status(503).send("Storefront build not found. Run frontend build.");
        return;
      }

      const tenant = await resolveTenant({
        host: req.headers.host,
        slugHint:
          typeof req.headers["x-tenant-slug"] === "string"
            ? req.headers["x-tenant-slug"]
            : typeof req.query.tenant === "string"
              ? req.query.tenant
              : undefined,
        allowEnvFallback: true,
      });

      if (!tenant) {
        res.status(404).send("Unknown restaurant domain.");
        return;
      }

      const template = loadTemplate();
      const tagMatch = urlPath.match(/^\/tags\/([^/]+)\/?$/i);
      const placeMatch = urlPath.match(/^\/places\/([^/]+)\/?$/i);

      if (tagMatch) {
        await ensureSeo(tenant);
        const slug = decodeURIComponent(tagMatch[1]);
        const page = await getTagPage(tenant.id, slug);
        if (!page) {
          res.status(404).send("Tag page not found (need ≥3 menu items).");
          return;
        }
        const related = await listIndexableTags(tenant.id);
        const pageSeo = buildPageSeo(tenant, {
          path: `/tags/${page.tag.slug}`,
          title:
            page.tag.metaTitle ||
            `${page.tag.name} — ${buildTenantSeo(tenant).brandName}`,
          description:
            page.tag.metaDescription || page.tag.description || "",
        });
        let html = injectPageHead(template, pageSeo);
        html = injectSsrBody(
          html,
          renderTagSsrBody({
            seo: pageSeo,
            tag: page.tag,
            items: page.items,
            relatedTags: related.map((t) => ({
              slug: t.slug,
              name: t.name,
            })),
          }),
        );
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300");
        res.status(200).send(html);
        return;
      }

      if (placeMatch) {
        await ensureSeo(tenant);
        const slug = decodeURIComponent(placeMatch[1]);
        const place = await getPlacePage(tenant.id, slug);
        if (!place) {
          res.status(404).send("Place page not found (outside service area?).");
          return;
        }
        const baseSeo = buildTenantSeo(tenant);
        let featured = await db
          .select({
            id: menuItemsTable.id,
            name: menuItemsTable.name,
            description: menuItemsTable.description,
            price: menuItemsTable.price,
            imageUrl: menuItemsTable.imageUrl,
          })
          .from(menuItemsTable)
          .where(
            and(
              eq(menuItemsTable.tenantId, tenant.id),
              eq(menuItemsTable.available, true),
              eq(menuItemsTable.featured, true),
            ),
          )
          .limit(8);
        if (featured.length < 3) {
          featured = await db
            .select({
              id: menuItemsTable.id,
              name: menuItemsTable.name,
              description: menuItemsTable.description,
              price: menuItemsTable.price,
              imageUrl: menuItemsTable.imageUrl,
            })
            .from(menuItemsTable)
            .where(
              and(
                eq(menuItemsTable.tenantId, tenant.id),
                eq(menuItemsTable.available, true),
              ),
            )
            .limit(8);
        }
        const pageSeo = buildPageSeo(tenant, {
          path: `/places/${place.slug}`,
          title:
            place.metaTitle ||
            `${baseSeo.cuisine[0] || "Food"} in ${place.name} — ${baseSeo.brandName}`,
          description: place.metaDescription || "",
        });
        let html = injectPageHead(template, pageSeo);
        html = injectSsrBody(
          html,
          renderPlaceSsrBody({
            seo: pageSeo,
            place,
            featured,
            cuisine: baseSeo.cuisine[0] || "Food",
          }),
        );
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300");
        res.status(200).send(html);
        return;
      }

      const seo = buildTenantSeo(tenant);
      const html = injectTenantHead(template, seo);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.status(200).send(html);
    } catch (err) {
      logger.error({ err }, "SPA tenant HTML injection failed");
      next(err);
    }
  };
}
