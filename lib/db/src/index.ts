import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * App connection pool. `max` is tunable via PG_POOL_MAX (default 10 =
 * node-postgres default, i.e. no behavior change unless set). Raise this as
 * outlet count grows — load tests show DB reads plateau once all `max`
 * connections are busy (requests queue). Keep it below Postgres
 * `max_connections` minus headroom for other clients / the health pool.
 */
const APP_POOL_MAX = Number(process.env.PG_POOL_MAX || 10);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number.isFinite(APP_POOL_MAX) && APP_POOL_MAX > 0 ? APP_POOL_MAX : 10,
});
export const db = drizzle(pool, { schema });

/**
 * Dedicated, isolated pool for health/readiness probes.
 *
 * Kept separate from the app `pool` (max: 1) so frequent /readyz polling — or a
 * slow/stuck database — can never exhaust the connections real traffic needs.
 * statement_timeout + query_timeout ensure a hung probe query is actually
 * cancelled (server- and client-side) and its connection released, rather than
 * held open. connectionTimeoutMillis makes a probe fail fast (→ 503) when the
 * single health connection is busy instead of hanging.
 */
let healthPool: InstanceType<typeof Pool> | null = null;

export async function pingDatabase(timeoutMs = 2000): Promise<void> {
  if (!healthPool) {
    healthPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: timeoutMs,
      idleTimeoutMillis: 10_000,
      statement_timeout: timeoutMs,
      query_timeout: timeoutMs,
    });
  }
  await healthPool.query("SELECT 1");
}

/** Close the health pool (tests / graceful shutdown). */
export async function endHealthPool(): Promise<void> {
  if (healthPool) {
    await healthPool.end();
    healthPool = null;
  }
}

export * from "./schema";
