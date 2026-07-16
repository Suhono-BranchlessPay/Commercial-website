/**
 * ⭐ TENANT ISOLATION — the most critical guarantee for multi-outlet scale.
 * Automates the previously-manual cross-tenant checks:
 *   1. Owner A (samurai) only ever sees their own KDS board (never tenant B).
 *   2. Owner A cannot mutate another tenant's order (404, not 403-leak).
 *   3. A master account cannot log into /client at all.
 *   4. No session => no data.
 *   5. Positive control: owner CAN act on their own order (proves it's real
 *      isolation, not a blanket deny).
 *
 * DB-backed: runs ONLY when TEST_DATABASE_URL is set (a disposable Postgres with
 * the schema pushed and tenants `samurai` + `kirin` present). Otherwise skipped.
 *
 *   # local example (sandbox):
 *   TEST_DATABASE_URL=postgres://openpg:openpgpwd@127.0.0.1:5432/orderly_sandbox \
 *     pnpm --filter @workspace/api-server test
 */
import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { pool } from "@workspace/db";
import clientRouter from "../../src/routes/client";
import { ensureClientSeedUsers } from "../../src/lib/clientAuth";
import { ensureDashboardSeedUsers } from "../../src/lib/dashboardAuth";

const RUN_DB = Boolean(process.env.TEST_DATABASE_URL);
const d = RUN_DB ? describe : describe.skip;

const OWNER = { email: "owner@samurai.local", password: "samurai-owner-dev" };
const MASTER = { email: "master@orderly.local", password: "orderly-master-dev" };

const SAMURAI_ORDER = "jest-iso-samurai";
const KIRIN_ORDER = "jest-iso-kirin";

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/client", clientRouter);
  return app;
}

async function seedOrder(id: string, tenantId: string, name: string) {
  await pool.query(
    `INSERT INTO orders (
       id, tenant_id, customer_name, customer_phone, order_type, status, channel,
       subtotal, tax, tip, platform_fee, processing_fee, discount, total, delivery_fee,
       subtotal_cents, total_cents, created_at, accepted_at, in_progress_at
     ) VALUES ($1,$2,$3,'+15550000000','pickup','preparing','web',
       17.99,1.26,0,0,0,0,19.25,0,
       1799,1925,NOW(),NOW(),NOW())
     ON CONFLICT (id) DO NOTHING`,
    [id, tenantId, name],
  );
}

d("tenant isolation (/client + KDS)", () => {
  const app = buildApp();

  beforeAll(async () => {
    await ensureDashboardSeedUsers(); // master + manager
    await ensureClientSeedUsers(); // owner@samurai.local (client_owner, samurai)
    await seedOrder(SAMURAI_ORDER, "samurai", "Jest Samurai Diner");
    await seedOrder(KIRIN_ORDER, "kirin", "Jest Kirin Diner");
  });

  afterAll(async () => {
    await pool.query("DELETE FROM orders WHERE id = ANY($1)", [
      [SAMURAI_ORDER, KIRIN_ORDER],
    ]);
    await pool.end();
  });

  it("owner A logs in and is bound to their own tenant", async () => {
    const res = await request(app).post("/api/client/login").send(OWNER);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("client_owner");
    expect(res.body.user.tenant_id).toBe("samurai");
  });

  it("owner A's KDS board shows only their tenant's orders (never tenant B)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/client/login").send(OWNER).expect(200);

    const res = await agent.get("/api/client/kds/orders");
    expect(res.status).toBe(200);
    expect(res.body.tenant_id).toBe("samurai");

    const ids = (res.body.orders as Array<{ id: string }>).map((o) => o.id);
    expect(ids).toContain(SAMURAI_ORDER);
    expect(ids).not.toContain(KIRIN_ORDER);
  });

  it("owner A CANNOT mutate another tenant's order (404, no cross-tenant leak)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/client/login").send(OWNER).expect(200);

    const res = await agent
      .patch(`/api/client/kds/orders/${KIRIN_ORDER}/status`)
      .send({ status: "ready" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Order not found");
  });

  it("a master account cannot log into /client", async () => {
    const res = await request(app).post("/api/client/login").send(MASTER);
    expect(res.status).toBe(401);
  });

  it("no session => no data (board requires auth)", async () => {
    const res = await request(app).get("/api/client/kds/orders");
    expect(res.status).toBe(401);
  });

  it("positive control: owner CAN advance their own order (isolation, not blanket-deny)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/client/login").send(OWNER).expect(200);

    const res = await agent
      .patch(`/api/client/kds/orders/${SAMURAI_ORDER}/status`)
      .send({ status: "ready" });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.status).toBe("ready");
  });
});
