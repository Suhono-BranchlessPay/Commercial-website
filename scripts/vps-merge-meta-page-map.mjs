/**
 * Safe MERGE of META_PAGE_ID_TENANT_MAP_JSON in ecosystem.config.cjs.
 *
 * NEVER replaces the whole map with a single-tenant object. Always:
 *   1) read current JSON
 *   2) add/update one pageId → tenantId
 *   3) refuse if Samurai Page 1031895316670551 would leave "samurai"
 *   4) write the full merged JSON back
 *
 * Usage (on VPS):
 *   PAGE_ID=<kirinPageId> TENANT_ID=kirin node scripts/vps-merge-meta-page-map.mjs
 *   DRY_RUN=1 PAGE_ID=... TENANT_ID=kirin node scripts/vps-merge-meta-page-map.mjs
 *
 * After write: pm2 delete samurai-api && pm2 start ecosystem.config.cjs --update-env
 * Then: node scripts/vps-verify-meta-page-map.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const appRoot = process.env.APP_DIR || "/var/www/samurai-resto";
const ecoPath = path.join(appRoot, "ecosystem.config.cjs");
const require = createRequire(import.meta.url);

const SAMURAI_PAGE_ID = "1031895316670551";
const pageId = (process.env.PAGE_ID || "").trim();
const tenantId = (process.env.TENANT_ID || "").trim().toLowerCase();
const dryRun = process.env.DRY_RUN === "1";

if (!pageId || !/^\d+$/.test(pageId)) {
  console.error("ERROR: PAGE_ID required (numeric Meta Page id)");
  process.exit(1);
}
if (!tenantId || !/^[a-z][a-z0-9_-]{1,63}$/.test(tenantId)) {
  console.error("ERROR: TENANT_ID required (e.g. kirin)");
  process.exit(1);
}

let eco;
try {
  eco = require(ecoPath);
} catch (err) {
  console.error("ERROR: cannot load ecosystem.config.cjs:", err.message);
  process.exit(1);
}

const env = eco.apps?.find((a) => a.name === "samurai-api")?.env;
if (!env) {
  console.error("ERROR: samurai-api env missing");
  process.exit(1);
}

const raw = env.META_PAGE_ID_TENANT_MAP_JSON;
if (typeof raw !== "string" || !raw.trim()) {
  console.error(
    "ERROR: META_PAGE_ID_TENANT_MAP_JSON missing — refuse (would create Samurai-less map)",
  );
  process.exit(1);
}

let map;
try {
  map = JSON.parse(raw.trim());
} catch {
  console.error("ERROR: META_PAGE_ID_TENANT_MAP_JSON is not valid JSON");
  process.exit(1);
}
if (!map || typeof map !== "object" || Array.isArray(map)) {
  console.error("ERROR: map must be a JSON object");
  process.exit(1);
}

console.log("BEFORE:", JSON.stringify(map));

if (map[SAMURAI_PAGE_ID] !== "samurai") {
  console.error(
    `ERROR: Samurai Page ${SAMURAI_PAGE_ID} is not mapped to "samurai" (got ${JSON.stringify(map[SAMURAI_PAGE_ID])}) — fix before merging`,
  );
  process.exit(1);
}

const prev = map[pageId];
if (prev && prev !== tenantId) {
  console.error(
    `ERROR: page ${pageId} already mapped to "${prev}" — refuse overwrite to "${tenantId}" (set FORCE_REMAP=1 to override)`,
  );
  if (process.env.FORCE_REMAP !== "1") process.exit(1);
}

map[pageId] = tenantId;

if (map[SAMURAI_PAGE_ID] !== "samurai") {
  console.error("ERROR: merge would drop Samurai mapping — refuse");
  process.exit(1);
}

const nextJson = JSON.stringify(map);
console.log("AFTER: ", nextJson);
console.log(
  `MERGE: ${pageId} → ${tenantId}${prev ? ` (was ${prev})` : " (new)"}`,
);
console.log(`KEYS: ${Object.keys(map).sort().join(", ")}`);

if (dryRun) {
  console.log("DRY_RUN=1 — no write");
  process.exit(0);
}

let text = fs.readFileSync(ecoPath, "utf8");
const key = "META_PAGE_ID_TENANT_MAP_JSON";
const re = new RegExp(
  `([ \\t]*)(${key}\\s*:\\s*)(['\`"])([\\s\\S]*?)(\\3)(,?)`,
  "m",
);
const m = text.match(re);
if (!m) {
  console.error(`ERROR: could not find ${key} assignment in ecosystem.config.cjs`);
  process.exit(1);
}

const indent = m[1];
const quote = m[3] === "`" ? '"' : m[3];
const comma = m[6] || ",";
// Prefer double-quoted JSON string (escapes handled by JSON.stringify of the value)
const escaped = JSON.stringify(nextJson);
const replacement = `${indent}${key}: ${escaped}${comma}`;
text = text.replace(re, replacement);

const bak = `${ecoPath}.bak-meta-map-merge-${Date.now()}`;
fs.copyFileSync(ecoPath, bak);
fs.writeFileSync(ecoPath, text, "utf8");
console.log(`Wrote ${ecoPath}`);
console.log(`Backup ${bak}`);
console.log("Next:");
console.log("  pm2 delete samurai-api && pm2 start ecosystem.config.cjs --update-env");
console.log("  node scripts/vps-verify-meta-page-map.mjs");
