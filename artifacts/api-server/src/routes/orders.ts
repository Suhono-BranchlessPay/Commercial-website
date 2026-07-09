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
  syncSquareOrderFromOwnerStatus,
  refundSquarePayment,
} from "../integrations/square";
import {
  isDoordashConfigured,
  acceptDeliveryQuote,
  getCachedQuote,
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
  squarePaymentSourceId: z.string().min(1, "Card payment token is required"),
  doordashExternalDeliveryId: z.string().nullable().optional(),
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
    const orderId = randomUUID();

    let deliveryFee = 0;
    if (input.orderType === "delivery") {
      if (!input.deliveryAddress || input.deliveryAddress.length < 5) {
        res.status(400).json({ error: "Delivery address is required" });
        return;
      }
      if (!isDoordashConfigured()) {
        res.status(503).json({
          error: "Delivery is not available right now. Please choose pickup.",
        });
        return;
      }
      if (!input.doordashExternalDeliveryId) {
        res.status(400).json({
          error: "Delivery quote required. Please confirm your delivery address.",
        });
        return;
      }
      const quote = getCachedQuote(input.doordashExternalDeliveryId);
      if (!quote) {
        res.status(400).json({
          error: "Delivery quote expired. Please get a new delivery quote.",
        });
        return;
      }
      if (quote.deliveryAddress.trim() !== input.deliveryAddress.trim()) {
        res.status(400).json({ error: "Delivery address does not match quote." });
        return;
      }
      deliveryFee = quote.deliveryFeeCents / 100;
    }

    const total =
      Math.round((subtotal + tax + deliveryFee) * 100) / 100;

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

    const paymentTiming = "pay_now";
    const paymentStatus = "paid";

    if (!isSquareWebPaymentsConfigured()) {
      res.status(503).json({
        error:
          "Online ordering is temporarily unavailable. Please call the restaurant to place your order.",
      });
      return;
    }

    let squareResult: Awaited<ReturnType<typeof sendOrderToSquare>> | null = null;
    try {
      squareResult = await sendOrderToSquare({
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
        deliveryFee,
        total,
        specialInstructions: input.specialInstructions,
        squarePaymentSourceId: input.squarePaymentSourceId,
      });
      req.log.info(
        {
          squareOrderId: squareResult.squareOrderId,
          squarePaymentId: squareResult.squarePaymentId,
        },
        "Square prepaid order charged and sent to kitchen",
      );
    } catch (err) {
      req.log.error({ err }, "Square payment failed — order not saved");
      const message =
        err instanceof Error
          ? err.message.replace(/^Payment failed: /, "")
          : "Your card could not be charged. Please try another card.";
      res.status(402).json({ error: message });
      return;
    }

    // Simpan order ke database hanya setelah charge kartu + kitchen fire sukses
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
      deliveryFee,
      doordashExternalDeliveryId:
        input.orderType === "delivery"
          ? (input.doordashExternalDeliveryId ?? null)
          : null,
      squareOrderId: squareResult.squareOrderId,
      squarePaymentId: squareResult.squarePaymentId,
      specialInstructions: input.specialInstructions ?? null,
    });

    for (const line of lines) {
      await db.insert(orderLinesTable).values({
        id: randomUUID(),
        orderId,
        ...line,
      });
    }

    let doordashTrackingUrl: string | null = null;
    let doordashStatus: string | null = null;
    let estimatedDropoffTime: string | null = null;

    if (input.orderType === "delivery" && input.doordashExternalDeliveryId) {
      try {
        const ddResult = await acceptDeliveryQuote({
          externalDeliveryId: input.doordashExternalDeliveryId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          deliveryAddress: input.deliveryAddress!,
          orderValueCents: Math.round((subtotal + tax) * 100),
          items: lines.map((l) => ({
            name: l.menuItemName,
            quantity: l.quantity,
          })),
          specialInstructions: input.specialInstructions,
        });
        doordashTrackingUrl = ddResult.trackingUrl || null;
        doordashStatus = ddResult.status;
        estimatedDropoffTime = ddResult.estimatedDropoffTime || null;

        await db
          .update(ordersTable)
          .set({
            doordashTrackingUrl,
            doordashStatus,
            estimatedDropoffTime,
          })
          .where(eq(ordersTable.id, orderId));

        req.log.info(
          {
            deliveryId: ddResult.deliveryId,
            trackingUrl: ddResult.trackingUrl,
          },
          "DoorDash delivery dispatched after payment",
        );
      } catch (err) {
        req.log.error({ err, orderId }, "DoorDash dispatch failed after payment — issuing refund");
        try {
          await refundSquarePayment(
            squareResult.squarePaymentId,
            Math.round(total * 100),
            orderId,
          );
          await db
            .update(ordersTable)
            .set({ status: "cancelled", paymentStatus: "refunded" })
            .where(eq(ordersTable.id, orderId));
        } catch (refundErr) {
          req.log.error(
            { refundErr, orderId, squarePaymentId: squareResult.squarePaymentId },
            "CRITICAL: refund failed after DoorDash dispatch failure — manual intervention required",
          );
        }
        res.status(503).json({
          error:
            "Your card was charged but we could not dispatch delivery. A refund has been initiated. Please call the restaurant.",
        });
        return;
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
      doordashTrackingUrl,
      estimatedDropoffTime,
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
    const rows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, req.params.id));
    const order = rows[0];
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, req.params.id));

    if (
      order.squareOrderId &&
      (status === "ready" || status === "completed" || status === "cancelled")
    ) {
      try {
        await syncSquareOrderFromOwnerStatus(
          order.squareOrderId,
          status as "ready" | "completed" | "cancelled",
        );
      } catch (err) {
        req.log.error({ err, squareOrderId: order.squareOrderId }, "Square status sync failed");
      }
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Status update failed");
    res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;
