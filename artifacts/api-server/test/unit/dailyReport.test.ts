import { parseDailyReportTenants } from "../../src/lib/dailyReportRun";
import {
  moneyToCents,
  parseBusyHourRows,
  parseDailySalesRows,
  parseTopProductRows,
} from "../../src/lib/squareReporting";
import { renderDailyReportHtml } from "../../src/lib/dailyReportHtml";
import type { DailyReportPayload } from "../../src/lib/dailyReportAssemble";

describe("daily report Phase 1", () => {
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

  test("HTML never invents Square totals when unavailable; shows attribution disclaimer", () => {
    const payload: DailyReportPayload = {
      tenantId: "t1",
      tenantSlug: "samurai",
      restaurantName: "Samurai Martinsville",
      reportDate: "2026-07-16",
      timeZone: "America/Indiana/Indianapolis",
      squareAvailable: false,
      squareError: "Square reporting 403",
      day: null,
      avg7d: null,
      trend7d: [],
      topProducts: [],
      busyHours: [],
      peakHour: null,
      orderlyChannels: [{ src: "google", orders: 2, totalCents: 6251 }],
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
      },
      insights: ["Fact-only insight"],
      disclaimer:
        "Totals = Square (all channels). Online channel $ = Orderly attribution only — never added to Square. Insights use actual data only; no forecasts.",
    };
    const html = renderDailyReportHtml(payload);
    expect(html).toContain("Square data unavailable");
    expect(html).toContain("do not add these dollars");
    expect(html).toContain("$62.51");
    expect(html).not.toContain("blockchain");
    expect(html).toContain("Verified");
  });
});
