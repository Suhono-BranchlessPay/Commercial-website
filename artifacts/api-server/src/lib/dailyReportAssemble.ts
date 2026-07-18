/**
 * Build one tenant's daily report payload.
 * Anti double-count: Square = all-channel total; Orderly = online attribution subset.
 */
import { eq } from "drizzle-orm";
import { db, tenantsTable } from "@workspace/db";
import { run as aiRun } from "./ai";
import type { DailyReportLlmOutput } from "./ai/guardrails";
import {
  fetchOrderlyChannelAttribution,
  fetchOrderlyGbpDay,
  fetchOrderlyQrScans,
  fetchOrderlyReputation,
  fetchOrderlySocialPosts,
  localYesterday,
  type ChannelAttribution,
  type GbpDaySummary,
  type QrScanDaySummary,
  type ReputationBucket,
  type ReputationQuote,
  type SocialPostsDaySummary,
  type UnansweredInboxItem,
} from "./dailyReportOrderly";
import {
  buildSupplyUsageFromProducts,
  type SupplyUsage,
} from "./dailyReportSupply";
import {
  disclaimerForLocale,
  foodDrinkNoteForLocale,
  formatSupplyReminderLocalized,
  localeBcp47,
  normalizeDailyReportLocale,
  type DailyReportLocale,
} from "./dailyReportI18n";
import { logger } from "./logger";
import {
  fetchSquareBusyHours,
  fetchSquareDailySales,
  fetchSquareProductMixForSupply,
  fetchSquareTopProducts,
  parseBusyHourRows,
  parseDailySalesRows,
  parseTopProductRows,
} from "./squareReporting";

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

export type DailyReportNarrative = {
  greeting: string;
  body: string;
  attention: string;
  ideaForToday: string;
  source: "ai" | "facts";
};

export type DailyReportPayload = {
  tenantId: string;
  tenantSlug: string;
  restaurantName: string;
  reportDate: string;
  timeZone: string;
  /** Owner-facing language for UI chrome + narrative (en | id | es). */
  locale: DailyReportLocale;
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
    unanswered: UnansweredInboxItem[];
    /** Questions still in unanswered statuses (subset of unanswered). */
    unansweredQuestions: number;
  };
  qrScans: QrScanDaySummary;
  socialPosts: SocialPostsDaySummary;
  gbp: GbpDaySummary;
  /** Food vs drink — blocked until Square menu categories exist. */
  foodDrinkNote: string;
  /** Level-1 supply usage from weekly product mix (facts only). */
  supplyUsage: SupplyUsage[];
  supplyReminder: string;
  narrative: DailyReportNarrative;
  insights: string[];
  disclaimer: string;
};

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function peakLabel(hour: number, locale: DailyReportLocale = "en"): string {
  const bcp = localeBcp47(locale);
  try {
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    return new Intl.DateTimeFormat(bcp, { hour: "numeric", hour12: true }).format(
      d,
    );
  } catch {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  }
}

function weekdayName(
  isoDate: string,
  timeZone: string,
  locale: DailyReportLocale = "en",
): string {
  try {
    return new Intl.DateTimeFormat(localeBcp47(locale), {
      timeZone,
      weekday: "long",
    }).format(new Date(`${isoDate}T12:00:00Z`));
  } catch {
    return "";
  }
}

