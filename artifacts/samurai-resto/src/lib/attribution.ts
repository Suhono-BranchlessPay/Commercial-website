/**
 * First-touch attribution for Orderly storefront (Blok C1 / D4).
 * Captures UTM + ?src= on first page load; persists for the session;
 * used at checkout to set orders.channel + source_detail.
 *
 * First-touch wins — later UTMs do not overwrite within the same tab session.
 */
const STORAGE_PREFIX = "orderly_attribution_";

export type StorefrontAttribution = {
  channel: string;
  source_detail: Record<string, unknown>;
  captured_at: string;
};

function storageKey(tenantId: string): string {
  return `${STORAGE_PREFIX}${tenantId || "default"}`;
}

function mapSourceToChannel(opts: {
  utmSource?: string | null;
  src?: string | null;
}): string {
  const u = (opts.utmSource || "").trim().toLowerCase();
  const s = (opts.src || "").trim().toLowerCase();

  if (u === "google" || s === "google" || s === "gbp") return "google";
  if (u === "facebook" || u === "fb" || s === "facebook" || s === "fb")
    return "facebook";
  if (u === "instagram" || u === "ig" || s === "instagram" || s === "ig")
    return "instagram";
  if (u === "tiktok" || s === "tiktok") return "tiktok";
  if (s === "flyer" || s === "qr" || u === "qr") return "qr";
  if (u === "doordash" || s === "doordash") return "doordash";
  if (u || s) return "other";
  return "web";
}

/** Call once on app boot (TenantProvider / App). Safe to call repeatedly. */
export function captureAttributionFromUrl(tenantId: string): StorefrontAttribution {
  const key = storageKey(tenantId);
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) {
      return JSON.parse(existing) as StorefrontAttribution;
    }
  } catch {
    /* ignore */
  }

  let search = "";
  let path = "/";
  let referrer = "";
  try {
    search = window.location.search || "";
    path = window.location.pathname + window.location.search;
    referrer = document.referrer || "";
  } catch {
    /* SSR / non-browser */
  }

  const params = new URLSearchParams(search);
  const utm_source = params.get("utm_source");
  const utm_medium = params.get("utm_medium");
  const utm_campaign = params.get("utm_campaign");
  const utm_content = params.get("utm_content");
  const utm_term = params.get("utm_term");
  const src = params.get("src");

  const channel = mapSourceToChannel({ utmSource: utm_source, src });
  const source_detail: Record<string, unknown> = {
    surface: "samurai-resto-checkout",
    landing_path: path,
  };
  if (utm_source) source_detail.utm_source = utm_source;
  if (utm_medium) source_detail.utm_medium = utm_medium;
  if (utm_campaign) source_detail.utm_campaign = utm_campaign;
  if (utm_content) source_detail.utm_content = utm_content;
  if (utm_term) source_detail.utm_term = utm_term;
  if (src) source_detail.src = src;
  if (referrer) source_detail.referrer = referrer;

  const attr: StorefrontAttribution = {
    channel,
    source_detail,
    captured_at: new Date().toISOString(),
  };

  try {
    sessionStorage.setItem(key, JSON.stringify(attr));
  } catch {
    /* private mode */
  }
  return attr;
}

export function getAttribution(tenantId: string): StorefrontAttribution {
  try {
    const raw = sessionStorage.getItem(storageKey(tenantId));
    if (raw) return JSON.parse(raw) as StorefrontAttribution;
  } catch {
    /* ignore */
  }
  return captureAttributionFromUrl(tenantId);
}
