/**
 * Verify META_PAGE_ID_TENANT_MAP_JSON still has Samurai + optional tenants.
 *
 * Usage:
 *   node scripts/vps-verify-meta-page-map.mjs
 *   REQUIRE_TENANTS=samurai,kirin node scripts/vps-verify-meta-page-map.mjs
 *   REQUIRE_PAGES=1031895316670551,<kirinPageId> node scripts/vps-verify-meta-page-map.mjs
 */
import path from "node:path";
import { createRequire } from "node:module";

const appRoot = process.env.APP_DIR || "/var/www/samurai-resto";
const ecoPath = path.join(appRoot, "ecosystem.config.cjs");
const require = createRequire(import.meta.url);
const SAMURAI_PAGE_ID = "1031895316670551";

const eco = require(ecoPath);
const env = eco.apps?.find((a) => a.name === "samurai-api")?.env || {};
const raw = env.META_PAGE_ID_TENANT_MAP_JSON || "";
let map;
try {
  map = JSON.parse(String(raw).trim());
} catch {
  console.error("FAIL: map JSON invalid");
  process.exit(1);
}

console.log("MAP:", JSON.stringify(map));
console.log("KEYS:", Object.keys(map).sort().join(", ") || "(none)");

let ok = true;
if (map[SAMURAI_PAGE_ID] !== "samurai") {
  console.error(
    `FAIL: Samurai page ${SAMURAI_PAGE_ID} → ${JSON.stringify(map[SAMURAI_PAGE_ID])}`,
  );
  ok = false;
} else {
  console.log(`OK Samurai: ${SAMURAI_PAGE_ID} → samurai`);
}

const requireTenants = (process.env.REQUIRE_TENANTS || "samurai")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
for (const t of requireTenants) {
  const hit = Object.entries(map).find(([, v]) => v === t);
  if (!hit) {
    console.error(`FAIL: no page mapped to tenant "${t}"`);
    ok = false;
  } else {
    console.log(`OK tenant ${t}: page ${hit[0]}`);
  }
}

const requirePages = (process.env.REQUIRE_PAGES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
for (const p of requirePages) {
  if (!map[p]) {
    console.error(`FAIL: page ${p} not in map`);
    ok = false;
  } else {
    console.log(`OK page ${p} → ${map[p]}`);
  }
}

process.exit(ok ? 0 : 1);
