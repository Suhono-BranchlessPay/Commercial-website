import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

// This module is bundled by esbuild into a single dist/index.mjs, so at
// runtime moduleDir is always artifacts/api-server/dist (both dev and prod).
// One level up gives us artifacts/api-server, where uploads live outside
// dist/ so they survive `pnpm run build` (which wipes dist/ on every run).
// UPLOADS_ROOT is what we mount as static "/api/uploads"; UPLOADS_DIR is the
// "menu" subfolder within it, matching the "/api/uploads/menu/..." URLs we
// generate, so the two must stay in sync.
export const UPLOADS_ROOT = path.resolve(moduleDir, "..", "uploads");
export const UPLOADS_DIR = path.resolve(UPLOADS_ROOT, "menu");

mkdirSync(UPLOADS_DIR, { recursive: true });
