/**
 * Daily report locales (owner email). Start with en / id / es for trial.
 * UI chrome + fact fallbacks are dictionary-driven; AI narrative uses the same locale.
 */

export const DAILY_REPORT_LOCALES = ["en", "id", "es"] as const;
export type DailyReportLocale = (typeof DAILY_REPORT_LOCALES)[number];

export function normalizeDailyReportLocale(
  raw?: string | null,
): DailyReportLocale {
  const v = (raw || "").trim().toLowerCase().replace(/_/g, "-");
  if (!v) return "en";
  const base = v.split("-")[0] || v;
  if (base === "id") return "id";
  if (base === "es") return "es";
  if (base === "en") return "en";
  return "en";
}

export type DailyReportUi = {
  brand: string;
  verified: string;
  needsAttention: string;
  salesYesterday: string;
  noSquareDay: (date: string) => string;
  trend7d: string;
  trendNeedsData: string;
  busiestHours: string;
  peakHint: string;
  topProducts: string;
  noProducts: string;
  onlineAttribution: string;
  subsetWarning: string;
  channel: string;
  orders: string;
  dollars: string;
  noOnlineOrders: string;
  reputation: string;
  praise: string;
  questions: string;
  unansweredParen: (n: number) => string;
  complaints: string;
  healthAllergy: string;
  noPraise: string;
  insights: string;
  noInsights: string;
  managerNote: string;
  oneIdea: string;
  supplyReminder: string;
  supplyLevelNote: string;
  clickOrderGap: string;
  clickGapHint: string;
  squareUnavailable: (err: string) => string;
  tipsTax: (tips: string, tax: string) => string;
  vs7day: (signedPct: string) => string;
  totalSales: string;
  customers: string;
  avgTicket: string;
  noHourData: string;
  narrativeAi: string;
  narrativeFacts: string;
  recorded: string;
  subjectUpdate: string;
};

