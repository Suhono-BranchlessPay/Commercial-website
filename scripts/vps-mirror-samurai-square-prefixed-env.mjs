/**
 * Inject TENANT_SAMURAI_SQUARE_* next to existing SQUARE_* in ecosystem.config.cjs
 * without rewriting the whole file (preserves comments / formatting).
 *
 * Usage (on VPS): node scripts/vps-mirror-samurai-square-prefixed-env.mjs
 */
import fs from "node:fs";
import path from "node:path";

const appRoot = process.env.APP_DIR || "/var/www/samurai-resto";
const ecoPath = path.join(appRoot, "ecosystem.config.cjs");
let text = fs.readFileSync(ecoPath, "utf8");

const pairs = [
  ["SQUARE_ACCESS_TOKEN", "TENANT_SAMURAI_SQUARE_ACCESS_TOKEN"],
  ["SQUARE_LOCATION_ID", "TENANT_SAMURAI_SQUARE_LOCATION_ID"],
  ["SQUARE_APPLICATION_ID", "TENANT_SAMURAI_SQUARE_APPLICATION_ID"],
  ["SQUARE_ENVIRONMENT", "TENANT_SAMURAI_SQUARE_ENVIRONMENT"],
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

const bak = `${ecoPath}.bak-square-mirror-${Date.now()}`;
fs.copyFileSync(ecoPath, bak);
fs.writeFileSync(ecoPath, text, "utf8");
console.log(`Updated ${ecoPath}`);
console.log(`Backup ${bak}`);