/** Structured attention — never invent counts; keep Questions vs unanswered aligned. */
export function buildAttentionLine(
  reputation: DailyReportPayload["reputation"],
  locale: DailyReportLocale = "en",
): string {
  const parts: string[] = [];
  if (reputation.urgent.length) {
    const n = reputation.urgent.length;
    parts.push(
      locale === "id"
        ? `${n} item keluhan/kesehatan perlu dicek.`
        : locale === "es"
          ? `${n} ítem(s) de queja/salud necesitan revisión.`
          : `${n} complaint/health item(s) need a look.`,
    );
  }
  const q = reputation.buckets.question;
  const uq = reputation.unansweredQuestions;
  const uAll = reputation.unanswered.length;
  if (q > 0 && uAll > 0) {
    if (locale === "id") {
      parts.push(
        `${q} pertanyaan kemarin · ${uAll} masih belum dijawab` +
          (uq > 0 && uq !== uAll ? ` (${uq} di antaranya pertanyaan)` : "") +
          ".",
      );
    } else if (locale === "es") {
      parts.push(
        `${q} preguntas ayer · ${uAll} aún sin respuesta` +
          (uq > 0 && uq !== uAll ? ` (${uq} de ellas preguntas)` : "") +
          ".",
      );
    } else {
      parts.push(
        `${q} questions yesterday · ${uAll} still unanswered` +
          (uq > 0 && uq !== uAll ? ` (${uq} of them questions)` : "") +
          ".",
      );
    }
  } else if (q > 0 && uAll === 0) {
    parts.push(
      locale === "id"
        ? `${q} pertanyaan kemarin — semua sudah dijawab atau selesai.`
        : locale === "es"
          ? `${q} preguntas ayer — todas respondidas o cerradas.`
          : `${q} questions yesterday — all answered or cleared.`,
    );
  } else if (uAll > 0) {
    parts.push(
      locale === "id"
        ? `${uAll} pesan inbox masih belum dijawab.`
        : locale === "es"
          ? `${uAll} mensaje(s) del inbox aún sin respuesta.`
          : `${uAll} inbox message(s) still unanswered.`,
    );
  }
  return parts.join(" ");
}

export function buildFactInsights(
  p: Pick<
    DailyReportPayload,
    | "topProducts"
    | "peakHour"
    | "day"
    | "avg7d"
    | "orderlyChannels"
    | "supplyReminder"
    | "restaurantName"
    | "reportDate"
    | "timeZone"
    | "socialPosts"
    | "locale"
  >,
): string[] {
  const locale = p.locale ?? "en";
  const out: string[] = [];

  const anomaly = p.socialPosts.clickAnomalies[0];
  if (anomaly) {
    const top = p.topProducts[0]?.name;
    if (locale === "id") {
      out.push(
        `${anomaly.itemName}: ${anomaly.clicks} klik → ${anomaly.orders} pesanan` +
          (top
            ? ` — minat tanpa checkout; coba promosikan ${top} yang sudah laku.`
            : " — minat tanpa checkout; promosikan yang sudah laku.") +
          " (Sebagian klik bisa dari traffic influencer/share — dilacak terpisah belakangan.)",
      );
    } else if (locale === "es") {
      out.push(
        `${anomaly.itemName}: ${anomaly.clicks} clics → ${anomaly.orders} pedidos` +
          (top
            ? ` — interés sin checkout; prueba promover ${top}, que ya vende.`
            : " — interés sin checkout; promueve lo que ya vende.") +
          " (Algunos clics pueden ser tráfico de influencers/shares — tracking aparte después.)",
      );
    } else {
      out.push(
        `${anomaly.itemName}: ${anomaly.clicks} clicks → ${anomaly.orders} orders` +
          (top
            ? ` — interest without checkout; try promoting ${top}, which already sells.`
            : " — interest without checkout; promote what already sells.") +
          " (Some clicks may be influencer/share traffic — tracked separately later.)",
      );
    }
  }

  if (p.peakHour != null) {
    const peak = peakLabel(p.peakHour, locale);
    out.push(
      locale === "id"
        ? `Jam tersibuk (7 hari terakhir): sekitar ${peak}. Pertimbangkan staf dan posting 1–2 jam sebelum jendela itu.`
        : locale === "es"
          ? `Hora más ocupada (últimos 7 días): alrededor de ${peak}. Considera personal y posts 1–2 horas antes de esa ventana.`
          : `Busiest hour (last 7 days): around ${peak}. Consider staffing and posting 1–2 hours before that window.`,
    );
  }
  if (p.topProducts[0] && !anomaly) {
    const top = p.topProducts[0];
    out.push(
      locale === "id"
        ? `Penjual teratas (7 hari terakhir): ${top.name} — ${top.quantity} terjual, ${dollars(top.netSalesCents)} net. Promosikan yang sudah laku.`
        : locale === "es"
          ? `Top vendedor (últimos 7 días): ${top.name} — ${top.quantity} vendidos, ${dollars(top.netSalesCents)} neto. Promueve lo que ya vende.`
          : `Top seller (last 7 days): ${top.name} — ${top.quantity} sold, ${dollars(top.netSalesCents)} net. Promote what already sells.`,
    );
  }
  if (p.day && p.avg7d && p.avg7d.totalSalesCents > 0) {
    const pct = Math.round(
      ((p.day.totalSalesCents - p.avg7d.totalSalesCents) / p.avg7d.totalSalesCents) *
        100,
    );
    const abs = Math.abs(pct);
    if (locale === "id") {
      const dir = pct >= 0 ? "di atas" : "di bawah";
      out.push(
        `Total penjualan kemarin ${abs}% ${dir} rata-rata 7 hari (mix weekday/weekend bervariasi — ini bukan prediksi).`,
      );
    } else if (locale === "es") {
      const dir = pct >= 0 ? "por encima de" : "por debajo de";
      out.push(
        `Las ventas totales de ayer estuvieron ${abs}% ${dir} el promedio de 7 días (el mix weekday/weekend varía — esto no es un pronóstico).`,
      );
    } else {
      const dir = pct >= 0 ? "above" : "below";
      out.push(
        `Yesterday's total sales were ${abs}% ${dir} the 7-day average (weekday/weekend mix varies — this is not a forecast).`,
      );
    }
  }
  const google = p.orderlyChannels.find((c) => c.src.includes("google"));
  if (google && google.orders > 0 && out.length < 3) {
    out.push(
      locale === "id"
        ? `Orderly mencatat ${google.orders} pesanan online berbayar dari Google (${dollars(google.totalCents)}) — tanpa biaya marketplace. Ini subset total Square, bukan pendapatan ekstra.`
        : locale === "es"
          ? `Orderly registró ${google.orders} pedido(s) online pagado(s) de Google (${dollars(google.totalCents)}) — sin comisión de marketplace. Es un subconjunto de los totales de Square, no ingreso extra.`
          : `Orderly tracked ${google.orders} paid online order(s) from Google (${dollars(google.totalCents)}) — marketplace-fee free. This is a subset of Square totals, not extra revenue.`,
    );
  }
  return out.slice(0, 3);
}

