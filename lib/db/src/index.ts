import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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
