/**
 * Local trial: render daily report HTML for Bahasa Indonesia then Español.
 * Usage from repo root:
 *   node scripts/render-daily-report-locales.mjs
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(
  new URL("../artifacts/api-server/package.json", import.meta.url),
);
const { build } = require("esbuild");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "artifacts", "daily-report-i18n-trial");
const tmp = join(outDir, "_bundle.mjs");

mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [join(root, "scripts/_daily_report_locale_entry.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: tmp,
  packages: "bundle",
});

await import(pathToFileURL(tmp).href);
