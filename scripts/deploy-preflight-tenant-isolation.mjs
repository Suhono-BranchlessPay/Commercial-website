/**
 * Preflight before activating tenant-isolation fail-closed (maps + BP/DD).
 *
 * 1) Mirror global BRANCHLESSPAY_*/DOORDASH_* → TENANT_SAMURAI_* if missing
 * 2) Verify META_PAGE_ID_TENANT_MAP_JSON maps 1031895316670551 → samurai
 * 3) Verify TENANT_SAMURAI_BRANCHLESSPAY_LICENSE_KEY (or BP_LICENSE_KEY) present
 * 4) If any DoorDash key exists, require all three TENANT_SAMURAI_DOORDASH_*
 *
 * Exit 1 → deploy MUST NOT put fail-closed code into the running process.
 *
 * Usage: node scripts/deploy-preflight-tenant-isolation.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const appRoot = process.env.APP_DIR || process.cwd();
const ecoPath = path.join(appRoot, "ecosystem.config.cjs");
const require = createRequire(import.meta.url);
const SAMURAI_PAGE_ID = "1031895316670551";

const mirror = path.join(
  appRoot,
  "scripts/vps-mirror-samurai-bp-dd-prefixed-env.mjs",
);
if (fs.existsSync(mirror)) {
  const r = spawnSync(process.execPath, [mirror], {
    cwd: appRoot,
    encoding: "utf8",
  });
  process.stdout.write(r.stdout || "");
  process.stderr.write(r.stderr || "");
  if (r.status !== 0) {
    console.error("ERROR: BP/DD mirror script failed");
    process.exit(1);
  }
}

let eco;
try {
  eco = require(ecoPath);
} catch (err) {
  console.error("ERROR: cannot parse ecosystem.config.cjs:", err.message);
  process.exit(1);
}

const env = eco.apps?.find((a) => a.name === "samurai-api")?.env || {};
const nonempty = (v) => typeof v === "string" && v.trim().length > 0;

const mapRaw = env.META_PAGE_ID_TENANT_MAP_JSON;
if (!nonempty(mapRaw)) {
  console.error(
    "ERROR: META_PAGE_ID_TENANT_MAP_JSON missing — refuse deploy (Samurai Meta would drop all webhooks)",
  );
  process.exit(1);
}
let map;
try {
  map = JSON.parse(String(mapRaw).trim());
} catch {
  console.error("ERROR: META_PAGE_ID_TENANT_MAP_JSON is not valid JSON");
  process.exit(1);
}
if (map[SAMURAI_PAGE_ID] !== "samurai") {
  console.error(
    `ERROR: META_PAGE_ID_TENANT_MAP_JSON must include "${SAMURAI_PAGE_ID}":"samurai" (got ${JSON.stringify(map[SAMURAI_PAGE_ID])})`,
  );
  process.exit(1);
}
console.log(
  `OK Meta map: ${SAMURAI_PAGE_ID} → samurai (keys=${Object.keys(map).length})`,
);

const bpKey =
  env.TENANT_SAMURAI_BRANCHLESSPAY_LICENSE_KEY ||
  env.TENANT_SAMURAI_BP_LICENSE_KEY ||
  "";
if (!nonempty(bpKey)) {
  console.error(
    "ERROR: TENANT_SAMURAI_BRANCHLESSPAY_LICENSE_KEY (or TENANT_SAMURAI_BP_LICENSE_KEY) missing — Samurai anchors die after fail-closed deploy",
  );
  process.exit(1);
}
console.log("OK BranchlessPay tenant key (len=", String(bpKey).length, ")");

const ddPrefixed = [
  "TENANT_SAMURAI_DOORDASH_DEVELOPER_ID",
  "TENANT_SAMURAI_DOORDASH_KEY_ID",
  "TENANT_SAMURAI_DOORDASH_SIGNING_SECRET",
];
const ddGlobal = [
  "DOORDASH_DEVELOPER_ID",
  "DOORDASH_KEY_ID",
  "DOORDASH_SIGNING_SECRET",
];
const ddAny = [...ddPrefixed, ...ddGlobal].some((k) => nonempty(env[k]));
if (ddAny) {
  const missing = ddPrefixed.filter((k) => !nonempty(env[k]));
  if (missing.length) {
    console.error(
      "ERROR: DoorDash in use but missing prefixed keys:",
      missing.join(", "),
    );
    process.exit(1);
  }
  console.log("OK DoorDash TENANT_SAMURAI_DOORDASH_* present");
} else {
  console.log("OK DoorDash not configured (skip)");
}

console.log("OK preflight tenant isolation");
