import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderLinesTable, menuItemsTable } from "@workspace/db";
import { eq, gte, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { checkPin } from "../lib/ownerAuth";
import {
  isSquareConfigured,
  isSquareWebPaymentsConfigured,
  sendOrderToSquare,
} from "../integrations/square";
import {
  isDoordashConfigured,
  createDoordashDelivery,
} from "../integrations/doordash";
import {
  isBranchlesspayConfigured,
  auditOrderWithBpShield,
} from "../integrations/branchlesspay";
import {
  isOwnerConfigured,
  syncOrderToOwner,
} from "../integrations/owner";

const router = Router();

const orderLineInputSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().int().min(1),
  specialInstructions: z.string().nullable().optional(),
});

const orderInputSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().nullable().optional(),
  orderType: z.enum(["pickup", "delivery"]),
  deliveryAddress: z.string().nullable().optional(),
  items: z.array(orderLineInputSchema).min(1),
  specialInstructions: z.string().nullable().optional(),
  paymentTiming: z.enum(["pay_now", "pay_at_pickup"]).default("pay_at_pickup"),
  squarePaymentSourceId: z.string().nullable().optional(),
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = orderInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid order data" });
    return;
  }

  const input = parsed.data;

  try {
    const menuItemIds = input.items.map((i) => i.menuItemId);
    const menuItemMap: Record<
      string,
      { name: string; price: number; sku: string }
    > = {};
    for (const id of menuItemIds) {
      const rows = await db
        .select()
        .from(menuItemsTable)
        .where(eq(menuItemsTable.id, id));
      if (rows[0]) {
        menuItemMap[id] = {
          name: rows[0].name,
          price: rows[0].price,
          sku: rows[0].sku,
        };
      }
    }

    const TAX_RATE = 0.07;
    let subtotal = 0;
    const lines = input.items.map((item) => {
      const menuItem = menuItemMap[item.menuItemId];
      const unitPrice = menuItem?.price ?? 0;
      const lineSubtotal = unitPrice * item.quantity;
      subtotal += lineSubtotal;
      return {
        menuItemId: item.menuItemId,
        menuItemName: menuItem?.name ?? "Unknown item",
        quantity: item.quantity,
        unitPrice,
        subtotal: lineSubtotal,
        specialInstructions: item.specialInstructions ?? null,
      };
    });

    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const orderId = randomUUID();

    // BP Audit Shield — fraud check sebelum order disimpan
    if (isBranchlesspayConfigured()) {
      try {
        const auditResult = await auditOrderWithBpShield({
          orderId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          orderType: input.orderType,
          total,
          items: lines.map((l) => ({
            name: l.menuItemName,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        });
        if (!auditResult.approved) {
          req.log.warn({ auditResult }, "Order rejected by BP Audit Shield");
          res.status(403).json({
            error: "Order could not be processed. Please contact the restaurant.",
          });
          return;
        }
        req.log.info({ auditId: auditResult.auditId, riskScore: auditResult.riskScore }, "BP Audit Shield approved");
      } catch (err) {
        req.log.error({ err }, "BP Audit Shield check failed — continuing without audit");
      }
    }

    const paymentTiming = input.paymentTiming ?? "pay_at_pickup";
    const paymentStatus = paymentTiming === "pay_now" ? "paid" : "unpaid";

    // Simpan order ke database
    await db.insert(ordersTable).values({
      id: orderId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail ?? null,
      orderType: input.orderType,
      deliveryAddress: input.deliveryAddress ?? null,
      subtotal,
      tax,
      total,
      status: "pending",
      paymentTiming,
      paymentStatus,
      squareOrderId: null,
      squarePaymentId: null,
      specialInstructions: input.specialInstructions ?? null,
    });

    for (const line of lines) {
      await db.insert(orderLinesTable).values({
        id: randomUUID(),
        orderId,
        ...line,
      });
    }

    // Square POS — kirim order ke Square setelah tersimpan ke DB
    if (isSquareConfigured()) {
      try {
        const squareResult = await sendOrderToSquare({
          orderId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          orderType: input.orderType,
          deliveryAddress: input.deliveryAddress,
          items: lines.map((l) => ({
            menuItemId: l.menuItemId,
            menuItemName: l.menuItemName,
            sku: menuItemMap[l.menuItemId]?.sku,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            specialInstructions: l.specialInstructions,
          })),
          subtotal,
          tax,
          total,
          specialInstructions: input.specialInstructions,
          paymentTiming,
          squarePaymentSourceId: input.squarePaymentSourceId,
        });
        await db
          .update(ordersTable)
          .set({
            squareOrderId: squareResult.squareOrderId,
            squarePaymentId: squareResult.squarePaymentId,
            paymentStatus: squareResult.paid ? "paid" : "unpaid",
          })
          .where(eq(ordersTable.id, orderId));
        req.log.info(
          {
            squareOrderId: squareResult.squareOrderId,
            paid: squareResult.paid,
            paymentTiming,
          },
          "Order sent to Square POS",
        );
      } catch (err) {
        req.log.error({ err }, "Failed to send order to Square — order still saved in DB");
      }
    }

    // DoorDash Drive — dispatch kurir untuk order delivery
    if (input.orderType === "delivery" && isDoordashConfigured()) {
      if (input.deliveryAddress) {
        try {
          const ddResult = await createDoordashDelivery({
            orderId,
            customerName: input.customerName,
            customerPhone: input.customerPhone,
            deliveryAddress: input.deliveryAddress,
            orderTotal: total,
            items: lines.map((l) => ({ name: l.menuItemName, quantity: l.quantity })),
          });
          req.log.info({ deliveryId: ddResult.deliveryId }, "DoorDash delivery dispatched");
        } catch (err) {
          req.log.error({ err }, "Failed to dispatch DoorDash delivery");
        }
      }
    }

    // Owner.com — sync order untuk loyalty dan marketing
    if (isOwnerConfigured()) {
      try {
        const ownerResult = await syncOrderToOwner({
          orderId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerEmail: input.customerEmail,
          orderType: input.orderType,
          deliveryAddress: input.deliveryAddress,
          items: lines.map((l) => ({
            name: l.menuItemName,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
          subtotal,
          tax,
          total,
          specialInstructions: input.specialInstructions,
        });
        req.log.info({ ownerOrderId: ownerResult.ownerOrderId, loyaltyPoints: ownerResult.loyaltyPointsEarned }, "Order synced to Owner.com");
      } catch (err) {
        req.log.error({ err }, "Failed to sync order to Owner.com");
      }
    }

    const order = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId));
    const orderLines = await db
      .select()
      .from(orderLinesTable)
      .where(eq(orderLinesTable.orderId, orderId));

    res.status(201).json({
      ...order[0],
      items: orderLines,
      createdAt: order[0]?.createdAt?.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create order");
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  try {
    const order = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id));
    if (!order[0]) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const orderLines = await db
      .select()
      .from(orderLinesTable)
      .where(eq(orderLinesTable.orderId, id));
    res.json({
      ...order[0],
      items: orderLines,
      createdAt: order[0].createdAt?.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get order");
    res.status(500).json({ error: "Failed to retrieve order" });
  }
});

/* ══ Customer Account — lookup by phone ══ */
router.get("/account/orders", async (req, res): Promise<void> => {
  const phone = (req.query.phone as string || "").trim().replace(/\D/g, "");
  if (phone.length < 7) {
    res.status(400).json({ error: "Invalid phone number" });
    return;
  }
  try {
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.customerPhone, req.query.phone as string))
      .orderBy(desc(ordersTable.createdAt))
      .limit(20);

    const ordersWithLines = await Promise.all(
      orders.map(async (order) => {
        const lines = await db
          .select()
          .from(orderLinesTable)
          .where(eq(orderLinesTable.orderId, order.id));
        return {
          ...order,
          createdAt: order.createdAt?.toISOString(),
          lines,
        };
      })
    );

    res.json({ orders: ordersWithLines, customerName: orders[0]?.customerName ?? null });
  } catch (err) {
    req.log.error({ err }, "Account orders failed");
    res.status(500).json({ error: "Failed to load orders" });
  }
});

/* ══ Owner Dashboard Endpoints ══ */
router.get("/owner/stats", async (req, res): Promise<void> => {
  if (!(await checkPin(req.query.pin))) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayOrders = await db
      .select()
      .from(ordersTable)
      .where(gte(ordersTable.createdAt, todayStart))
      .orderBy(desc(ordersTable.createdAt));

    const recentOrders = await db
      .select()
      .from(ordersTable)
      .orderBy(desc(ordersTable.createdAt))
      .limit(20);

    const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const avgTicket  = todayOrders.length > 0 ? todaySales / todayOrders.length : 0;

    res.json({
      todayCount: todayOrders.length,
      todaySales,
      avgTicket,
      todayOrders:  todayOrders.map(o => ({ ...o, createdAt: o.createdAt?.toISOString() })),
      recentOrders: recentOrders.map(o => ({ ...o, createdAt: o.createdAt?.toISOString() })),
    });
  } catch (err) {
    req.log.error({ err }, "Owner stats failed");
    res.status(500).json({ error: "Failed to load stats" });
  }
});

router.get("/owner/integrations", async (req, res): Promise<void> => {
  if (!(await checkPin(req.query.pin))) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }
  res.json({
    square: {
      configured: isSquareConfigured(),
      webPayments: isSquareWebPaymentsConfigured(),
      environment: process.env.SQUARE_ENVIRONMENT ?? "sandbox",
    },
    doordash: { configured: isDoordashConfigured() },
    branchlesspay: { configured: isBranchlesspayConfigured() },
    owner: { configured: isOwnerConfigured() },
  });
});

router.patch("/owner/orders/:id/status", async (req, res): Promise<void> => {
  const { pin, status } = req.body as { pin: string; status: string };
  if (!(await checkPin(pin))) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }
  const allowed = ["pending", "preparing", "ready", "completed", "cancelled"];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  try {
    await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, req.params.id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Status update failed");
    res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;
