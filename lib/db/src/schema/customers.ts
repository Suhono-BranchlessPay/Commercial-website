import {
  pgTable,
  text,
  real,
  boolean,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customersTable = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    phone: text("phone").notNull(),
    email: text("email"),
    firstOrderAt: timestamp("first_order_at"),
    lastOrderAt: timestamp("last_order_at"),
    orderCount: integer("order_count").notNull().default(0),
    totalSpentCents: integer("total_spent_cents").notNull().default(0),
    /** Consent fields required before any marketing send (TCPA / CAN-SPAM). */
    marketingConsentEmail: boolean("marketing_consent_email").notNull().default(false),
    marketingConsentSms: boolean("marketing_consent_sms").notNull().default(false),
    consentTimestamp: timestamp("consent_timestamp"),
    consentSource: text("consent_source"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("customers_tenant_phone_idx").on(table.tenantId, table.phone),
  ],
);

export const addressesTable = pgTable("addresses", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customersTable.id),
  street: text("street").notNull(),
  unit: text("unit"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postcode: text("postcode").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({
  id: true,
  createdAt: true,
});
export const insertAddressSchema = createInsertSchema(addressesTable).omit({
  id: true,
  createdAt: true,
});

export type Customer = typeof customersTable.$inferSelect;
export type Address = typeof addressesTable.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
