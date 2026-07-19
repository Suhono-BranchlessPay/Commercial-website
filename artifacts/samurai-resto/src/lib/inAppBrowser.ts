/**
 * Detect Meta / Instagram / TikTok in-app browsers where Square Web Payments
 * card iframes often fail to become ready (Pay stuck disabled before tokenize).
 */

export function isMetaInAppBrowser(
  ua: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
): boolean {
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

export function isLikelyIos(
  ua: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
): boolean {
  return /iPhone|iPad|iPod/i.test(ua || "");
}

/** Snapshot for analytics meta — never guess payment stage from this alone. */
export function browserPaymentContext(): {
  in_app_browser: boolean;
  ios: boolean;
  is_secure_context: boolean;
  ua_short: string;
} {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return {
    in_app_browser: isMetaInAppBrowser(ua),
    ios: isLikelyIos(ua),
    is_secure_context:
      typeof window !== "undefined" ? Boolean(window.isSecureContext) : false,
    ua_short: (ua || "").slice(0, 180),
  };
}
