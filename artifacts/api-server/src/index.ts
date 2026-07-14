import app from "./app";
import { logger } from "./lib/logger";
import { ensureDashboardSeedUsers } from "./lib/dashboardAuth";
import { listSyncableTenants, syncSquareMenuForTenant } from "./lib/squareMenuSync";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

ensureDashboardSeedUsers()
  .then(() => logger.info("Dashboard seed users ensured"))
  .catch((err) => logger.warn({ err }, "Dashboard seed skipped or failed"));

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

/**
 * Blok A — optional Square menu sync cron. Off by default (0). Never blocks
 * boot: the interval is only *scheduled* here, the actual HTTP calls to
 * Square happen later, off the startup path. See docs/BLOK_A_SQUARE_MENU_SYNC.md.
 */
const MENU_SYNC_INTERVAL_MS = Number(process.env.MENU_SYNC_INTERVAL_MS || "0");
if (MENU_SYNC_INTERVAL_MS > 0) {
  setInterval(() => {
    listSyncableTenants()
      .then(async (tenants) => {
        for (const t of tenants) {
          try {
            await syncSquareMenuForTenant({
              tenantId: t.tenantId,
              slug: t.slug,
              reason: "cron",
            });
          } catch (err) {
            logger.error({ err, tenantId: t.tenantId }, "Menu sync cron: tenant sync failed");
          }
        }
      })
      .catch((err) => {
        logger.error({ err }, "Menu sync cron: listSyncableTenants failed");
      });
  }, MENU_SYNC_INTERVAL_MS);
  logger.info({ intervalMs: MENU_SYNC_INTERVAL_MS }, "Square menu sync cron enabled");
} else {
  logger.info("Square menu sync cron disabled (set MENU_SYNC_INTERVAL_MS to enable, e.g. 900000 for 15min)");
}
