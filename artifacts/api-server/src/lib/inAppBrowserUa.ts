/** Server-side UA helpers — keep in sync with storefront `inAppBrowser.ts`. */

export function isMetaInAppBrowserUa(ua: string | null | undefined): boolean {
  const u = ua || "";
  return (
    /FBAN|FBAV|FBIOS|FB_IAB|FB4A/i.test(u) ||
    /Instagram/i.test(u) ||
    /IABMV/i.test(u) ||
    /Line\//i.test(u) ||
    /TikTok/i.test(u) ||
    /BytedanceWebview/i.test(u)
  );
}

export function isLikelyIosUa(ua: string | null | undefined): boolean {
  return /iPhone|iPad|iPod/i.test(ua || "");
}

export function browserContextFromUa(ua: string | null | undefined): {
  in_app_browser: boolean;
  ios: boolean;
  ua_short: string | null;
} {
  const raw = typeof ua === "string" ? ua : null;
  return {
    in_app_browser: isMetaInAppBrowserUa(raw),
    ios: isLikelyIosUa(raw),
    ua_short: raw ? raw.slice(0, 180) : null,
  };
}
