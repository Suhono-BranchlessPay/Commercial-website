/**
 * Build one tenant's daily report payload.
 * Anti double-count: Square = all-channel total; Orderly = online attribution subset.
 */
import { eq } from "drizzle-orm";
import { db, tenantsTable } from "@workspace/db";
import {
  fetchSquareBusyHours,
  fetchSquareDailySales,
  fetchSquareTopProducts,
  parseBusyHourRows,
  parseDailySalesRows,
  parseTopProductRows,
} from "./squareReporting";
import {
  fetchOrderlyChannelAttribution,
  fetchOrderlyReputation,
  localYesterday,
  type ChannelAttribution,
  type ReputationBucket,
  type ReputationQuote,
} from "./dailyReportOrderly";
import { logger } from "./logger";

export type DailyReportDay = {
  date: string;
  totalSalesCents: number;
  netSalesCents: number;
  orderCount: number;
  avgNetSalesCents: number;
  tipsCents: number;
  taxCents: number;
  uniqueCustomers: number;
};

export type DailyReportPayload = {
  tenantId: string;
  tenantSlug: string;
  restaurantName: string;
  reportDate: string;
  timeZone: string;
  squareAvailable: boolean;
  squareError?: string;
  /** Yesterday (or reportDate) from Square — all channels. */
  day: DailyReportDay | null;
  /** 7-day average of Square daily totals (for "vs 7-day avg"). */
  avg7d: {
    totalSalesCents: number;
    orderCount: number;
    uniqueCustomers: number;
    avgNetSalesCents: number;
  } | null;
  trend7d: DailyReportDay[];
  topProducts: { name: string; quantity: number; netSalesCents: number }[];
  busyHours: { hour: number; totalSalesCents: number; orderCount: number }[];
  peakHour: number | null;
  /** Orderly online attribution — DO NOT add to Square totals. */
  orderlyChannels: ChannelAttribution[];
  reputation: {
    buckets: ReputationBucket;
    quotes: ReputationQuote[];
    urgent: ReputationQuote[];
  };
  insights: string[];
  disclaimer: string;
};

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function buildFactInsights(p: Omit<DailyReportPayload, "insights" | "disclaimer">): string[] {
  const out: string[] = [];
  if (p.topProducts[0] && p.peakHour != null) {
    const peakLabel =
      p.peakHour === 0
        ? "12 AM"
        : p.peakHour < 12
          ? `${p.peakHour} AM`
          : p.peakHour === 12
            ? "12 PM"
            : `${p.peakHour - 12} PM`;
    out.push(
      `Busiest hour (last 7 days): around ${peakLabel}. Consider staffing and posting 1–2 hours before that window.`,
    );
  }
  if (p.topProducts[0]) {
    const top = p.topProducts[0];
    out.push(
      `Top seller (last 7 days): ${top.name} — ${top.quantity} sold, ${dollars(top.netSalesCents)} net. Promote what already sells.`,
    );
  }
  if (p.day && p.avg7d && p.avg7d.totalSalesCents > 0) {
    const pct = Math.round(
      ((p.day.totalSalesCents - p.avg7d.totalSalesCents) / p.avg7d.totalSalesCents) *
        100,
    );
    const dir = pct >= 0 ? "above" : "below";
    out.push(
      `Yesterday's total sales were ${Math.abs(pct)}% ${dir} the 7-day average (weekday/weekend mix varies — this is not a forecast).`,
    );
  }
  const google = p.orderlyChannels.find((c) => c.src.includes("google"));
  if (google && google.orders > 0) {
    out.push(
      `Orderly tracked ${google.orders} paid online order(s) from Google (${dollars(google.totalCents)}) — marketplace-fee free. This is a subset of Square totals, not extra revenue.`,
    );
  }
  return out.slice(0, 3);
}

export async function assembleDailyReport(input: {
  tenantSlug: string;
  timeZone: string;
  /** Defaults to yesterday in tenant TZ. */
  reportDate?: string;
}): Promise<DailyReportPayload | null> {
  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, input.tenantSlug))
    .limit(1);
  if (!tenant) {
    logger.warn({ slug: input.tenantSlug }, "daily report: tenant not found");
    return null;
  }

  const reportDate = input.reportDate ?? localYesterday(input.timeZone);

  const [salesRes, productsRes, hoursRes] = await Promise.all([
    fetchSquareDailySales(input.tenantSlug),
    fetchSquareTopProducts(input.tenantSlug),
    fetchSquareBusyHours(input.tenantSlug),
  ]);

  let squareAvailable = salesRes.ok;
  let squareError: string | undefined;
  if (!salesRes.ok) {
    squareError = salesRes.error;
    squareAvailable = false;
  }

  const trend7d = salesRes.ok ? parseDailySalesRows(salesRes.data) : [];
  const day =
    trend7d.find((d) => d.date === reportDate) ??
    trend7d[trend7d.length - 1] ??
    null;

  let avg7d: DailyReportPayload["avg7d"] = null;
  if (trend7d.length) {
    const n = trend7d.length;
    avg7d = {
      totalSalesCents: Math.round(
        trend7d.reduce((s, d) => s + d.totalSalesCents, 0) / n,
      ),
      orderCount: Math.round(
        trend7d.reduce((s, d) => s + d.orderCount, 0) / n,
      ),
      uniqueCustomers: Math.round(
        trend7d.reduce((s, d) => s + d.uniqueCustomers, 0) / n,
      ),
      avgNetSalesCents: Math.round(
        trend7d.reduce((s, d) => s + d.avgNetSalesCents, 0) / n,
      ),
    };
  }

  const topProducts = productsRes.ok
    ? parseTopProductRows(productsRes.data).slice(0, 5)
    : [];
  const busyHours = hoursRes.ok ? parseBusyHourRows(hoursRes.data) : [];
  let peakHour: number | null = null;
  if (busyHours.length) {
    peakHour = busyHours.reduce((best, h) =>
      h.orderCount > best.orderCount ? h : best,
    ).hour;
  }

  const [orderlyChannels, reputation] = await Promise.all([
    fetchOrderlyChannelAttribution({
      tenantId: tenant.id,
      localDate: reportDate,
      timeZone: input.timeZone,
    }),
    fetchOrderlyReputation({
      tenantId: tenant.id,
      localDate: reportDate,
      timeZone: input.timeZone,
    }),
  ]);

  const base = {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    restaurantName: tenant.name,
    reportDate,
    timeZone: input.timeZone,
    squareAvailable,
    squareError,
    day,
    avg7d,
    trend7d,
    topProducts,
    busyHours,
    peakHour,
    orderlyChannels,
    reputation,
  };

  const insights = buildFactInsights(base);

  return {
    ...base,
    insights,
    disclaimer:
      "Totals = Square (all channels). Online channel $ = Orderly attribution only — never added to Square. Insights use actual data only; no forecasts.",
  };
}