function buildFactNarrative(
  p: Omit<DailyReportPayload, "narrative" | "insights" | "disclaimer">,
): DailyReportNarrative {
  const locale = p.locale ?? "en";
  const dayFallback =
    locale === "id" ? "kemarin" : locale === "es" ? "ayer" : "yesterday";
  const dayName =
    weekdayName(p.reportDate, p.timeZone, locale) || dayFallback;
  const parts: string[] = [];
  if (p.day) {
    let vs = "";
    if (p.avg7d && p.avg7d.totalSalesCents > 0) {
      const pct = Math.round(
        ((p.day.totalSalesCents - p.avg7d.totalSalesCents) /
          p.avg7d.totalSalesCents) *
          100,
      );
      if (locale === "id") {
        vs =
          pct === 0
            ? " Tepat di rata-rata 7 hari."
            : pct > 0
              ? ` Sekitar ${pct}% di atas rata-rata 7 hari — solid untuk ${dayName}.`
              : ` Sekitar ${Math.abs(pct)}% di bawah rata-rata 7 hari — sering normal untuk ${dayName}.`;
      } else if (locale === "es") {
        vs =
          pct === 0
            ? " Justo en tu promedio de 7 días."
            : pct > 0
              ? ` Alrededor de ${pct}% por encima de tu promedio de 7 días — sólido para un ${dayName}.`
              : ` Alrededor de ${Math.abs(pct)}% por debajo de tu promedio de 7 días — a menudo normal para un ${dayName}.`;
      } else {
        vs =
          pct === 0
            ? " Right on your 7-day average."
            : pct > 0
              ? ` About ${pct}% above your 7-day average — solid for a ${dayName}.`
              : ` About ${Math.abs(pct)}% below your 7-day average — often normal for a ${dayName}.`;
      }
    }
    if (locale === "id") {
      parts.push(
        `Kemarin kamu mencatat ${dollars(p.day.totalSalesCents)} dari ${p.day.orderCount} pesanan (semua channel via Square).${vs}`,
      );
    } else if (locale === "es") {
      parts.push(
        `Ayer registraste ${dollars(p.day.totalSalesCents)} en ${p.day.orderCount} pedidos (todos los canales vía Square).${vs}`,
      );
    } else {
      parts.push(
        `Yesterday you rang ${dollars(p.day.totalSalesCents)} across ${p.day.orderCount} orders (all channels via Square).${vs}`,
      );
    }
  } else if (!p.squareAvailable) {
    parts.push(
      locale === "id"
        ? `Total Square tidak tersedia untuk ${p.reportDate}. Di bawah hanya atribusi online Orderly dan inbox — gambaran hari belum lengkap.`
        : locale === "es"
          ? `Los totales de Square no estaban disponibles para ${p.reportDate}. Abajo solo hay atribución online Orderly e inbox — imagen incompleta del día.`
          : `Square totals were unavailable for ${p.reportDate}. Below is Orderly online attribution and inbox only — incomplete picture of the full day.`,
    );
  }

  if (p.topProducts[0]) {
    const top = p.topProducts[0];
    parts.push(
      locale === "id"
        ? `Penjual unggulan minggu ini: ${top.name} (${top.quantity} terjual, ${dollars(top.netSalesCents)} net).`
        : locale === "es"
          ? `Tu vendedor destacado esta semana: ${top.name} (${top.quantity} vendidos, ${dollars(top.netSalesCents)} neto).`
          : `Your standout seller this week: ${top.name} (${top.quantity} sold, ${dollars(top.netSalesCents)} net).`,
    );
  }

  if (p.peakHour != null) {
    const peak = peakLabel(p.peakHour, locale);
    parts.push(
      locale === "id"
        ? `Lalu lintas puncak sekitar ${peak} — siapkan staf sebelum rush dan jadwalkan postingan 1–2 jam lebih awal.`
        : locale === "es"
          ? `El tráfico pico está alrededor de ${peak} — personaliza antes del rush y programa posts 1–2 horas antes.`
          : `Peak traffic sits around ${peak} — staff ahead of that rush and schedule posts 1–2 hours earlier.`,
    );
  }

  const google = p.orderlyChannels.find((c) => c.src.includes("google"));
  if (google && (google.orders > 0 || google.totalCents > 0)) {
    parts.push(
      locale === "id"
        ? `Online via Orderly: Google menyumbang ${google.orders} pesanan berbayar (${dollars(google.totalCents)}) tanpa biaya marketplace — sudah termasuk di total Square, bukan ekstra.`
        : locale === "es"
          ? `Online vía Orderly: Google aportó ${google.orders} pedido(s) pagado(s) (${dollars(google.totalCents)}) sin comisión de marketplace — ya dentro del total de Square, no extra.`
          : `Online via Orderly: Google contributed ${google.orders} paid order(s) (${dollars(google.totalCents)}) with no marketplace fee — already inside the Square total, not extra.`,
    );
  }

  const anomaly = p.socialPosts.clickAnomalies[0];
  if (anomaly) {
    const top = p.topProducts[0]?.name;
    if (locale === "id") {
      parts.push(
        `${anomaly.itemName} mendapat ${anomaly.clicks} klik tapi ${anomaly.orders} pesanan berbayar` +
          (top
            ? ` — orang melihat, tidak beli. Tampilkan ${top} (penjual terbukti) saja.`
            : " — orang melihat, tidak beli. Tampilkan yang sudah laku.") +
          " Sebagian klik bisa dari traffic influencer/share (tracking terpisah belakangan).",
      );
    } else if (locale === "es") {
      parts.push(
        `${anomaly.itemName} tuvo ${anomaly.clicks} clics pero ${anomaly.orders} pedidos pagados` +
          (top
            ? ` — miraron, no compraron. Destaca ${top} (tu vendedor probado) en su lugar.`
            : " — miraron, no compraron. Destaca lo que ya vende.") +
          " Algunos de esos clics pueden ser tráfico de influencers/shares (tracking aparte después).",
      );
    } else {
      parts.push(
        `${anomaly.itemName} drew ${anomaly.clicks} clicks but ${anomaly.orders} paid orders` +
          (top
            ? ` — people looked, didn’t buy. Feature ${top} (your proven seller) instead.`
            : " — people looked, didn’t buy. Feature what already sells.") +
          " Some of those clicks may be influencer/share traffic (separate tracking later).",
      );
    }
  } else if (p.reputation.quotes[0]) {
    parts.push(
      locale === "id"
        ? `Catatan tamu: “${p.reputation.quotes[0].excerpt}”`
        : locale === "es"
          ? `Nota de un cliente: “${p.reputation.quotes[0].excerpt}”`
          : `A guest note: “${p.reputation.quotes[0].excerpt}”`,
    );
  }

  let idea = "";
  const peak = p.peakHour != null ? peakLabel(p.peakHour, locale) : "";
  if (anomaly && p.topProducts[0]) {
    idea =
      locale === "id"
        ? `Jangan dorong ${anomaly.itemName} dulu — postingan ${p.topProducts[0].name} sebelum jam puncak saja.`
        : locale === "es"
          ? `Deja de impulsar ${anomaly.itemName} por ahora — publica ${p.topProducts[0].name} antes de la hora pico.`
          : `Skip pushing ${anomaly.itemName} for now — post ${p.topProducts[0].name} before peak hour instead.`;
  } else if (p.topProducts[0] && p.peakHour != null) {
    idea =
      locale === "id"
        ? `Promosikan ${p.topProducts[0].name} dengan postingan sekitar 1–2 jam sebelum ${peak}.`
        : locale === "es"
          ? `Promueve ${p.topProducts[0].name} con un post unas 1–2 horas antes de ${peak}.`
          : `Promote ${p.topProducts[0].name} with a post about 1–2 hours before ${peak}.`;
  } else if (p.topProducts[0]) {
    idea =
      locale === "id"
        ? `Andalkan yang sudah laku — tampilkan ${p.topProducts[0].name} di postingan hari ini.`
        : locale === "es"
          ? `Apóyate en lo que ya vende — destaca ${p.topProducts[0].name} en el post de hoy.`
          : `Lean into what already sells — feature ${p.topProducts[0].name} in today’s post.`;
  } else {
    idea =
      locale === "id"
        ? "Cek dulu pesan inbox yang belum dijawab, lalu jadwalkan satu postingan sebelum rush biasa."
        : locale === "es"
          ? "Revisa primero los mensajes del inbox sin respuesta, luego programa un post antes de tu rush habitual."
          : "Review unanswered inbox items first, then schedule one post before your usual rush.";
  }

  const greeting =
    locale === "id"
      ? `Selamat pagi — ini ${p.restaurantName} untuk ${p.reportDate}.`
      : locale === "es"
        ? `Buenos días — aquí va ${p.restaurantName} para ${p.reportDate}.`
        : `Good morning — here’s ${p.restaurantName} for ${p.reportDate}.`;

  return {
    greeting,
    body: parts.join("\n\n"),
    attention: buildAttentionLine(p.reputation, locale),
    ideaForToday: idea,
    source: "facts",
  };
}

