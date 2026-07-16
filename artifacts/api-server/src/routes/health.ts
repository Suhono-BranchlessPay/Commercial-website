/**
 * Operational health endpoints (mounted under /api via routes/index.ts; both
 * paths are exempted from tenant resolution in middleware/tenant.ts).
 *
 *   GET /api/healthz — liveness. 200 while the process is up. No DB. Cheap to
 *                      poll. Unchanged contract (HealthCheckResponse).
 *   GET /api/readyz  — readiness. 200 only if Postgres answers within a timeout
 *                      (503 otherwise). Reports pg Pool saturation
 *                      (total/idle/waiting) — watch these under load.
 */
import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool, pingDatabase } from "@workspace/db";

export type ReadinessResult = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

function withTimeout<T>(p: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`timeout after ${timeoutMs}ms`)),
      timeoutMs,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * Pure readiness check: runs `ping` under a client-side timeout backstop and
 * reports latency. Injecting `ping` keeps this deterministically unit-testable
 * (no real DB). The real ping (pingDatabase) also enforces DB-level timeouts so
 * a hung query is cancelled and its connection released — see @workspace/db.
 */
export async function checkReadiness(
  ping: () => Promise<unknown>,
  timeoutMs = 3000,
): Promise<ReadinessResult> {
  const start = Date.now();
  try {
    await withTimeout(Promise.resolve(ping()), timeoutMs);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/readyz", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const db = await checkReadiness(() => pingDatabase());
  res.status(db.ok ? 200 : 503).json({
    status: db.ok ? "ready" : "unavailable",
    uptime_s: Math.round(process.uptime()),
    version: process.env.GIT_SHA || process.env.npm_package_version || null,
    db: {
      ok: db.ok,
      latency_ms: db.latencyMs,
      ...(db.error ? { error: db.error } : {}),
      // Main application pool — watch these climb under load.
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
