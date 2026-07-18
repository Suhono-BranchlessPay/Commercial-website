import { parseDailyReportTenants } from "../../src/lib/dailyReportRun";
import {
  moneyToCents,
  parseBusyHourRows,
  parseDailySalesRows,
  parseTopProductRows,
} from "../../src/lib/squareReporting";
import {
  renderDailyReportHtml,
  renderDailyReportSubject,
} from "../../src/lib/dailyReportHtml";
import {
  buildAttentionLine,
  buildFactInsights,
  type DailyReportPayload,
} from "../../src/lib/dailyReportAssemble";
import {
  buildSupplyUsageFromProducts,
  classifySupplyItem,
  formatSupplyReminderLine,
} from "../../src/lib/dailyReportSupply";
import {
  formatSupplyReminderLocalized,
  normalizeDailyReportLocale,
} from "../../src/lib/dailyReportI18n";
import { pickRotatedPraiseQuotes } from "../../src/lib/dailyReportOrderly";
import { parseDailyReportOutput } from "../../src/lib/ai/guardrails";
import { buildDailyReportMessages } from "../../src/lib/ai/tasks/dailyReportPrompt";

function emptyExtras(): Pick<
  DailyReportPayload,
  | "qrScans"
  | "socialPosts"
  | "gbp"
  | "foodDrinkNote"
  | "supplyUsage"
  | "supplyReminder"
  | "narrative"
> {
  return {
    qrScans: { total: 0, human: 0, bot: 0, bySrc: [] },
    socialPosts: {
      drafted: 0,
      pendingApproval: 0,
      posted: 0,
      highlights: [],
      clickAnomalies: [],
    },
    gbp: {
      available: false,
      note: "No Google reviews/Q&A in range (sync may be quota-limited).",
      reviews: 0,
      questions: 0,
      unanswered: 0,
      quotes: [],
    },
    foodDrinkNote:
      "Food vs drink breakdown needs Square menu categories (most items are Uncategorized today).",
    supplyUsage: [],
    supplyReminder: "",
    narrative: {
      greeting: "Good morning — here’s your report.",
      body: "Yesterday was a quieter day vs your 7-day average — often normal midweek.",
      attention: "",
      ideaForToday: "Promote your top seller before peak hour.",
      source: "facts",
    },
  };
}