function factsForAi(
  p: Omit<DailyReportPayload, "narrative" | "insights" | "disclaimer">,
): Record<string, unknown> {
  const locale = p.locale ?? "en";
  return {
    restaurant_name: p.restaurantName,
    report_date: p.reportDate,
    weekday: weekdayName(p.reportDate, p.timeZone, locale),
    time_zone: p.timeZone,
    language: locale,
    square_available: p.squareAvailable,
    sales_yesterday: p.day
      ? {
          total_sales: dollars(p.day.totalSalesCents),
          orders: p.day.orderCount,
          customers: p.day.uniqueCustomers,
          avg_ticket: dollars(p.day.avgNetSalesCents),
          tips: dollars(p.day.tipsCents),
          tax: dollars(p.day.taxCents),
        }
      : null,
    vs_7day_avg: p.day && p.avg7d
      ? {
          total_sales_pct:
            p.avg7d.totalSalesCents > 0
              ? Math.round(
                  ((p.day.totalSalesCents - p.avg7d.totalSalesCents) /
                    p.avg7d.totalSalesCents) *
                    100,
                )
              : null,
          note: "Compare to 7-day average, not yesterday — weekday/weekend varies.",
        }
      : null,
    peak_hour_7d: p.peakHour,
    top_products_7d: p.topProducts.slice(0, 5).map((t) => ({
      name: t.name,
      qty: t.quantity,
      net: dollars(t.netSalesCents),
    })),
    orderly_online_attribution_subset: p.orderlyChannels.map((c) => ({
      src: c.src,
      orders: c.orders,
      dollars: dollars(c.totalCents),
    })),
    reputation: {
      buckets: p.reputation.buckets,
      questions_yesterday: p.reputation.buckets.question,
      unanswered_total: p.reputation.unanswered.length,
      unanswered_questions: p.reputation.unansweredQuestions,
      attention_line_use_exactly: buildAttentionLine(p.reputation, locale),
      urgent: p.reputation.urgent.map((u) => ({
        classification: u.classification,
        platform: u.platform,
        excerpt: u.excerpt,
      })),
      praise_quotes: p.reputation.quotes.map((q) => q.excerpt),
      unanswered: p.reputation.unanswered.map((u) => ({
        classification: u.classification,
        status: u.status,
        excerpt: u.excerpt,
      })),
    },
    qr_scans: {
      human: p.qrScans.human,
      bot: p.qrScans.bot,
      top_src: p.qrScans.bySrc.slice(0, 5),
    },
    social_posts: {
      ...p.socialPosts,
      click_anomalies: p.socialPosts.clickAnomalies,
    },
    note_influencer:
      "Some high-click src tags may include influencer/share traffic — do not claim all clicks are buyers. Separate influencer tracking comes later.",
    google_reviews: p.gbp,
    food_drink_note: p.foodDrinkNote,
    supply_reminder: p.supplyReminder || null,
    anti_double_count:
      "Square totals include all channels. Orderly channel dollars are a subset — never add them to Square.",
  };
}

