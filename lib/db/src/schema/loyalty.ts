import {
  pgTable,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Loyalty / Rewards — restaurant-owned program (non-custodial for Orderly).
 * Points & liability sit with the tenant; Orderly only runs the engine.
 *
 * Spec Part 2 — schema foundation. CrustnRoll Owner migration is separate
 * and must NOT run until import tooling + customer notice are ready.
 */

export type LoyaltyRedemptionRules = {
  /** Minimum points before a redeem is allowed. */
  min_redeem_points?: number;
  /** Points required for $1.00 off (e.g. 100 → 100 pts = $1). */
  points_per_dollar_off?: number;
  /** Cap redeem as % of order subtotal (0–100). */
  max_percent_of_subtotal?: number;
};

export const loyaltyProgramsTable = pgTable(
  "loyalty_programs",
  {
    tenantId: text("tenant_id").primaryKey(),
    enabled: boolean("enabled").notNull().default(false),
    /** Points earned per $1.00 of eligible spend (subtotal before tip). */
    pointsPerDollar: integer("points_per_dollar").notNull().default(1),
    redemptionRules: jsonb("redemption_rules")
      .$type<LoyaltyRedemptionRules>()
      .notNull()
      .default({
        min_redeem_points: 100,
        points_per_dollar_off: 100,
        max_percent_of_subtotal: 50,
      }),
    /** Null = no expiry. */
    expiryDays: integer("expiry_days"),
    /** draft | active | paused */
    status: text("status").notNull().default("draft"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
);

export const loyaltyAccountsTable = pgTable(
  "loyalty_accounts",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    customerId: text("customer_id").notNull(),
    pointsBalance: integer("points_balance").notNull().default(0),
    lifetimePoints: integer("lifetime_points").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("loyalty_accounts_tenant_customer_idx").on(
      t.tenantId,
      t.customerId,
    ),
  ],
);

/** earn | redeem | adjust | expire | migrate */
export type LoyaltyTxnType =
  | "earn"
  | "redeem"
  | "adjust"
  | "expire"
  | "migrate";

export const loyaltyTransactionsTable = pgTable("loyalty_transactions", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  customerId: text("customer_id").notNull(),
  accountId: text("account_id").notNull(),
  orderId: text("order_id"),
  type: text("type").notNull(),
  /** Signed points delta (+earn / -redeem). */
  points: integer("points").notNull(),
  reason: text("reason"),
  /** Optional BranchlessPay anchor (spec: verifiable, non-custodial proof). */
  bpAnchorId: text("bp_anchor_id"),
  bpContentHash: text("bp_content_hash"),
  bpAnchorStatus: text("bp_anchor_status"),
  chainTxHash: text("chain_tx_hash"),
  bpExplorerUrl: text("bp_explorer_url"),
  /** Import provenance for type=migrate (e.g. owner.com row id). */
  externalRef: text("external_ref"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
// Partial unique index loyalty_txn_earn_order_idx is created in SQL migration
// (one earn per order) — Drizzle cannot express WHERE on uniqueIndex cleanly.

export type LoyaltyProgram = typeof loyaltyProgramsTable.$inferSelect;
export type LoyaltyAccount = typeof loyaltyAccountsTable.$inferSelect;
export type LoyaltyTransaction = typeof loyaltyTransactionsTable.$inferSelect;
