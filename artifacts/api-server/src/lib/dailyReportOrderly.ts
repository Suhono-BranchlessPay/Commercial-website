/**
 * Orderly-side slices for the daily report (closed-loop + reputation).
 * These are SUBSETS — never add them into Square totals (anti double-count).
 */
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db, ordersTable, socialInboxTable } from "@workspace/db";

export type ChannelAttribution = {
  src: string;
  orders: number;
  totalCents: number;
};

export type ReputationBucket = {
  praise: number;
  question: number;
  complaint: number;
  allergy_health: number;
  other: number;
};

export type ReputationQuote = {
  classification: string;
  excerpt: string;
  platform: string;
};

function dayBoundsUtc(localDate: string, timeZone: string): { from: Date; to: Date } {
  const start = wallTimeToUtc(`${localDate}T00:00:00`, timeZone);
  const end = wallTimeToUtc(`${localDate}T23:59:59.999`, timeZone);
  return { from: start, to: end };
}

function wallTimeToUtc(localIso: string, timeZone: string): Date {
  const fakeUtc = new Date(`${localIso}Z`);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(fakeUtc).map((p) => [p.type, p.value]),
  );
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const offset = asIfUtc - fakeUtc.getTime();
  return new Date(fakeUtc.getTime() - offset);
}

export async function fetchOrderlyChannelAttribution(input: {
  tenantId: string;
  localDate: string;
  timeZone: string;
}): Promise<ChannelAttribution[]> {
  const { from, to } = dayBoundsUtc(input.localDate, input.timeZone);
  const orders = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.tenantId, input.tenantId),
        eq(ordersTable.paymentStatus, "paid"),
        gte(ordersTable.createdAt, from),
        lte(ordersTable.createdAt, to),
      ),
    );

  const map = new Map<string, ChannelAttribution>();
  for (const o of orders) {
    const detail = (o.sourceDetail ?? {}) as Record<string, unknown>;
    const src =
      String(detail.src ?? o.channel ?? "other")
        .trim()
        .toLowerCase() || "other";
    const cur = map.get(src) ?? { src, orders: 0, totalCents: 0 };
    cur.orders += 1;
    cur.totalCents += o.totalCents || 0;
    map.set(src, cur);
  }
  return [...map.values()].sort((a, b) => b.totalCents - a.totalCents);
}

export async function fetchOrderlyReputation(input: {
  tenantId: string;
  localDate: string;
  timeZone: string;
}): Promise<{
  buckets: ReputationBucket;
  quotes: ReputationQuote[];
  urgent: ReputationQuote[];
}> {
  const { from, to } = dayBoundsUtc(input.localDate, input.timeZone);
  const rows = await db
    .select()
    .from(socialInboxTable)
    .where(
      and(
        eq(socialInboxTable.tenantId, input.tenantId),
        gte(socialInboxTable.createdAt, from),
        lte(socialInboxTable.createdAt, to),
      ),
    )
    .orderBy(desc(socialInboxTable.createdAt))
    .limit(100);

  const buckets: ReputationBucket = {
    praise: 0,
    question: 0,
    complaint: 0,
    allergy_health: 0,
    other: 0,
  };
  const quotes: ReputationQuote[] = [];
  const urgent: ReputationQuote[] = [];

  for (const r of rows) {
    const cls = String(r.classification || "unknown").toLowerCase();
    if (cls === "praise") buckets.praise += 1;
    else if (cls === "question") buckets.question += 1;
    else if (cls === "complaint") buckets.complaint += 1;
    else if (cls === "allergy_health") buckets.allergy_health += 1;
    else buckets.other += 1;

    const excerpt = String(r.body || "").trim().slice(0, 160);
    if (!excerpt) continue;
    const q: ReputationQuote = {
      classification: cls,
      excerpt,
      platform: String(r.platform || "social"),
    };
    if (cls === "complaint" || cls === "allergy_health") {
      urgent.push(q);
    } else if (quotes.length < 3) {
      quotes.push(q);
    }
  }

  return { buckets, quotes, urgent };
}

export function localYesterday(timeZone: string, now = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayLocal = fmt.format(now);
  const [y, m, d] = todayLocal.split("-").map(Number);
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0);
  const yest = new Date(utcNoon - 24 * 60 * 60 * 1000);
  return fmt.format(yest);
}

export function localToday(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function localHour(timeZone: string, now = new Date()): number {
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).format(now);
  return Number(h);
}
