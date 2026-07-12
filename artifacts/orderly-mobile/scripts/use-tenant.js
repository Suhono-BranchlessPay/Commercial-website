#!/usr/bin/env node
/**
 * Select white-label app variant.
 * Usage:
 *   node scripts/use-tenant.js samurai-martinsville
 *   node scripts/use-tenant.js samurai-linton
 *   node scripts/use-tenant.js kirin
 */
const fs = require("fs");
const path = require("path");

const aliases = {
  samurai: "samurai-martinsville",
  martinsville: "samurai-martinsville",
  linton: "samurai-linton",
};

let slug = (process.argv[2] || "samurai-martinsville").toLowerCase();
slug = aliases[slug] || slug;

const root = path.join(__dirname, "..");
const tenantDir = path.join(root, "tenants", slug);
if (!fs.existsSync(path.join(tenantDir, "config.json"))) {
  console.error(`Unknown tenant: ${slug}`);
  console.error("Try: samurai-martinsville | samurai-linton | kirin");
  process.exit(1);
}

const cfg = JSON.parse(
  fs.readFileSync(path.join(tenantDir, "config.json"), "utf8"),
);

const envPath = path.join(root, ".env");
const lines = [
  `EXPO_PUBLIC_TENANT_SLUG=${slug}`,
  `# Sandbox only — remove for production EAS builds with In-App Payments SDK`,
  `EXPO_PUBLIC_SQUARE_TEST_NONCE=1`,
  `EXPO_PUBLIC_PAYMENT_PROVIDER=square`,
];
fs.writeFileSync(envPath, lines.join("\n") + "\n");
console.log(`App variant: ${slug}`);
console.log(`Store name: ${cfg.appName}`);
console.log(`Android package: ${cfg.androidPackage}`);
console.log(`API: ${cfg.apiBaseUrl || "(none — coming soon)"} → backend slug=${cfg.slug}`);
console.log(`Wrote ${envPath}`);
console.log(`Next: npx expo start --android`);
