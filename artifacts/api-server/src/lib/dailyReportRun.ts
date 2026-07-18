/**
 * Orchestrate assemble → HTML → email for one or more tenants.
 */
import { assembleDailyReport } from "./dailyReportAssemble";
import {
  renderDailyReportHtml,
  renderDailyReportSubject,
} from "./dailyReportHtml";
import {
  normalizeDailyReportLocale,
  type DailyReportLocale,
} from "./dailyReportI18n";
import { sendEmail } from "./emailSend";
import { logger } from "./logger";

export type DailyReportTenantConfig = {
  slug: string;
  timeZone: string;
  to: string[];
  /** Optional per-tenant override (en | id | es). */
  locale?: DailyReportLocale;
};

/**
 * Parse DAILY_REPORT_TENANTS env.
 * Format (avoid `:` because IANA zones contain it):
 *   slug=Timezone=email[,email2][=locale];slug2=Timezone=email
 * Example:
 *   samurai=America/Indiana/Indianapolis=owner@example.com=id
 * Or use DAILY_REPORT_TENANT_SLUG + DAILY_REPORT_TZ + DAILY_REPORT_TO (+ DAILY_REPORT_LOCALE).
 */
export function parseDailyReportTenants(
  raw = process.env.DAILY_REPORT_TENANTS || "",
): DailyReportTenantConfig[] {
  const globalTo = (process.env.DAILY_REPORT_TO || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const defaultTz =
    process.env.DAILY_REPORT_TZ?.trim() || "America/Indiana/Indianapolis";
  const defaultLocale = process.env.DAILY_REPORT_LOCALE?.trim()
    ? normalizeDailyReportLocale(process.env.DAILY_REPORT_LOCALE)
    : undefined;

  if (!raw.trim()) {
    const slug = process.env.DAILY_REPORT_TENANT_SLUG?.trim() || "samurai";
    if (!globalTo.length) return [];
    return [
      {
        slug,
        timeZone: defaultTz,
        to: globalTo,
        locale: defaultLocale,
      },
    ];
  }

  return raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [slug, tz, emails, localeRaw] = part.split("=");
      const to = (emails || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const locale = localeRaw?.trim()
        ? normalizeDailyReportLocale(localeRaw)
        : defaultLocale;
      return {
        slug: (slug || "").trim(),
        timeZone: (tz || defaultTz).trim(),
        to: to.length ? to : globalTo,
        locale,
      };
    })
    .filter((t) => t.slug && t.to.length);
}

export type RunDailyReportResult = {
  tenantSlug: string;
  reportDate: string;
  locale?: DailyReportLocale;
  emailed: boolean;
  emailId?: string;
  error?: string;
  squareAvailable: boolean;
};

export async function runDailyReportForTenant(
  cfg: DailyReportTenantConfig,
  opts?: { reportDate?: string; dryRun?: boolean; locale?: string },
): Promise<RunDailyReportResult> {
  const locale = normalizeDailyReportLocale(
    opts?.locale || cfg.locale || process.env.DAILY_REPORT_LOCALE || "en",
  );
  const payload = await assembleDailyReport({
    tenantSlug: cfg.slug,
    timeZone: cfg.timeZone,
    reportDate: opts?.reportDate,
    locale,
  });
  if (!payload) {
    return {
      tenantSlug: cfg.slug,
      reportDate: opts?.reportDate || "",
      locale,
      emailed: false,
      error: "tenant_not_found",
      squareAvailable: false,
    };
  }

  const html = renderDailyReportHtml(payload);
  const subject = renderDailyReportSubject(payload);

  if (opts?.dryRun) {
    logger.info(
      {
        tenantSlug: cfg.slug,
        reportDate: payload.reportDate,
        locale: payload.locale,
        squareAvailable: payload.squareAvailable,
        subject,
      },
      "daily report dry-run (not emailed)",
    );
    return {
      tenantSlug: cfg.slug,
      reportDate: payload.reportDate,
      locale: payload.locale,
      emailed: false,
      squareAvailable: payload.squareAvailable,
    };
  }

  const textBody = [
    payload.narrative.greeting,
    "",
    payload.narrative.body,
    payload.narrative.attention ? `\nNeeds attention: ${payload.narrative.attention}` : "",
    payload.narrative.ideaForToday
      ? `\nIdea for today: ${payload.narrative.ideaForToday}`
      : "",
    payload.supplyReminder ? `\n${payload.supplyReminder}` : "",
    "",
    payload.disclaimer,
  ]
    .filter(Boolean)
    .join("\n");

  const sent = await sendEmail({
    to: cfg.to,
    subject,
    html,
    text: textBody,
  });

  if (!sent.ok) {
    return {
      tenantSlug: cfg.slug,
      reportDate: payload.reportDate,
      locale: payload.locale,
      emailed: false,
      error: sent.error,
      squareAvailable: payload.squareAvailable,
    };
  }

  return {
    tenantSlug: cfg.slug,
    reportDate: payload.reportDate,
    locale: payload.locale,
    emailed: true,
    emailId: sent.id,
    squareAvailable: payload.squareAvailable,
  };
}

export async function runDailyReportsForConfiguredTenants(opts?: {
  reportDate?: string;
  dryRun?: boolean;
  locale?: string;
}): Promise<RunDailyReportResult[]> {
  const tenants = parseDailyReportTenants();
  const out: RunDailyReportResult[] = [];
  for (const t of tenants) {
    try {
      out.push(await runDailyReportForTenant(t, opts));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err, slug: t.slug }, "daily report tenant failed");
      out.push({
        tenantSlug: t.slug,
        reportDate: opts?.reportDate || "",
        locale: normalizeDailyReportLocale(opts?.locale || t.locale || "en"),
        emailed: false,
        error: msg,
        squareAvailable: false,
      });
    }
  }
  return out;
}
