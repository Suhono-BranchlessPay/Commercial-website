/**
 * Inject TENANT_SAMURAI_BRANCHLESSPAY_* / DOORDASH_* next to global keys
 * in ecosystem.config.cjs (preserves formatting). Same pattern as Square mirror.
 *
 * Usage (on VPS): node scripts/vps-mirror-samurai-bp-dd-prefixed-env.mjs
 */
import fs from "node:fs";
import path from "node:path";

const appRoot = process.env.APP_DIR || "/var/www/samurai-resto";
const ecoPath = path.join(appRoot, "ecosystem.config.cjs");
let text = fs.readFileSync(ecoPath, "utf8");

const pairs = [
  ["BRANCHLESSPAY_LICENSE_KEY", "TENANT_SAMURAI_BRANCHLESSPAY_LICENSE_KEY"],
  ["BP_LICENSE_KEY", "TENANT_SAMURAI_BP_LICENSE_KEY"],
  ["BRANCHLESSPAY_API_KEY", "TENANT_SAMURAI_BRANCHLESSPAY_API_KEY"],
  ["BRANCHLESSPAY_MERCHANT_ID", "TENANT_SAMURAI_BRANCHLESSPAY_MERCHANT_ID"],
  ["DOORDASH_DEVELOPER_ID", "TENANT_SAMURAI_DOORDASH_DEVELOPER_ID"],
  ["DOORDASH_KEY_ID", "TENANT_SAMURAI_DOORDASH_KEY_ID"],
  ["DOORDASH_SIGNING_SECRET", "TENANT_SAMURAI_DOORDASH_SIGNING_SECRET"],
];

let changed = 0;
for (const [from, to] of pairs) {
  if (new RegExp(`\\b${to}\\b`).test(text)) {
    console.log(`OK  ${to} already present`);
    continue;
  }
  const re = new RegExp(
    `([ \\t]*)(${from}\\s*:\\s*)(['\`"])([\\s\\S]*?)(\\3)(,?)`,
    "m",
  );
  const m = text.match(re);
  if (!m) {
    console.log(`SKIP ${to}: could not find ${from} assignment`);
    continue;
  }
  const indent = m[1];
  const quote = m[3];
  const value = m[4];
  const comma = m[6] || ",";
  const insertion = `\n${indent}${to}: ${quote}${value}${quote}${comma}`;
  text = text.replace(re, (full) => full + insertion);
  changed++;
  console.log(`ADD ${to} (mirrored, len=${value.length})`);
}

if (!changed) {
  console.log("No changes");
  process.exit(0);
}

const bak = `${ecoPath}.bak-bp-dd-mirror-${Date.now()}`;
fs.copyFileSync(ecoPath, bak);
fs.writeFileSync(ecoPath, text, "utf8");
console.log(`Updated ${ecoPath}`);
console.log(`Backup ${bak}`);
