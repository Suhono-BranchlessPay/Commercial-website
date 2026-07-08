import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable, ordersTable, orderLinesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { checkPin } from "../lib/ownerAuth";

const router = Router();

const registerSchema = z.object({
  name:  z.string().min(1),
  phone: z.string().min(7),
  email: z.string().email(),
  city:  z.string().min(1),
});

/* POST /api/customers — register new customer */
router.post("/customers", async (req, res): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
    return;
  }
  const { name, phone, email, city } = parsed.data;

  try {
    const existing = await db.select().from(customersTable).where(eq(customersTable.phone, phone)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Phone already registered", customer: existing[0] });
      return;
    }
    const [customer] = await db.insert(customersTable).values({
      id: randomUUID(),
      name, phone, email, city,
    }).returning();
    res.status(201).json({ customer });
  } catch (err) {
    req.log.error({ err }, "Customer registration failed");
    res.status(500).json({ error: "Registration failed" });
  }
});

/* GET /api/customers?phone=XXX — lookup customer + orders */
router.get("/customers", async (req, res): Promise<void> => {
  const phone = (req.query.phone as string || "").trim();
  if (!phone || phone.replace(/\D/g, "").length < 7) {
    res.status(400).json({ error: "Invalid phone number" });
    return;
  }
  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.phone, phone)).limit(1);

    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.customerPhone, phone))
      .orderBy(desc(ordersTable.createdAt))
      .limit(20);

    const ordersWithLines = await Promise.all(
      orders.map(async (order) => {
        const lines = await db.select().from(orderLinesTable).where(eq(orderLinesTable.orderId, order.id));
        return { ...order, createdAt: order.createdAt?.toISOString(), lines };
      })
    );

    res.json({ customer: customer ?? null, orders: ordersWithLines });
  } catch (err) {
    req.log.error({ err }, "Customer lookup failed");
    res.status(500).json({ error: "Lookup failed" });
  }
});

/* ══ Owner — Customer list + CSV export (PIN protected) ══ */
router.get("/owner/customers", async (req, res): Promise<void> => {
  if (!(await checkPin(req.query.pin))) { res.status(401).json({ error: "Invalid PIN" }); return; }
  try {
    const customers = await db
      .select()
      .from(customersTable)
      .orderBy(desc(customersTable.createdAt));

    const withStats = await Promise.all(
      customers.map(async (c) => {
        const orders = await db
          .select()
          .from(ordersTable)
          .where(eq(ordersTable.customerPhone, c.phone));
        const totalOrders = orders.length;
        const totalSpent  = orders.reduce((s, o) => s + o.total, 0);
        return { ...c, createdAt: c.createdAt?.toISOString(), totalOrders, totalSpent };
      })
    );

    res.json({ customers: withStats, total: withStats.length });
  } catch (err) {
    req.log.error({ err }, "Owner customers list failed");
    res.status(500).json({ error: "Failed to load customers" });
  }
});

router.get("/owner/customers/export", async (req, res): Promise<void> => {
  if (!(await checkPin(req.query.pin))) { res.status(401).json({ error: "Invalid PIN" }); return; }
  try {
    const customers = await db
      .select()
      .from(customersTable)
      .orderBy(desc(customersTable.createdAt));

    const rows = await Promise.all(
      customers.map(async (c) => {
        const orders = await db
          .select()
          .from(ordersTable)
          .where(eq(ordersTable.customerPhone, c.phone));
        const totalOrders = orders.length;
        const totalSpent  = orders.reduce((s, o) => s + o.total, 0);
        return { ...c, totalOrders, totalSpent };
      })
    );

    const escape = (v: string | number | null | undefined) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const header = ["Name", "Phone", "Email", "City", "Registered", "Total Orders", "Total Spent ($)"];
    const lines  = rows.map(r => [
      escape(r.name),
      escape(r.phone),
      escape(r.email),
      escape(r.city),
      escape(r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-US") : ""),
      escape(r.totalOrders),
      escape(r.totalSpent.toFixed(2)),
    ].join(","));

    const csv = [header.join(","), ...lines].join("\r\n");
    const filename = `samurai-customers-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csv); // BOM for Excel UTF-8 compatibility
  } catch (err) {
    req.log.error({ err }, "Customer export failed");
    res.status(500).json({ error: "Export failed" });
  }
});

export default router;