async function generateNarrative(
  base: Omit<DailyReportPayload, "narrative" | "insights" | "disclaimer">,
): Promise<{ narrative: DailyReportNarrative; insights: string[] }> {
  const locale = base.locale ?? "en";
  const factInsights = buildFactInsights(base);
  const fallback = buildFactNarrative(base);

  try {
    const result = await aiRun({
      task: "daily_report",
      tenantId: base.tenantId,
      language: locale,
      input: { facts: factsForAi(base), language: locale },
      opts: { maxTokens: 900, temperature: 0.4, responseFormat: "json" },
    });
    if (result.ok && result.output && typeof result.output === "object") {
      const out = result.output as DailyReportLlmOutput;
      // Attention counts are code-owned (Questions vs unanswered must stay consistent).
      return {
        narrative: {
          greeting: out.greeting || fallback.greeting,
          body: out.narrative,
          attention: fallback.attention,
          ideaForToday: out.ideaForToday || fallback.ideaForToday,
          source: "ai",
        },
        insights: factInsights.length ? factInsights : out.insights,
      };
    }
    logger.warn(
      { tenantSlug: base.tenantSlug, error: result.error },
      "daily report AI narrative unavailable — using fact narrative",
    );
  } catch (err) {
    logger.warn({ err, tenantSlug: base.tenantSlug }, "daily report AI failed");
  }

  return { narrative: fallback, insights: factInsights };
}

