/**
 * Poll every N minutes; send once when local hour hits 4 for each tenant.
 * In-memory dedupe per process (single PM2 instance on VPS is fine for trial).
 */
import { localHour, localToday } from "./dailyReportOrderly";
import {
  parseDailyReportTenants,
  runDailyReportForTenant,
} from "./dailyReportRun";
import { logger } from "./logger";

const sentKeys = new Set<string>();

export function startDailyReportCron(): void {
  const enabled = process.env.DAILY_REPORT_ENABLED === "1";
  const intervalMs = Number(process.env.DAILY_REPORT_POLL_MS || "60000");
  if (!enabled) {
    logger.info("Daily report cron disabled (set DAILY_REPORT_ENABLED=1)");
    return;
  }
  if (!parseDailyReportTenants().length) {
    logger.warn(
      "Daily report enabled but no recipients — set DAILY_REPORT_TO or DAILY_REPORT_TENANTS",
    );
  }

  setInterval(() => {
    void tick().catch((err) =>
      logger.error({ err }, "daily report cron tick failed"),
    );
  }, Math.max(15_000, intervalMs));

  logger.info(
    { intervalMs: Math.max(15_000, intervalMs) },
    "Daily report cron enabled (local 4:00)",
  );
}

async function tick(): Promise<void> {
  const tenants = parseDailyReportTenants();
  for (const t of tenants) {
    const hour = localHour(t.timeZone);
    if (hour !== 4) continue;
    const day = localToday(t.timeZone);
    const key = `${t.slug}:${day}`;
    if (sentKeys.has(key)) continue;
    // Mark before await to avoid double-send on slow email.
    sentKeys.add(key);
    const result = await runDailyReportForTenant(t);
    if (!result.emailed) {
      // Allow retry next poll if send failed.
      sentKeys.delete(key);
      logger.warn({ result }, "daily report send skipped/failed");
    } else {
      logger.info({ result }, "daily report emailed");
    }
  }
}
