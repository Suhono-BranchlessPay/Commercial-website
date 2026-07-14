/**
 * Storefront SEO locales — prefix URLs (/es/tags/…) + hreflang.
 * Menu item names stay as the restaurant wrote them; chrome is curated.
 */

export const SEO_DEFAULT_LOCALES = [
  "en",
  "es",
  "zh",
  "vi",
  "id",
  "ar",
] as const;

export const SEO_ALL_LOCALES = [
  "en",
  "es",
  "zh",
  "vi",
  "id",
  "ar",
  "th",
  "hi",
  "fil",
  "ne",
  "my",
] as const;

export type SeoLocale = (typeof SEO_ALL_LOCALES)[number];

const SEO_LOCALE_SET = new Set<string>(SEO_ALL_LOCALES);

export const SEO_LOCALE_META: Record<
  SeoLocale,
  { ogLocale: string; dir: "ltr" | "rtl"; label: string }
> = {
  en: { ogLocale: "en_US", dir: "ltr", label: "English" },
  es: { ogLocale: "es_US", dir: "ltr", label: "Español" },
  zh: { ogLocale: "zh_CN", dir: "ltr", label: "中文" },
  vi: { ogLocale: "vi_VN", dir: "ltr", label: "Tiếng Việt" },
  id: { ogLocale: "id_ID", dir: "ltr", label: "Bahasa Indonesia" },
  ar: { ogLocale: "ar_AR", dir: "rtl", label: "العربية" },
  th: { ogLocale: "th_TH", dir: "ltr", label: "ไทย" },
  hi: { ogLocale: "hi_IN", dir: "ltr", label: "हिन्दी" },
  fil: { ogLocale: "fil_PH", dir: "ltr", label: "Filipino" },
  ne: { ogLocale: "ne_NP", dir: "ltr", label: "नेपाली" },
  my: { ogLocale: "my_MM", dir: "ltr", label: "မြန်မာ" },
};

export function isSeoLocale(code: string): code is SeoLocale {
  return SEO_LOCALE_SET.has(code);
}

/**
 * Locales to publish for a tenant.
 * - Prefer tenants.languages when it lists more than English
 * - Else default ethnic-community pack (Owner.com cannot match this)
 * - theme.seo.locales can override
 */
export function resolveSeoLocales(tenant: {
  languages?: string[] | null;
  theme?: Record<string, unknown> | null;
}): SeoLocale[] {
  const theme = tenant.theme ?? {};
  const seo =
    theme.seo && typeof theme.seo === "object" && !Array.isArray(theme.seo)
      ? (theme.seo as Record<string, unknown>)
      : null;
  if (seo && Array.isArray(seo.locales)) {
    const fromTheme = seo.locales.filter(
      (x): x is SeoLocale => typeof x === "string" && isSeoLocale(x),
    );
    if (fromTheme.length) {
      return uniqueWithEnFirst(fromTheme);
    }
  }
  const langs = (tenant.languages ?? []).filter(
    (x): x is SeoLocale => typeof x === "string" && isSeoLocale(x),
  );
  if (langs.length > 1) return uniqueWithEnFirst(langs);
  return [...SEO_DEFAULT_LOCALES];
}

function uniqueWithEnFirst(list: SeoLocale[]): SeoLocale[] {
  const out: SeoLocale[] = ["en"];
  for (const l of list) {
    if (l !== "en" && !out.includes(l)) out.push(l);
  }
  return out;
}

/** Strip optional locale prefix from a URL path. */
export function parseLocalePath(urlPath: string): {
  locale: SeoLocale;
  path: string;
} {
  const raw = urlPath.startsWith("/") ? urlPath : `/${urlPath}`;
  const m = raw.match(/^\/([a-z]{2,3})(?=\/|$)/i);
  if (m && isSeoLocale(m[1].toLowerCase())) {
    const locale = m[1].toLowerCase() as SeoLocale;
    let path = raw.slice(m[0].length) || "/";
    if (!path.startsWith("/")) path = `/${path}`;
    // /en/... canonicalizes to unprefixed English paths
    if (locale === "en") return { locale: "en", path };
    return { locale, path };
  }
  return { locale: "en", path: raw };
}

/** Build locale-aware absolute path (en = no prefix). */
export function localePath(locale: SeoLocale, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (locale === "en") return p === "" ? "/" : p;
  if (p === "/") return `/${locale}`;
  return `/${locale}${p}`;
}

export function absoluteLocaleUrl(
  domain: string,
  locale: SeoLocale,
  path: string,
): string {
  return `https://${domain}${localePath(locale, path)}`;
}
