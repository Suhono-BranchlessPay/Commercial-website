import { Router } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderLinesTable,
  menuItemsTable,
} from "@workspace/db";
import { and, eq, gte, desc } from "drizzle-orm";
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
  isBpAnchorConfigured,
  anchorPaidOrder,
  shouldWebsiteAnchor,
  pullAnchorByReference,
  explorerUrlForTx,
} from "../integrations/branchlesspay";
import {
  isOwnerConfigured,
  syncOrderToOwner,
} from "../integrations/owner";
import { upsertCustomerAndAddress } from "../lib/customers";
import {
  addressFingerprint,
  isWithinDeliveryRadius,
  OUT_OF_RADIUS_MESSAGE,
  structuredAddressSchema,
} from "../lib/address";
import { displayName } from "../lib/phone";
import {
  envFallbackTenant,
  getTenantId,
  isOrderTypeEnabled,
} from "../lib/tenant";

const router = Router();

const orderLineInputSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().int().min(1),
  specialInstructions: z.string().nullable().optional(),
});

const orderInputSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().nullable().optional(),
  customerPhone: z.string().min(10),
  customerEmail: z.string().email().nullable().optional().or(z.literal("")),
  orderType: z.enum(["pickup", "delivery"]),
  address: structuredAddressSchema.nullable().optional(),
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
  const tenant = req.tenant ?? envFallbackTenant();
  const tenantId = tenant.id;
  const customerDisplayName = displayName(input.firstName, input.lastName);

  try {
    if (!isOrderTypeEnabled(tenant.theme, input.orderType)) {
      res.status(400).json({
        error:
          input.orderType === "delivery"
            ? "Delivery is temporarily unavailable. Please choose pickup."
            : "This order type is not available.",
      });
      return;
    }

    if (input.orderType === "delivery") {
      if (!input.address) {
        res.status(400).json({ error: "Delivery address is required" });
        return;
      }
      if (
        !isWithinDeliveryRadius(
          input.address.lat,
          input.address.lng,
          tenant.serviceAreaRadius,
          tenant.lat,
          tenant.lng,
        )
      ) {
        res.status(400).json({ error: OUT_OF_RADIUS_MESSAGE });
        return;
      }
    }

    const menuItemIds = input.items.map((i) => i.menuItemId);
    const menuItemMap: Record<
      string,
      { name: string; price: number; sku: string }
    > = {};
    for (const id of menuItemIds) {
      const rows = await db
        .select()
        .from(menuItemsTable)
        .where(
          and(
            eq(menuItemsTable.id, id),
            eq(menuItemsTable.tenantId, tenantId),
          ),
        );
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
    let deliveryAddressFormatted: string | null = null;

    if (input.orderType === "delivery") {
      const addr = input.address!;
      deliveryAddressFormatted = [
        [addr.street, addr.unit].filter(Boolean).join(" "),
        `${addr.city}, ${addr.state} ${addr.postcode}`,
      ].join(", ");

      if (!isDoordashConfigured(tenant.slug)) {
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
      if (quote.addressKey !== addressFingerprint(addr)) {
        res.status(400).json({ error: "Delivery address does not match quote." });
        return;
      }
      deliveryFee = quote.deliveryFeeCents / 100;
    }

    const total = Math.round((subtotal + tax + deliveryFee) * 100) / 100;

    const customerRecord = await upsertCustomerAndAddress({
      tenantId,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.customerPhone,
      email: input.customerEmail,
      address: input.orderType === "delivery" ? input.address! : null,
    });

    if (isBranchlesspayConfigured(tenant.slug)) {
      try {
        const auditResult = await auditOrderWithBpShield({
          orderId,
          customerName: customerDisplayName,
          customerPhone: customerRecord.phoneE164,
          orderType: input.orderType,
          total,
          items: lines.map((l) => ({
            name: l.menuItemName,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
          tenantSlug: tenant.slug,
        });
        if (!auditResult.approved) {
          req.log.warn({ auditResult }, "Order rejected by BP Audit Shield");
          res.status(403).json({
            error: "Order could not be processed. Please contact the restaurant.",
          });
          return;
        }
        req.log.info(
          { auditId: auditResult.auditId, riskScore: auditResult.riskScore },
          "BP Audit Shield approved",
        );
      } catch (err) {
        req.log.error(
          { err },
          "BP Audit Shield check failed — continuing without audit",
        );
      }
    }

    const paymentTiming = "pay_now";
    const paymentStatus = "paid";

    if (!isSquareWebPaymentsConfigured(tenant.slug)) {
      res.status(503).json({
        error:
          "Online ordering is temporarily unavailable. Please call the restaurant to place your order.",
      });
      return;
    }

    let squareResult: Awaited<ReturnType<typeof sendOrderToSquare>> | null =
      null;
    try {
      squareResult = await sendOrderToSquare({
        orderId,
        customerName: customerDisplayName,
        firstName: input.firstName,
        lastName: input.lastName,
        customerPhone: customerRecord.phoneE164,
        orderType: input.orderType,
        deliveryAddress: deliveryAddressFormatted,
        deliveryAddressStructured:
          input.orderType === "delivery" ? input.address! : null,
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
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
      });
      req.log.info(
        {
          squareOrderId: squareResult.squareOrderId,
          squarePaymentId: squareResult.squarePaymentId,
          chargedTotalCents: squareResult.chargedTotalCents,
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

    const chargedTotal =
      Math.round(squareResult.chargedTotalCents) / 100;

    await db.insert(ordersTable).values({
      id: orderId,
      tenantId,
      customerId: customerRecord.customerId,
      addressId: customerRecord.addressId,
      customerName: customerDisplayName,
      customerPhone: customerRecord.phoneE164,
      customerEmail: customerRecord.email,
      orderType: input.orderType,
      deliveryAddress: deliveryAddressFormatted,
      subtotal,
      tax,
      total: chargedTotal,
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
      squareReferenceId: squareResult.squarePaymentId,
      specialInstructions: input.specialInstructions ?? null,
      bpAnchorStatus:
        shouldWebsiteAnchor(tenant.anchorMode) &&
        isBpAnchorConfigured(tenant.slug)
          ? "pending"
          : tenant.anchorMode === "pos-native"
            ? "pending"
            : null,
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
          firstName: input.firstName,
          lastName: input.lastName,
          customerPhone: customerRecord.phoneE164,
          address: input.address!,
          orderValueCents: Math.round((subtotal + tax) * 100),
          items: lines.map((l) => ({
            name: l.menuItemName,
            quantity: l.quantity,
          })),
          specialInstructions: input.specialInstructions,
          tenant,
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
        req.log.error(
          { err, orderId },
          "DoorDash dispatch failed after payment — issuing refund",
        );
        try {
          await refundSquarePayment(
            squareResult.squarePaymentId,
            squareResult.chargedTotalCents,
            orderId,
            tenant.slug,
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

    if (
      shouldWebsiteAnchor(tenant.anchorMode) &&
      isBpAnchorConfigured(tenant.slug)
    ) {
      try {
        const anchor = await anchorPaidOrder({
          orderId,
          tenantSlug: tenant.slug,
          tenantName: tenant.name,
          orderType: input.orderType,
          total: chargedTotal,
          squarePaymentId: squareResult.squarePaymentId,
          squareOrderId: squareResult.squareOrderId,
          customerName: customerDisplayName,
          items: lines.map((l) => ({
            name: l.menuItemName,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
        });
        if (anchor.ok) {
          await db
            .update(ordersTable)
            .set({
              bpAnchorId: anchor.anchorId ?? null,
              bpContentHash: anchor.contentHash ?? null,
              bpAnchorStatus: anchor.status ?? "queued",
              bpTxHash: anchor.txHash ?? null,
              bpExplorerUrl:
                anchor.explorerUrl ?? explorerUrlForTx(anchor.txHash) ?? null,
            })
            .where(eq(ordersTable.id, orderId));
          req.log.info(
            { anchorId: anchor.anchorId, status: anchor.status },
            "BP post-pay anchor queued (platform mode)",
          );
        } else {
          req.log.error(
            { anchor },
            "BP post-pay anchor failed — order still paid",
          );
          await db
            .update(ordersTable)
            .set({ bpAnchorStatus: "failed" })
            .where(eq(ordersTable.id, orderId));
        }
      } catch (err) {
        req.log.error({ err }, "BP post-pay anchor threw — order still paid");
      }
    } else if (tenant.anchorMode === "pos-native") {
      req.log.info(
        {
          squareReferenceId: squareResult.squarePaymentId,
          orderId,
        },
        "pos-native: skipping website anchor; waiting for BP proof webhook/pull",
      );
      // Best-effort pull shortly after Square→BP may have anchored
      const ref = squareResult.squarePaymentId;
      setTimeout(() => {
        void (async () => {
          try {
            const proof = await pullAnchorByReference({
              referenceId: ref,
              tenantSlug: tenant.slug,
            });
            if (!proof?.anchorId && !proof?.txHash) return;
            await db
              .update(ordersTable)
              .set({
                bpAnchorId: proof.anchorId,
                bpContentHash: proof.contentHash,
                bpAnchorStatus: proof.status || "anchored",
                bpTxHash: proof.txHash,
                bpExplorerUrl:
                  proof.explorerUrl ?? explorerUrlForTx(proof.txHash),
              })
              .where(eq(ordersTable.id, orderId));
          } catch {
            /* non-blocking fallback */
          }
        })();
      }, 4000);
    }

    if (isOwnerConfigured()) {
      try {
        const ownerResult = await syncOrderToOwner({
          orderId,
          customerName: customerDisplayName,
          customerPhone: customerRecord.phoneE164,
          customerEmail: customerRecord.email,
          orderType: input.orderType,
          deliveryAddress: deliveryAddressFormatted,
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
        req.log.info(
          {
            ownerOrderId: ownerResult.ownerOrderId,
            loyaltyPoints: ownerResult.loyaltyPointsEarned,
          },
          "Order synced to Owner.com",
        );
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
      firstName: input.firstName,
      lastName: input.lastName ?? null,
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
  const tenantId = req.tenant?.id ?? getTenantId();
  try {
    const order = await db
      .select()
      .from(ordersTable)
      .where(
        and(eq(ordersTable.id, id), eq(ordersTable.tenantId, tenantId)),
      );
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

/** Device-local order history only — pass order IDs saved on this device. */
router.post("/account/orders", async (req, res): Promise<void> => {
  const schema = z.object({
    orderIds: z.array(z.string().uuid()).max(20),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  try {
    const ordersWithLines = await Promise.all(
      parsed.data.orderIds.map(async (id) => {
        const rows = await db
          .select()
          .from(ordersTable)
          .where(
            and(
              eq(ordersTable.id, id),
              eq(ordersTable.tenantId, req.tenant?.id ?? getTenantId()),
            ),
          )
          .limit(1);
        const order = rows[0];
        if (!order) return null;
        const lines = await db
          .select()
          .from(orderLinesTable)
          .where(eq(orderLinesTable.orderId, id));
        return {
          ...order,
          createdAt: order.createdAt?.toISOString(),
          lines,
        };
      }),
    );

    res.json({
      orders: ordersWithLines.filter(Boolean),
    });
  } catch (err) {
    req.log.error({ err }, "Account orders failed");
    res.status(500).json({ error: "Failed to load orders" });
  }
});

router.get("/owner/stats", async (req, res): Promise<void> => {
  if (!(await checkPin(req.query.pin))) {
    res.status(401).json({ error: "Invalid PIN" });
    return;
  }
  try {
    const tenantId = req.tenant?.id ?? getTenantId();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayOrders = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.tenantId, tenantId),
          gte(ordersTable.createdAt, todayStart),
        ),
      )
      .orderBy(desc(ordersTable.createdAt));

    const recentOrders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.tenantId, tenantId))
      .orderBy(desc(ordersTable.createdAt))
      .limit(20);

    const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const avgTicket =
      todayOrders.length > 0 ? todaySales / todayOrders.length : 0;

    res.json({
      todayCount: todayOrders.length,
      todaySales,
      avgTicket,
      todayOrders: todayOrders.map((o) => ({
        ...o,
        createdAt: o.createdAt?.toISOString(),
      })),
      recentOrders: recentOrders.map((o) => ({
        ...o,
        createdAt: o.createdAt?.toISOString(),
      })),
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
      configured: isSquareConfigured(req.tenant?.slug),
      webPayments: isSquareWebPaymentsConfigured(req.tenant?.slug),
      environment:
        process.env.SQUARE_ENVIRONMENT ??
        process.env[`TENANT_${(req.tenant?.slug ?? "samurai").toUpperCase()}_SQUARE_ENVIRONMENT`] ??
        "sandbox",
    },
    doordash: { configured: isDoordashConfigured(req.tenant?.slug) },
    branchlesspay: {
      shield: isBranchlesspayConfigured(req.tenant?.slug),
      anchorMode: req.tenant?.anchorMode ?? "platform",
      /** True when this website will POST anchors (platform mode + license key). */
      websiteAnchors:
        (req.tenant?.anchorMode ?? "platform") !== "pos-native" &&
        isBpAnchorConfigured(req.tenant?.slug),
      licenseConfigured: isBpAnchorConfigured(req.tenant?.slug),
    },
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
    const tenantId = req.tenant?.id ?? getTenantId();
    const rows = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.id, req.params.id),
          eq(ordersTable.tenantId, tenantId),
        ),
      );
    const order = rows[0];
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    await db
      .update(ordersTable)
      .set({ status })
      .where(eq(ordersTable.id, req.params.id));

    if (
      order.squareOrderId &&
      (status === "ready" || status === "completed" || status === "cancelled")
    ) {
      try {
        await syncSquareOrderFromOwnerStatus(
          order.squareOrderId,
          status as "ready" | "completed" | "cancelled",
          req.tenant?.slug ?? getTenantId(),
        );
      } catch (err) {
        req.log.error(
          { err, squareOrderId: order.squareOrderId },
          "Square status sync failed",
        );
      }
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Status update failed");
    res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;