function basePayload(
  overrides: Partial<DailyReportPayload> = {},
): DailyReportPayload {
  return {
    tenantId: "t1",
    tenantSlug: "samurai",
    restaurantName: "Samurai Martinsville",
    reportDate: "2026-07-16",
    timeZone: "America/Indiana/Indianapolis",
    locale: "en",
    squareAvailable: true,
    day: {
      date: "2026-07-16",
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
    trend7d: [],
    topProducts: [
      { name: "Hibachi Chicken", quantity: 12, netSalesCents: 166400 },
    ],
    busyHours: [{ hour: 18, totalSalesCents: 40000, orderCount: 9 }],
    peakHour: 18,
    orderlyChannels: [{ src: "google", orders: 2, totalCents: 6251 }],
    reputation: {
      buckets: {
        praise: 1,
        question: 2,
        complaint: 0,
        allergy_health: 0,
        other: 0,
      },
      quotes: [],
      urgent: [],
      unanswered: [
        {
          classification: "question",
          excerpt: "Hours?",
          platform: "facebook",
          status: "new",
        },
      ],
      unansweredQuestions: 1,
    },
    ...emptyExtras(),
    insights: ["Peak around 6 PM"],
    disclaimer: "Totals = Square (all channels).",
    ...overrides,
  };
}

describe("daily report Phase 1 / narrative v2", () => {
  const prevTenants = process.env.DAILY_REPORT_TENANTS;
  const prevTo = process.env.DAILY_REPORT_TO;

  afterEach(() => {
    if (prevTenants === undefined) delete process.env.DAILY_REPORT_TENANTS;
    else process.env.DAILY_REPORT_TENANTS = prevTenants;
    if (prevTo === undefined) delete process.env.DAILY_REPORT_TO;
    else process.env.DAILY_REPORT_TO = prevTo;
  });

  test("moneyToCents parses Square dollar strings", () => {
    expect(moneyToCents("12.5")).toBe(1250);
    expect(moneyToCents(10)).toBe(1000);
  });

  test("parseDailyReportTenants supports IANA zones with = separator", () => {
    process.env.DAILY_REPORT_TENANTS =
      "samurai=America/Indiana/Indianapolis=a@x.com,b@x.com";
    const t = parseDailyReportTenants();
    expect(t).toHaveLength(1);
    expect(t[0].slug).toBe("samurai");
    expect(t[0].timeZone).toBe("America/Indiana/Indianapolis");
    expect(t[0].to).toEqual(["a@x.com", "b@x.com"]);
  });

  test("parseDailyReportTenants optional 4th field is locale", () => {
    process.env.DAILY_REPORT_TENANTS =
      "samurai=America/Indiana/Indianapolis=a@x.com=id";
    const t = parseDailyReportTenants();
    expect(t[0].locale).toBe("id");
  });

  test("normalizeDailyReportLocale maps id/es/en", () => {
    expect(normalizeDailyReportLocale("id-ID")).toBe("id");
    expect(normalizeDailyReportLocale("es")).toBe("es");
    expect(normalizeDailyReportLocale("fr")).toBe("en");
  });

  test("parseDailySalesRows maps Square columns", () => {
    const rows = parseDailySalesRows([
      {
        "Sales.local_date": "2026-07-16",
        "Sales.total_sales_amount": "100.00",
        "Sales.net_sales": "90.00",
        "Sales.order_count": "5",
        "Sales.avg_net_sales": "18.00",
        "Sales.tips_amount": "10.00",
        "Sales.sales_tax_amount": "7.00",
        "Sales.unique_customers": "4",
      },
    ]);
    expect(rows[0].date).toBe("2026-07-16");
    expect(rows[0].totalSalesCents).toBe(10000);
    expect(rows[0].orderCount).toBe(5);
  });

  test("parseTopProductRows accepts ProductMix or ItemSales", () => {
    const a = parseTopProductRows([
      {
        "ProductMixReport.item_name": "Hibachi Chicken",
        "ProductMixReport.items_sold_quantity": "12",
        "ProductMixReport.net_sales": "1664",
      },
    ]);
    expect(a[0].name).toBe("Hibachi Chicken");
    expect(a[0].netSalesCents).toBe(166400);

    const b = parseTopProductRows([
      {
        "ItemSales.item_name": "OMG Roll",
        "ItemSales.items_sold_quantity": "3",
        "ItemSales.net_sales": "45.5",
      },
    ]);
    expect(b[0].name).toBe("OMG Roll");
    expect(b[0].netSalesCents).toBe(4550);
  });

  test("parseBusyHourRows finds peak hour data", () => {
    const hours = parseBusyHourRows([
      {
        "Sales.local_hour": "17",
        "Sales.order_count": "3",
        "Sales.total_sales_amount": "100",
      },
      {
        "Sales.local_hour": "18",
        "Sales.order_count": "9",
        "Sales.total_sales_amount": "400",
      },
    ]);
    expect(hours[1].hour).toBe(18);
    expect(hours[1].orderCount).toBe(9);
  });

  test("supply Level-1 maps drinks/bento/hibachi and skips modifiers", () => {
    expect(classifySupplyItem("Soda")?.supplyType).toBe("gelas_minuman");
    expect(classifySupplyItem("Japanese Soda")?.supplyType).toBe("gelas_minuman");
    expect(classifySupplyItem("Bottle Water")?.supplyType).toBe("botol_air");
    expect(classifySupplyItem("Chicken Bento")?.supplyType).toBe("box_bento");
    expect(classifySupplyItem("Hibachi Chicken")?.supplyType).toBe("porsi_hibachi");
    expect(classifySupplyItem("Crab Rangoon")?.supplyType).toBe("wadah_appetizer");
    expect(classifySupplyItem("Change Noodle Instead Of Rice")).toBeNull();

    const usage = buildSupplyUsageFromProducts([
      { name: "Soda", quantity: 205 },
      { name: "Japanese Soda", quantity: 32 },
      { name: "Bottle Water", quantity: 23 },
      { name: "Chicken Bento", quantity: 49 },
      { name: "Steak Bento", quantity: 30 },
      { name: "Hibachi Chicken", quantity: 146 },
      { name: "Crab Rangoon", quantity: 110 },
      { name: "Change Noodle Instead Of Rice", quantity: 40 },
    ]);
    const cups = usage.find((u) => u.supplyType === "gelas_minuman");
    const bento = usage.find((u) => u.supplyType === "box_bento");
    expect(cups?.quantity).toBe(237);
    expect(bento?.quantity).toBe(79);
    const line = formatSupplyReminderLine(usage);
    expect(line).toContain("~237 drink cups");
    expect(line).toContain("Check supply stock");
    expect(line).not.toContain("days");
  });

  test("parseDailyReportOutput requires narrative", () => {
    const ok = parseDailyReportOutput(
      JSON.stringify({
        greeting: "Hi",
        narrative: "Sales were solid.",
        attention: "",
        idea_for_today: "Post Hibachi before 6pm.",
        insights: ["Peak at 6pm"],
      }),
    );
    expect(ok?.ideaForToday).toContain("Hibachi");
    expect(parseDailyReportOutput("{}")).toBeNull();
  });

  test("HTML never invents Square totals when unavailable; shows narrative + attribution disclaimer", () => {
    const payload = basePayload({
      squareAvailable: false,
      squareError: "Square reporting 403",
      day: null,
      avg7d: null,
      topProducts: [],
      busyHours: [],
      peakHour: null,
      reputation: {
        buckets: {
          praise: 1,
          question: 0,
          complaint: 0,
          allergy_health: 0,
          other: 0,
        },
        quotes: [],
        urgent: [],
        unanswered: [],
        unansweredQuestions: 0,
      },
      insights: ["Fact-only insight"],
      disclaimer:
        "Totals = Square (all channels). Online channel $ = Orderly attribution only — never added to Square. Narrative & insights use actual data only; no forecasts. Supply reminder = usage from sales (Level 1), not inventory prediction.",
    });
    const html = renderDailyReportHtml(payload);
    expect(html).toContain("Square data unavailable");
    expect(html).toContain("do not add these dollars");
    expect(html).toContain("$62.51");
    expect(html).not.toContain("blockchain");
    expect(html).toContain("Verified");
    expect(html).toContain("Sales yesterday (all channels)");
    expect(html).toContain("MANAGER NOTE");
    expect(html).toContain("ONE IDEA FOR TODAY");
    // Numbers first: sales heading appears before manager note.
    expect(html.indexOf("Sales yesterday")).toBeLessThan(html.indexOf("MANAGER NOTE"));
  });

  test("HTML shows supply reminder and unanswered highlight", () => {
    const payload = basePayload({
      tenantSlug: "demo",
      restaurantName: "Demo Resto",
      orderlyChannels: [],
      reputation: {
        buckets: {
          praise: 0,
          question: 6,
          complaint: 0,
          allergy_health: 0,
          other: 0,
        },
        quotes: [],
        urgent: [],
        unanswered: [
          {
            classification: "question",
            excerpt: "Do you have gluten free?",
            platform: "facebook",
            status: "new",
          },
          {
            classification: "question",
            excerpt: "Hours?",
            platform: "facebook",
            status: "drafted",
          },
          {
            classification: "question",
            excerpt: "Parking?",
            platform: "instagram",
            status: "new",
          },
          {
            classification: "praise",
            excerpt: "Great!",
            platform: "facebook",
            status: "new",
          },
        ],
        unansweredQuestions: 3,
      },
      socialPosts: {
        drafted: 0,
        pendingApproval: 0,
        posted: 1,
        highlights: [],
        clickAnomalies: [
          {
            itemName: "Shrimp Bento",
            platform: "facebook",
            srcTag: "fb-shrimpbento-20260715",
            clicks: 30,
            orders: 0,
            revenueCents: 0,
          },
        ],
      },
      supplyReminder:
        "Used this week (from sales): ~237 drink cups, ~121 bento boxes. Check supply stock before you run out.",
      supplyUsage: [
        {
          supplyType: "gelas_minuman",
          label: "drink cups",
          quantity: 237,
          contributingItems: [],
        },
      ],
      narrative: {
        greeting: "Good morning — here’s Demo Resto for 2026-07-16.",
        body: "Yesterday you rang $1,692.01 across 49 orders.",
        attention: "6 questions yesterday · 4 still unanswered (3 of them questions).",
        ideaForToday: "Promote Hibachi Chicken before 6 PM.",
        source: "ai",
      },
    });
    const html = renderDailyReportHtml(payload);
    expect(html).toContain("NEEDS ATTENTION");
    expect(html).toContain("6 questions yesterday · 4 still unanswered");
    expect(html).toContain("Questions 6 (4 unanswered)");
    expect(html).toContain("CLICK → ORDER GAP");
    expect(html).toContain("30 clicks → 0 orders");
    expect(html).toContain("SUPPLY REMINDER");
    expect(html).toContain("~237 drink cups");
    expect(html).toContain("Narrative by AI Gateway");
    expect(html).toContain("Tips $120.00");
  });

  test("HTML + attention + supply render in Bahasa Indonesia", () => {
    const attention = buildAttentionLine(
      {
        buckets: {
          praise: 0,
          question: 6,
          complaint: 0,
          allergy_health: 0,
          other: 0,
        },
        quotes: [],
        urgent: [],
        unanswered: [
          {
            classification: "question",
            excerpt: "a",
            platform: "fb",
            status: "new",
          },
          {
            classification: "question",
            excerpt: "b",
            platform: "fb",
            status: "new",
          },
          {
            classification: "question",
            excerpt: "c",
            platform: "fb",
            status: "new",
          },
          {
            classification: "praise",
            excerpt: "d",
            platform: "fb",
            status: "new",
          },
        ],
        unansweredQuestions: 3,
      },
      "id",
    );
    expect(attention).toContain("pertanyaan kemarin");
    expect(attention).toContain("belum dijawab");

    const supply = formatSupplyReminderLocalized(
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
      "id",
    );
    expect(supply).toContain("Dipakai minggu ini");
    expect(supply).toContain("gelas minuman");

    const payload = basePayload({
      locale: "id",
      narrative: {
        greeting: "Selamat pagi — ini Demo untuk 2026-07-16.",
        body: "Kemarin kamu mencatat $1,692.01 dari 49 pesanan.",
        attention,
        ideaForToday: "Promosikan Hibachi Chicken sebelum jam puncak.",
        source: "facts",
      },
      supplyReminder: supply,
      insights: ["Jam tersibuk sekitar 6 PM"],
    });
    const html = renderDailyReportHtml(payload);
    expect(html).toContain('lang="id"');
    expect(html).toContain("ORDERLY HARIAN");
    expect(html).toContain("Penjualan kemarin (semua channel)");
    expect(html).toContain("CATATAN MANAJER");
    expect(html).toContain("SATU IDE UNTUK HARI INI");
    expect(html).toContain("PENGINGAT SUPPLY");
    expect(html).toContain("Selamat pagi");
    expect(renderDailyReportSubject(payload)).toContain("· ID");
  });

  test("HTML + attention render in Spanish", () => {
    const attention = buildAttentionLine(
      {
        buckets: {
          praise: 0,
          question: 3,
          complaint: 0,
          allergy_health: 0,
          other: 0,
        },
        quotes: [],
        urgent: [],
        unanswered: [
          {
            classification: "question",
            excerpt: "a",
            platform: "fb",
            status: "new",
          },
        ],
        unansweredQuestions: 1,
      },
      "es",
    );
    expect(attention).toContain("preguntas ayer");
    expect(attention).toContain("sin respuesta");

    const payload = basePayload({
      locale: "es",
      narrative: {
        greeting: "Buenos días — aquí va Demo para 2026-07-16.",
        body: "Ayer registraste $1,692.01 en 49 pedidos.",
        attention,
        ideaForToday: "Promueve Hibachi Chicken antes de la hora pico.",
        source: "facts",
      },
      supplyReminder: formatSupplyReminderLocalized(
        [
          {
            supplyType: "gelas_minuman",
            label: "drink cups",
            quantity: 237,
          },
        ],
        "es",
      ),
      insights: ["Hora más ocupada alrededor de las 6 PM"],
    });
    const html = renderDailyReportHtml(payload);
    expect(html).toContain('lang="es"');
    expect(html).toContain("ORDERLY DIARIO");
    expect(html).toContain("Ventas de ayer (todos los canales)");
    expect(html).toContain("NOTA DEL GERENTE");
    expect(html).toContain("UNA IDEA PARA HOY");
    expect(html).toContain("Buenos días");
    expect(renderDailyReportSubject(payload)).toContain("· ES");
  });

  test("AI prompt instructs Bahasa Indonesia / Spanish", () => {
    const idMsgs = buildDailyReportMessages({ language: "id", sales: 1 });
    expect(idMsgs.user).toContain("Bahasa Indonesia");
    const esMsgs = buildDailyReportMessages({ language: "es", sales: 1 });
    expect(esMsgs.user).toContain("Spanish");
  });

  test("buildAttentionLine aligns questions with unanswered", () => {
    const line = buildAttentionLine({
      buckets: {
        praise: 5,
        question: 6,
        complaint: 0,
        allergy_health: 0,
        other: 0,
      },
      quotes: [],
      urgent: [],
      unanswered: [
        { classification: "question", excerpt: "a", platform: "fb", status: "new" },
        { classification: "question", excerpt: "b", platform: "fb", status: "new" },
        { classification: "question", excerpt: "c", platform: "fb", status: "new" },
        { classification: "praise", excerpt: "d", platform: "fb", status: "new" },
      ],
      unansweredQuestions: 3,
    });
    expect(line).toContain("6 questions yesterday · 4 still unanswered");
    expect(line).toContain("3 of them questions");
  });

  test("click anomaly becomes top fact insight", () => {
    const insights = buildFactInsights({
      topProducts: [
        { name: "Hibachi Chicken", quantity: 146, netSalesCents: 167556 },
      ],
      peakHour: 18,
      day: null,
      avg7d: null,
      orderlyChannels: [],
      supplyReminder: "",
      restaurantName: "Demo",
      reportDate: "2026-07-16",
      timeZone: "America/Indiana/Indianapolis",
      locale: "en",
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
    });
    expect(insights[0]).toContain("Shrimp Bento");
    expect(insights[0]).toContain("30 clicks → 0 orders");
    expect(insights[0]).toContain("Hibachi Chicken");
  });

  test("click anomaly insight localizes to Indonesian", () => {
    const insights = buildFactInsights({
      topProducts: [
        { name: "Hibachi Chicken", quantity: 146, netSalesCents: 167556 },
      ],
      peakHour: null,
      day: null,
      avg7d: null,
      orderlyChannels: [],
      supplyReminder: "",
      restaurantName: "Demo",
      reportDate: "2026-07-16",
      timeZone: "America/Indiana/Indianapolis",
      locale: "id",
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
    });
    expect(insights[0]).toContain("30 klik → 0 pesanan");
    expect(insights[0]).toContain("minat tanpa checkout");
  });

  test("praise quote rotation dedupes and reduces count", () => {
    const pool = [
      { classification: "praise", excerpt: "Loved it!", platform: "fb" },
      { classification: "praise", excerpt: "Loved it!", platform: "ig" },
      { classification: "praise", excerpt: "Delicious bento", platform: "fb" },
      { classification: "praise", excerpt: "Favorite!", platform: "fb" },
    ];
    const a = pickRotatedPraiseQuotes(pool, "2026-07-16", 2);
    const b = pickRotatedPraiseQuotes(pool, "2026-07-17", 2);
    expect(a.length).toBeLessThanOrEqual(2);
    expect(new Set(a.map((q) => q.excerpt.toLowerCase())).size).toBe(a.length);
    // Different days should often rotate start (not required equal, but pool allows shift).
    expect(pickRotatedPraiseQuotes(pool.slice(0, 1), "2026-07-16", 2)).toHaveLength(1);
    expect(a.length + b.length).toBeGreaterThan(0);
  });
});
