import {
  pgTable,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * Short-lived cart handoff tokens — survive Facebook WebView → Safari switches
 * where localStorage is partitioned.
 */
export const cartSharesTable = pgTable(
  "cart_shares",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    payload: jsonb("payload").$type<{
      items: Array<{
        menuItem: {
          id: string;
          sku?: string;
          name: string;
          price: number;
          description?: string | null;
          imageUrl?: string | null;
          category?: string | null;
          available?: boolean;
          featured?: boolean;
        };
        quantity: number;
        specialInstructions?: string;
      }>;
    }>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("cart_shares_tenant_expires_idx").on(table.tenantId, table.expiresAt),
  ],
);

export type CartShare = typeof cartSharesTable.$inferSelect;