export async function assembleDailyReport(input: {
  tenantSlug: string;
  timeZone: string;
  /** Defaults to yesterday in tenant TZ. */
  reportDate?: string;
  /** Owner language: en | id | es. Falls back to tenant.languages[0] then en. */
  locale?: string;
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

  const tenantLangs = (tenant.languages as string[] | null) ?? [];
  const locale = normalizeDailyReportLocale(
    input.locale ||
      process.env.DAILY_REPORT_LOCALE ||
      tenantLangs[0] ||
      "en",
  );

  const reportDate = input.reportDate ?? localYesterday(input.timeZone);

  const [salesRes, productsRes, hoursRes, supplyMixRes] = await Promise.all([
    fetchSquareDailySales(input.tenantSlug),
    fetchSquareTopProducts(input.tenantSlug, 10),
    fetchSquareBusyHours(input.tenantSlug),
    fetchSquareProductMixForSupply(input.tenantSlug),
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

  const supplyProducts = supplyMixRes.ok
    ? parseTopProductRows(supplyMixRes.data)
    : productsRes.ok
      ? parseTopProductRows(productsRes.data)
      : [];
  const supplyUsage = buildSupplyUsageFromProducts(supplyProducts);
  const supplyReminder = formatSupplyReminderLocalized(supplyUsage, locale);

  const [orderlyChannels, reputation, qrScans, socialPosts, gbp] =
    await Promise.all([
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
      fetchOrderlyQrScans({
        tenantId: tenant.id,
        localDate: reportDate,
        timeZone: input.timeZone,
      }),
      fetchOrderlySocialPosts({
        tenantId: tenant.id,
        localDate: reportDate,
        timeZone: input.timeZone,
      }),
      fetchOrderlyGbpDay({
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
    locale,
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
    qrScans,
    socialPosts,
    gbp,
    foodDrinkNote: foodDrinkNoteForLocale(locale),
    supplyUsage,
    supplyReminder,
  };

  const { narrative, insights } = await generateNarrative(base);

  return {
    ...base,
    narrative,
    insights,
    disclaimer: disclaimerForLocale(locale),
  };
}
