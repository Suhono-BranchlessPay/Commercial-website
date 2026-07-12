import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Idempotent outbound webhook deliveries to AI / bridge consumers. */
export const bridgeWebhookDeliveriesTable = pgTable(
  "bridge_webhook_deliveries",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    eventType: text("event_type").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    orderId: text("order_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at"),
  },
  (table) => [
    uniqueIndex("bridge_webhook_idempotency_idx").on(
      table.tenantId,
      table.idempotencyKey,
    ),
  ],
);

export const bridgeAuditLogTable = pgTable("bridge_audit_log", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  method: text("method").notNull(),
  path: text("path").notNull(),
  tenantId: text("tenant_id"),
  statusCode: integer("status_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
