import {
  pgTable,
  text,
  real,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

/**
 * Programmatic SEO — tag landing pages (per dish / cuisine keyword).
 * Only publish pages with itemCount >= 3 (thin content → noindex / no page).
 */
export const seoTagsTable = pgTable(
  "seo_tags",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    itemCount: integer("item_count").notNull().default(0),
    /** category | keyword | manual */
    source: text("source").notNull().default("category"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("seo_tags_tenant_slug_idx").on(t.tenantId, t.slug)],
);

export const seoCatalogItemTagsTable = pgTable(
  "seo_catalog_item_tags",
  {
    tenantId: text("tenant_id").notNull(),
    menuItemId: text("menu_item_id").notNull(),
    tagId: text("tag_id").notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.tenantId, t.menuItemId, t.tagId],
      name: "seo_catalog_item_tags_pk",
    }),
  ],
);

/**
 * Place / locality landing pages — only cities within service_area_radius.
 */
export const seoPlacesTable = pgTable(
  "seo_places",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    state: text("state"),
    distanceMiles: real("distance_miles").notNull(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    deliveryAvailable: boolean("delivery_available").notNull().default(true),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("seo_places_tenant_slug_idx").on(t.tenantId, t.slug)],
);

export type SeoTag = typeof seoTagsTable.$inferSelect;
export type SeoPlace = typeof seoPlacesTable.$inferSelect;
