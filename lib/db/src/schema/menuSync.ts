import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Blok A — Square → Orderly menu sync bookkeeping. One row per tenant.
 * SQUARE is the source of truth; this table only records the *status* of
 * pulling Square's catalog into Orderly's menu tables (never the other way
 * around — see docs/BLOK_A_SQUARE_MENU_SYNC.md). No tokens/secrets here.
 */
export const menuSyncStateTable = pgTable("menu_sync_state", {
  tenantId: text("tenant_id").primaryKey(),
  lastStartedAt: timestamp("last_started_at", { withTimezone: true }),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
  lastError: text("last_error"),
  lastItemCount: integer("last_item_count"),
  /** Square catalog pagination cursor from the most recent run (optional/debug). */
  lastCursor: text("last_cursor"),
  /** Reserved for future incremental sync via Square's catalog version. */
  catalogVersion: text("catalog_version"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertMenuSyncStateSchema = createInsertSchema(menuSyncStateTable);

export type MenuSyncState = typeof menuSyncStateTable.$inferSelect;
export type InsertMenuSyncState = z.infer<typeof insertMenuSyncStateSchema>;