const UI: Record<DailyReportLocale, DailyReportUi> = {
  en: {
    brand: "ORDERLY DAILY",
    verified: "Verified",
    needsAttention: "⚠ NEEDS ATTENTION",
    salesYesterday: "Sales yesterday (all channels)",
    noSquareDay: (date) => `No Square daily row for ${date}.`,
    trend7d: "7-day trend",
    trendNeedsData: "Trend needs Square data.",
    busiestHours: "Busiest hours (last 7 days)",
    peakHint:
      "Peak marked in red · staff before the rush; schedule posts 1–2h earlier.",
    topProducts: "Top products (last 7 days)",
    noProducts: "No product mix data.",
    onlineAttribution: "Online attribution (Orderly)",
    subsetWarning:
      "Subset of Square — do not add these dollars to the totals above.",
    channel: "Channel / src",
    orders: "Orders",
    dollars: "$",
    noOnlineOrders: "No paid online orders attributed yesterday.",
    reputation: "Reputation",
    praise: "Praise",
    questions: "Questions",
    unansweredParen: (n) => `(${n} unanswered)`,
    complaints: "Complaints",
    healthAllergy: "Health/allergy",
    noPraise: "No new praise quotes to show today.",
    insights: "⭐ Insights",
    noInsights: "Not enough data for insights today.",
    managerNote: "MANAGER NOTE",
    oneIdea: "💡 ONE IDEA FOR TODAY",
    supplyReminder: "SUPPLY REMINDER (from sales)",
    supplyLevelNote:
      "Level 1 — usage from weekly sales only. Not a prediction of days remaining.",
    clickOrderGap: "CLICK → ORDER GAP",
    clickGapHint:
      "Interest without checkout — promote what already sells. Some clicks may be influencer/share traffic (separate tracking later).",
    squareUnavailable: (err) =>
      `Square data unavailable${err ? `: ${err}` : ""}. Showing Orderly attribution / reputation only — totals may be incomplete.`,
    tipsTax: (tips, tax) =>
      `Tips ${tips} · Tax ${tax} · Source: Square (all channels)`,
    vs7day: (signedPct) => `${signedPct}% vs 7-day avg`,
    totalSales: "Total sales",
    customers: "Customers",
    avgTicket: "Avg ticket",
    noHourData: "No hour data",
    narrativeAi: "Narrative by AI Gateway (facts only).",
    narrativeFacts: "Narrative from structured facts (AI unavailable).",
    recorded: "Verified & permanently recorded where orders are anchored.",
    subjectUpdate: "update",
  },
  id: {
    brand: "ORDERLY HARIAN",
    verified: "Terverifikasi",
    needsAttention: "⚠ PERLU PERHATIAN",
    salesYesterday: "Penjualan kemarin (semua channel)",
    noSquareDay: (date) => `Tidak ada data harian Square untuk ${date}.`,
    trend7d: "Tren 7 hari",
    trendNeedsData: "Tren membutuhkan data Square.",
    busiestHours: "Jam tersibuk (7 hari terakhir)",
    peakHint:
      "Puncak ditandai merah · siapkan staf sebelum ramai; jadwalkan postingan 1–2 jam sebelumnya.",
    topProducts: "Produk terlaris (7 hari terakhir)",
    noProducts: "Tidak ada data bauran produk.",
    onlineAttribution: "Atribusi online (Orderly)",
    subsetWarning:
      "Subset dari Square — jangan jumlahkan angka ini ke total di atas.",
    channel: "Channel / src",
    orders: "Pesanan",
    dollars: "$",
    noOnlineOrders: "Tidak ada pesanan online berbayar yang teratribusi kemarin.",
    reputation: "Reputasi",
    praise: "Pujian",
    questions: "Pertanyaan",
    unansweredParen: (n) => `(${n} belum dijawab)`,
    complaints: "Keluhan",
    healthAllergy: "Kesehatan/alergi",
    noPraise: "Belum ada kutipan pujian baru hari ini.",
    insights: "⭐ Insight",
    noInsights: "Data belum cukup untuk insight hari ini.",
    managerNote: "CATATAN MANAJER",
    oneIdea: "💡 SATU IDE UNTUK HARI INI",
    supplyReminder: "PENGINGAT SUPPLY (dari penjualan)",
    supplyLevelNote:
      "Level 1 — pemakaian dari penjualan mingguan saja. Bukan prediksi sisa hari stok.",
    clickOrderGap: "KLIK → CELAH PESANAN",
    clickGapHint:
      "Minat tanpa checkout — promosikan yang sudah laku. Sebagian klik bisa dari traffic influencer/share (tracking terpisah belakangan).",
    squareUnavailable: (err) =>
      `Data Square tidak tersedia${err ? `: ${err}` : ""}. Menampilkan atribusi/reputasi Orderly saja — total bisa tidak lengkap.`,
    tipsTax: (tips, tax) =>
      `Tips ${tips} · Pajak ${tax} · Sumber: Square (semua channel)`,
    vs7day: (signedPct) => `${signedPct}% vs rata-rata 7 hari`,
    totalSales: "Total penjualan",
    customers: "Pelanggan",
    avgTicket: "Rata-rata tiket",
    noHourData: "Tidak ada data per jam",
    narrativeAi: "Narasi oleh AI Gateway (hanya fakta).",
    narrativeFacts: "Narasi dari fakta terstruktur (AI tidak tersedia).",
    recorded: "Terverifikasi & tercatat permanen di mana pesanan di-anchor.",
    subjectUpdate: "pembaruan",
  },
  es: {
    brand: "ORDERLY DIARIO",
    verified: "Verificado",
    needsAttention: "⚠ REQUIERE ATENCIÓN",
    salesYesterday: "Ventas de ayer (todos los canales)",
    noSquareDay: (date) => `No hay fila diaria de Square para ${date}.`,
    trend7d: "Tendencia de 7 días",
    trendNeedsData: "La tendencia necesita datos de Square.",
    busiestHours: "Horas más ocupadas (últimos 7 días)",
    peakHint:
      "Pico en rojo · personal antes del rush; programa posts 1–2 h antes.",
    topProducts: "Productos top (últimos 7 días)",
    noProducts: "Sin datos de mezcla de productos.",
    onlineAttribution: "Atribución online (Orderly)",
    subsetWarning:
      "Subconjunto de Square — no sumes estos dólares a los totales de arriba.",
    channel: "Canal / src",
    orders: "Pedidos",
    dollars: "$",
    noOnlineOrders: "No hubo pedidos online pagados atribuidos ayer.",
    reputation: "Reputación",
    praise: "Elogios",
    questions: "Preguntas",
    unansweredParen: (n) => `(${n} sin respuesta)`,
    complaints: "Quejas",
    healthAllergy: "Salud/alergia",
    noPraise: "No hay nuevas citas de elogio para mostrar hoy.",
    insights: "⭐ Insights",
    noInsights: "No hay suficientes datos para insights hoy.",
    managerNote: "NOTA DEL GERENTE",
    oneIdea: "💡 UNA IDEA PARA HOY",
    supplyReminder: "RECORDATORIO DE SUPPLY (desde ventas)",
    supplyLevelNote:
      "Nivel 1 — uso solo desde ventas semanales. No es predicción de días restantes.",
    clickOrderGap: "CLICS → BRECHA DE PEDIDOS",
    clickGapHint:
      "Interés sin checkout — promueve lo que ya vende. Algunos clics pueden ser tráfico de influencers/shares (tracking aparte después).",
    squareUnavailable: (err) =>
      `Datos de Square no disponibles${err ? `: ${err}` : ""}. Mostrando solo atribución/reputación Orderly — totales pueden estar incompletos.`,
    tipsTax: (tips, tax) =>
      `Propina ${tips} · Impuesto ${tax} · Fuente: Square (todos los canales)`,
    vs7day: (signedPct) => `${signedPct}% vs promedio 7 días`,
    totalSales: "Ventas totales",
    customers: "Clientes",
    avgTicket: "Ticket promedio",
    noHourData: "Sin datos por hora",
    narrativeAi: "Narrativa por AI Gateway (solo hechos).",
    narrativeFacts: "Narrativa desde hechos estructurados (AI no disponible).",
    recorded: "Verificado y registrado de forma permanente donde se anclan los pedidos.",
    subjectUpdate: "actualización",
  },
};

