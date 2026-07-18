/**
 * Manual / trial trigger for daily report (not on the money path).
 * POST /api/internal/daily-report/run
 * Header: X-Daily-Report-Secret: $DAILY_REPORT_CRON_SECRET
 *
 * Body/query locale: en | id | es (trial multilingual owner email).
 */
import { Router, type IRouter } from "express";
import {
  parseDailyReportTenants,
  runDailyReportForTenant,
  runDailyReportsForConfiguredTenants,
} from "../lib/dailyReportRun";
import { assembleDailyReport } from "../lib/dailyReportAssemble";
import { renderDailyReportHtml } from "../lib/dailyReportHtml";
import { normalizeDailyReportLocale } from "../lib/dailyReportI18n";

const router: IRouter = Router();

function authorize(req: { headers: Record<string, unknown> }): boolean {
  const expected = process.env.DAILY_REPORT_CRON_SECRET?.trim();
  if (!expected) return false;
  const got = String(req.headers["x-daily-report-secret"] ?? "");
  return got.length > 0 && got === expected;
}

function pickLocale(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  return normalizeDailyReportLocale(raw);
}

router.post("/internal/daily-report/run", async (req, res): Promise<void> => {
  if (!authorize(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const dryRun = Boolean(req.body?.dryRun);
  const reportDate =
    typeof req.body?.reportDate === "string" ? req.body.reportDate : undefined;
  const slug =
    typeof req.body?.tenantSlug === "string" ? req.body.tenantSlug.trim() : "";
  const locale = pickLocale(req.body?.locale ?? req.body?.language);

  if (slug) {
    const cfg = parseDailyReportTenants().find((t) => t.slug === slug) ?? {
      slug,
      timeZone:
        process.env.DAILY_REPORT_TZ?.trim() ||
        "America/Indiana/Indianapolis",
      to: (process.env.DAILY_REPORT_TO || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      locale: process.env.DAILY_REPORT_LOCALE?.trim()
        ? normalizeDailyReportLocale(process.env.DAILY_REPORT_LOCALE)
        : undefined,
    };
    if (!cfg.to.length && !dryRun) {
      res.status(400).json({ error: "no_recipients", hint: "Set DAILY_REPORT_TO" });
      return;
    }
    const result = await runDailyReportForTenant(cfg, {
      reportDate,
      dryRun,
      locale,
    });
    res.json({ ok: !result.error || dryRun, result });
    return;
  }

  const results = await runDailyReportsForConfiguredTenants({
    reportDate,
    dryRun,
    locale,
  });
  res.json({ ok: true, results });
});

/** Preview HTML without sending (secret required). */
router.get("/internal/daily-report/preview", async (req, res): Promise<void> => {
  if (!authorize(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const slug = String(req.query.tenantSlug || "samurai").trim();
  const timeZone =
    String(req.query.tz || process.env.DAILY_REPORT_TZ || "").trim() ||
    "America/Indiana/Indianapolis";
  const reportDate =
    typeof req.query.reportDate === "string" ? req.query.reportDate : undefined;
  const locale = pickLocale(req.query.locale ?? req.query.language);
  const payload = await assembleDailyReport({
    tenantSlug: slug,
    timeZone,
    reportDate,
    locale,
  });
  if (!payload) {
    res.status(404).json({ error: "tenant_not_found" });
    return;
  }
  if (req.query.format === "json") {
    res.json(payload);
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(renderDailyReportHtml(payload));
});

export default router;
