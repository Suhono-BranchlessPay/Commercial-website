import type { RequestHandler } from "express";
import { createHash, randomUUID, timingSafeEqual } from "crypto";
import { db } from "@workspace/db";
import { bridgeAuditLogTable } from "@workspace/db";

export type BridgeActor = {
  keyId: string;
  /** Tenant IDs this key may access; ["*"] = all. */
  allowedTenants: string[];
};

declare global {
  namespace Express {
    interface Request {
      bridge?: BridgeActor;
    }
  }
}

function parseBridgeKeys(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const json = process.env.ORDERLY_BRIDGE_KEYS_JSON?.trim();
  if (json) {
    try {
      const parsed = JSON.parse(json) as Record<
        string,
        { tenants?: string[] } | string[]
      >;
      for (const [key, val] of Object.entries(parsed)) {
        const tenants = Array.isArray(val)
          ? val
          : Array.isArray(val.tenants)
            ? val.tenants
            : [];
        if (key) map.set(key, tenants.length ? tenants : ["*"]);
      }
    } catch {
      /* fall through to single key */
    }
  }

  const single = process.env.ORDERLY_BRIDGE_API_KEY?.trim();
  if (single && !map.has(single)) {
    const allow =
      process.env.ORDERLY_BRIDGE_ALLOWED_TENANTS?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? [];
    map.set(single, allow.length ? allow : ["*"]);
  }
  return map;
}

function safeEqualStr(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Bearer or X-Orderly-Bridge-Key */
export const bridgeAuthMiddleware: RequestHandler = (req, res, next) => {
  const keys = parseBridgeKeys();
  if (keys.size === 0) {
    res.status(503).json({ error: "Bridge API not configured" });
    return;
  }

  const headerKey =
    (typeof req.headers["x-orderly-bridge-key"] === "string"
      ? req.headers["x-orderly-bridge-key"]
      : "") ||
    (typeof req.headers.authorization === "string" &&
    req.headers.authorization.toLowerCase().startsWith("bearer ")
      ? req.headers.authorization.slice(7).trim()
      : "");

  if (!headerKey) {
    res.status(401).json({ error: "Missing bridge API key" });
    return;
  }

  let matched: { keyId: string; tenants: string[] } | null = null;
  for (const [key, tenants] of keys.entries()) {
    if (safeEqualStr(key, headerKey)) {
      matched = { keyId: createHash("sha256").update(key).digest("hex").slice(0, 12), tenants };
      break;
    }
  }

  if (!matched) {
    res.status(401).json({ error: "Invalid bridge API key" });
    return;
  }

  req.bridge = {
    keyId: matched.keyId,
    allowedTenants: matched.tenants,
  };
  next();
};

/**
 * Force server-side tenant scope. Never trust client alone —
 * tenant_id must be in the key allowlist (or key has "*").
 */
export function assertBridgeTenantAccess(
  actor: BridgeActor,
  tenantId: string,
): boolean {
  if (!tenantId) return false;
  if (actor.allowedTenants.includes("*")) return true;
  return actor.allowedTenants.includes(tenantId);
}

export async function writeBridgeAudit(input: {
  actor: string;
  method: string;
  path: string;
  tenantId?: string | null;
  statusCode?: number;
}): Promise<void> {
  try {
    await db.insert(bridgeAuditLogTable).values({
      id: randomUUID(),
      actor: input.actor,
      method: input.method,
      path: input.path,
      tenantId: input.tenantId ?? null,
      statusCode: input.statusCode ?? null,
    });
  } catch {
    /* audit must not break API */
  }
}

/** Simple in-memory rate limit per key (bridge is low QPS). */
const hits = new Map<string, { count: number; resetAt: number }>();

export const bridgeRateLimitMiddleware: RequestHandler = (req, res, next) => {
  const keyId = req.bridge?.keyId ?? "anon";
  const now = Date.now();
  const windowMs = 60_000;
  const max = Number(process.env.ORDERLY_BRIDGE_RATE_LIMIT_PER_MIN || 120);
  let bucket = hits.get(keyId);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + windowMs };
    hits.set(keyId, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) {
    res.status(429).json({ error: "Rate limit exceeded" });
    return;
  }
  next();
};