export function getDailyReportUi(locale: DailyReportLocale): DailyReportUi {
  return UI[locale] ?? UI.en;
}

export function localeBcp47(locale: DailyReportLocale): string {
  if (locale === "id") return "id-ID";
  if (locale === "es") return "es-ES";
  return "en-US";
}

export function languageInstruction(locale: DailyReportLocale): string {
  if (locale === "id") {
    return "LANGUAGE: Write greeting, narrative, idea_for_today, and insights entirely in Bahasa Indonesia. JSON keys stay English. Copy attention_line_use_exactly EXACTLY into attention (already in Bahasa Indonesia).";
  }
  if (locale === "es") {
    return "LANGUAGE: Write greeting, narrative, idea_for_today, and insights entirely in Spanish (español). JSON keys stay English. Copy attention_line_use_exactly EXACTLY into attention (already in Spanish).";
  }
  return "LANGUAGE: Write greeting, narrative, idea_for_today, and insights in English. JSON keys stay English. Copy attention_line_use_exactly EXACTLY into attention.";
}

const SUPPLY_LABEL: Record<
  DailyReportLocale,
  Record<string, string>
> = {
  en: {
    gelas_minuman: "drink cups",
    botol_air: "water bottles",
    box_bento: "bento boxes",
    porsi_hibachi: "hibachi portions",
    wadah_appetizer: "appetizer containers",
  },
  id: {
    gelas_minuman: "gelas minuman",
    botol_air: "botol air",
    box_bento: "box bento",
    porsi_hibachi: "porsi hibachi",
    wadah_appetizer: "wadah appetizer",
  },
  es: {
    gelas_minuman: "vasos de bebida",
    botol_air: "botellas de agua",
    box_bento: "cajas bento",
    porsi_hibachi: "porciones hibachi",
    wadah_appetizer: "envases de entrantes",
  },
};

export function supplyLabel(
  supplyType: string,
  fallback: string,
  locale: DailyReportLocale,
): string {
  return SUPPLY_LABEL[locale]?.[supplyType] || fallback;
}

export function formatSupplyReminderLocalized(
  usage: { supplyType: string; label: string; quantity: number }[],
  locale: DailyReportLocale,
): string {
  if (!usage.length) return "";
  const parts = usage.map(
    (u) => `~${u.quantity} ${supplyLabel(u.supplyType, u.label, locale)}`,
  );
  if (locale === "id") {
    return `Dipakai minggu ini (dari penjualan): ${parts.join(", ")}. Cek stok supply sebelum habis.`;
  }
  if (locale === "es") {
    return `Usado esta semana (desde ventas): ${parts.join(", ")}. Revisa el stock de supply antes de que se acabe.`;
  }
  return `Used this week (from sales): ${parts.join(", ")}. Check supply stock before you run out.`;
}

export function disclaimerForLocale(locale: DailyReportLocale): string {
  if (locale === "id") {
    return "Total = Square (semua channel). $ channel online = atribusi Orderly saja — jangan ditambahkan ke Square. Narasi & insight hanya memakai data aktual; tanpa prediksi. Pengingat supply = pemakaian dari penjualan (Level 1), bukan prediksi stok.";
  }
  if (locale === "es") {
    return "Totales = Square (todos los canales). $ de canal online = solo atribución Orderly — nunca se suma a Square. Narrativa e insights usan solo datos reales; sin pronósticos. Recordatorio de supply = uso desde ventas (Nivel 1), no predicción de inventario.";
  }
  return "Totals = Square (all channels). Online channel $ = Orderly attribution only — never added to Square. Narrative & insights use actual data only; no forecasts. Supply reminder = usage from sales (Level 1), not inventory prediction.";
}

export function foodDrinkNoteForLocale(locale: DailyReportLocale): string {
  if (locale === "id") {
    return "Pecahan makanan vs minuman membutuhkan kategori menu Square (sebagian besar item masih Uncategorized hari ini).";
  }
  if (locale === "es") {
    return "El desglose comida vs bebida necesita categorías de menú de Square (hoy la mayoría de ítems están Uncategorized).";
  }
  return "Food vs drink breakdown needs Square menu categories (most items are Uncategorized today).";
}
