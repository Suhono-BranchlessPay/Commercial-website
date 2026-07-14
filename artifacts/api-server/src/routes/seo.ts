import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, menuItemsTable } from "@workspace/db";
import { resolveTenant } from "../lib/tenant";
import type { Request } from "express";
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
import { logger } from "../lib/logger";

const router = Router();

async function resolveReqTenant(req: Request) {
  if (req.tenant) return req.tenant;
  return resolveTenant({
    host: typeof req.headers.host === "string" ? req.headers.host : undefined,
    slugHint:
      typeof req.headers["x-tenant-slug"] === "string"
        ? req.headers["x-tenant-slug"]
        : typeof req.query.tenant === "string"
          ? req.query.tenant
          : undefined,
    allowEnvFallback: true,
  });
}

/** Ensure tag/place tables are populated (lazy) for this tenant. */
async function ensureSeoBuilt(tenant: NonNullable<
  Awaited<ReturnType<typeof resolveTenant>>
>) {
  const [tags, places] = await Promise.all([
    listIndexableTags(tenant.id),
    listIndexablePlaces(tenant.id),
  ]);
  if (tags.length === 0) {
    await rebuildSeoTagsForTenant(tenant);
  }
  if (places.length === 0) {
    await rebuildSeoPlacesForTenant(tenant);
  }
}

router.get("/seo/tags", async (req, res): Promise<void> => {
  try {
    const tenant = await resolveReqTenant(req);
    if (!tenant) {
      res.status(404).json({ error: "Unknown tenant" });
      return;
    }
    await ensureSeoBuilt(tenant);
    const tags = await listIndexableTags(tenant.id);
    res.json({
      tags: tags.map((t) => ({
        slug: t.slug,
        name: t.name,
        description: t.description,
        itemCount: t.itemCount,
      })),
    });
  } catch (err) {
    logger.error({ err }, "GET /seo/tags failed");
    res.status(500).json({ error: "Failed to list tags" });
  }
});

router.get("/seo/tags/:slug", async (req, res): Promise<void> => {
  try {
    const tenant = await resolveReqTenant(req);
    if (!tenant) {
      res.status(404).json({ error: "Unknown tenant" });
      return;
    }
    await ensureSeoBuilt(tenant);
    const page = await getTagPage(tenant.id, String(req.params.slug || ""));
    if (!page) {
      res.status(404).json({ error: "Tag not found or too thin (<3 items)" });
      return;
    }
    const related = await listIndexableTags(tenant.id);
    res.json({
      tag: {
        slug: page.tag.slug,
        name: page.tag.name,
        description: page.tag.description,
        itemCount: page.tag.itemCount,
        metaTitle: page.tag.metaTitle,
        metaDescription: page.tag.metaDescription,
      },
      items: page.items,
      relatedTags: related
        .filter((t) => t.slug !== page.tag.slug)
        .slice(0, 12)
        .map((t) => ({ slug: t.slug, name: t.name })),
    });
  } catch (err) {
    logger.error({ err }, "GET /seo/tags/:slug failed");
    res.status(500).json({ error: "Failed to load tag" });
  }
});

router.get("/seo/places", async (req, res): Promise<void> => {
  try {
    const tenant = await resolveReqTenant(req);
    if (!tenant) {
      res.status(404).json({ error: "Unknown tenant" });
      return;
    }
    await ensureSeoBuilt(tenant);
    const places = await listIndexablePlaces(tenant.id);
    res.json({
      places: places.map((p) => ({
        slug: p.slug,
        name: p.name,
        state: p.state,
        distanceMiles: p.distanceMiles,
        deliveryAvailable: p.deliveryAvailable,
      })),
    });
  } catch (err) {
    logger.error({ err }, "GET /seo/places failed");
    res.status(500).json({ error: "Failed to list places" });
  }
});

router.get("/seo/places/:slug", async (req, res): Promise<void> => {
  try {
    const tenant = await resolveReqTenant(req);
    if (!tenant) {
      res.status(404).json({ error: "Unknown tenant" });
      return;
    }
    await ensureSeoBuilt(tenant);
    const place = await getPlacePage(
      tenant.id,
      String(req.params.slug || ""),
    );
    if (!place) {
      res.status(404).json({ error: "Place not found" });
      return;
    }
    const featured = await db
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
    let items = featured;
    if (items.length < 3) {
      items = await db
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
    res.json({ place, featured: items });
  } catch (err) {
    logger.error({ err }, "GET /seo/places/:slug failed");
    res.status(500).json({ error: "Failed to load place" });
  }
});

export default router;
export { ensureSeoBuilt };
