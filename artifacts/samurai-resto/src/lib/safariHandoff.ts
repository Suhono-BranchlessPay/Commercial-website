import { isLikelyIos, isMetaInAppBrowser } from "@/lib/inAppBrowser";

/** Best-effort open real Safari / default browser from Meta WebViews. */
export function toEscapeHref(httpsUrl: string): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/Android/i.test(ua)) {
    try {
      const u = new URL(httpsUrl);
      const path = `${u.host}${u.pathname}${u.search}${u.hash}`;
      return `intent://${path}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
    } catch {
      /* fall through */
    }
  }
  if (isLikelyIos(ua) || isMetaInAppBrowser(ua)) {
    return httpsUrl.replace(/^https:\/\//i, "x-safari-https://");
  }
  return httpsUrl;
}

export function openSecureBrowser(httpsUrl: string): void {
  const href = toEscapeHref(httpsUrl);
  try {
    window.location.href = href;
  } catch {
    window.location.assign(httpsUrl);
  }
}
