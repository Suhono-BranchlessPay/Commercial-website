import { pgTable, text, real, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const menuCategoriesTable = pgTable("menu_categories", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("samurai"),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const menuItemsTable = pgTable("menu_items", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("samurai"),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  price: real("price").notNull(),
  imageUrl: text("image_url"),
  available: boolean("available").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
});

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("samurai"),
  customerId: text("customer_id"),
  addressId: text("address_id"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  orderType: text("order_type").notNull(),
  deliveryAddress: text("delivery_address"),
  subtotal: real("subtotal").notNull(),
  tax: real("tax").notNull(),
  total: real("total").notNull(),
  status: text("status").notNull().default("pending"),
  paymentTiming: text("payment_timing").notNull().default("pay_at_pickup"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  squareOrderId: text("square_order_id"),
  squarePaymentId: text("square_payment_id"),
  /** Square payment id (or other POS ref) used to match BP pos-native webhooks. */
  squareReferenceId: text("square_reference_id"),
  deliveryFee: real("delivery_fee").notNull().default(0),
  doordashExternalDeliveryId: text("doordash_external_delivery_id"),
  doordashTrackingUrl: text("doordash_tracking_url"),
  doordashStatus: text("doordash_status"),
  estimatedDropoffTime: text("estimated_dropoff_time"),
  bpAnchorId: text("bp_anchor_id"),
  bpContentHash: text("bp_content_hash"),
  bpAnchorStatus: text("bp_anchor_status"),
  bpTxHash: text("bp_tx_hash"),
  bpExplorerUrl: text("bp_explorer_url"),
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderLinesTable = pgTable("order_lines", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => ordersTable.id),
  menuItemId: text("menu_item_id").notNull(),
  menuItemName: text("menu_item_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  subtotal: real("subtotal").notNull(),
  specialInstructions: text("special_instructions"),
});

export const insertMenuCategorySchema = createInsertSchema(menuCategoriesTable);
export const insertMenuItemSchema = createInsertSchema(menuItemsTable);
export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export const insertOrderLineSchema = createInsertSchema(orderLinesTable).omit({ id: true });

export type MenuCategory = typeof menuCategoriesTable.$inferSelect;
export type MenuItem = typeof menuItemsTable.$inferSelect;
export type Order = typeof ordersTable.$inferSelect;
export type OrderLine = typeof orderLinesTable.$inferSelect;
export type InsertMenuCategory = z.infer<typeof insertMenuCategorySchema>;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
