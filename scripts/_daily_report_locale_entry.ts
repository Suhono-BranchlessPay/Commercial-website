import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  renderDailyReportHtml,
  renderDailyReportSubject,
} from "../artifacts/api-server/src/lib/dailyReportHtml";
import {
  formatSupplyReminderLocalized,
  type DailyReportLocale,
} from "../artifacts/api-server/src/lib/dailyReportI18n";
import type { DailyReportPayload } from "../artifacts/api-server/src/lib/dailyReportAssemble";

function fixture(locale: DailyReportLocale): DailyReportPayload {
  const attention =
    locale === "id"
      ? "6 pertanyaan kemarin · 3 masih belum dijawab (2 di antaranya pertanyaan)."
      : locale === "es"
        ? "6 preguntas ayer · 3 aún sin respuesta (2 de ellas preguntas)."
        : "6 questions yesterday · 3 still unanswered (2 of them questions).";

  const supplyReminder = formatSupplyReminderLocalized(
    [
      {
        supplyType: "gelas_minuman",
        label: "drink cups",
        quantity: 237,
      },
      {
        supplyType: "box_bento",
        label: "bento boxes",
        quantity: 121,
      },
    ],
    locale,
  );

  const narrative =
    locale === "id"
      ? {
          greeting: "Selamat pagi — ini Samurai Martinsville untuk 2026-07-17.",
          body: "Kemarin kamu mencatat $1,692.01 dari 49 pesanan (semua channel via Square). Sekitar 11% di bawah rata-rata 7 hari — sering normal untuk Kamis.\n\nPenjual unggulan minggu ini: Hibachi Chicken (12 terjual, $1,664.00 net).",
          attention,
          ideaForToday:
            "Promosikan Hibachi Chicken dengan postingan sekitar 1–2 jam sebelum jam puncak.",
          source: "facts" as const,
        }
      : locale === "es"
        ? {
            greeting:
              "Buenos días — aquí va Samurai Martinsville para 2026-07-17.",
            body: "Ayer registraste $1,692.01 en 49 pedidos (todos los canales vía Square). Alrededor de 11% por debajo de tu promedio de 7 días — a menudo normal para un jueves.\n\nTu vendedor destacado esta semana: Hibachi Chicken (12 vendidos, $1,664.00 neto).",
            attention,
            ideaForToday:
              "Promueve Hibachi Chicken con un post unas 1–2 horas antes de la hora pico.",
            source: "facts" as const,
          }
        : {
            greeting:
              "Good morning — here’s Samurai Martinsville for 2026-07-17.",
            body: "Yesterday you rang $1,692.01 across 49 orders.",
            attention,
            ideaForToday: "Promote Hibachi Chicken before peak hour.",
            source: "facts" as const,
          };

  return {
    tenantId: "t1",
    tenantSlug: "samurai",
    restaurantName: "Samurai Martinsville",
    reportDate: "2026-07-17",
    timeZone: "America/Indiana/Indianapolis",
    locale,
    squareAvailable: true,
    day: {
      date: "2026-07-17",
      totalSalesCents: 169201,
      netSalesCents: 150000,
      orderCount: 49,
      avgNetSalesCents: 3061,
      tipsCents: 12000,
      taxCents: 8000,
      uniqueCustomers: 40,
    },
    avg7d: {
      totalSalesCents: 190000,
      orderCount: 55,
      uniqueCustomers: 45,
      avgNetSalesCents: 3400,
    },
    trend7d: [
      {
        date: "2026-07-11",
        totalSalesCents: 180000,
        netSalesCents: 160000,
        orderCount: 50,
        avgNetSalesCents: 3200,
        tipsCents: 10000,
        taxCents: 7000,
        uniqueCustomers: 42,
      },
      {
        date: "2026-07-17",
        totalSalesCents: 169201,
        netSalesCents: 150000,
        orderCount: 49,
        avgNetSalesCents: 3061,
        tipsCents: 12000,
        taxCents: 8000,
        uniqueCustomers: 40,
      },
    ],
    topProducts: [
      { name: "Hibachi Chicken", quantity: 12, netSalesCents: 166400 },
    ],
    busyHours: [{ hour: 18, totalSalesCents: 40000, orderCount: 9 }],
    peakHour: 18,
    orderlyChannels: [{ src: "google", orders: 2, totalCents: 6251 }],
    reputation: {
      buckets: {
        praise: 1,
        question: 6,
        complaint: 0,
        allergy_health: 0,
        other: 0,
      },
      quotes: [
        {
          classification: "praise",
          excerpt: "Best hibachi in town!",
          platform: "facebook",
        },
      ],
      urgent: [],
      unanswered: [
        {
          classification: "question",
          excerpt: "Do you have gluten free?",
          platform: "facebook",
          status: "new",
        },
      ],
      unansweredQuestions: 1,
    },
    qrScans: { total: 0, human: 0, bot: 0, bySrc: [] },
    socialPosts: {
      drafted: 0,
      pendingApproval: 0,
      posted: 1,
      highlights: [],
      clickAnomalies: [
        {
          itemName: "Shrimp Bento",
          platform: "facebook",
          srcTag: "fb-shrimpbento",
          clicks: 30,
          orders: 0,
          revenueCents: 0,
        },
      ],
    },
    gbp: {
      available: false,
      note: "",
      reviews: 0,
      questions: 0,
      unanswered: 0,
      quotes: [],
    },
    foodDrinkNote: "",
    supplyUsage: [],
    supplyReminder,
    narrative,
    insights:
      locale === "id"
        ? ["Shrimp Bento: 30 klik → 0 pesanan — minat tanpa checkout."]
        : locale === "es"
          ? ["Shrimp Bento: 30 clics → 0 pedidos — interés sin checkout."]
          : ["Shrimp Bento: 30 clicks → 0 orders."],
    disclaimer:
      locale === "id"
        ? "Total = Square (semua channel). $ channel online = atribusi Orderly saja."
        : locale === "es"
          ? "Totales = Square (todos los canales). $ canal online = solo atribución Orderly."
          : "Totals = Square (all channels).",
  };
}

async function main(outDir: string): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  for (const locale of ["id", "es"] as const) {
    const payload = fixture(locale);
    const html = renderDailyReportHtml(payload);
    const subject = renderDailyReportSubject(payload);
    const htmlPath = join(outDir, `daily-report-${locale}.html`);
    const metaPath = join(outDir, `daily-report-${locale}.meta.json`);
    writeFileSync(htmlPath, html, "utf8");
    writeFileSync(
      metaPath,
      JSON.stringify(
        {
          locale,
          subject,
          greeting: payload.narrative.greeting,
          attention: payload.narrative.attention,
          ideaForToday: payload.narrative.ideaForToday,
          supplyReminder: payload.supplyReminder,
          htmlPath,
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(`[${locale}] subject: ${subject}`);
    console.log(`[${locale}] wrote ${htmlPath}`);
  }
}

const out =
  process.argv[2] ||
  join(process.cwd(), "artifacts", "daily-report-i18n-trial");
await main(out);
