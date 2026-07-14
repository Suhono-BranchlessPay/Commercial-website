/**
 * Classify QR /r redirect hits so ROI metrics don't count scrapers.
 * Facebook (and others) hit the link to build link previews — not buyers.
 */

const BOT_UA_RE =
  /facebookexternalhit|facebot|meta-externalagent|meta-webindexer|curl\/|wget\/|python-requests|python-urllib|httpclient|go-http-client|java\/|okhttp|slackbot|twitterbot|linkedinbot|applebot|googlebot|bingbot|yandex(?:bot|images)|baiduspider|duckduckbot|semrush|ahrefs|bytespider|petalbot|headlesschrome|phantomjs|selenium|scrapy|preview\b/i;

export function isLikelyBotUserAgent(
  userAgent: string | null | undefined,
): boolean {
  const ua = (userAgent || "").trim();
  if (!ua) return false; // unknown — keep as human (don't invent "bot")
  return BOT_UA_RE.test(ua);
}

/** Postgres ~* pattern for known scrapers (bind as text param). */
export const QR_SCAN_BOT_UA_PATTERN =
  "facebookexternalhit|facebot|meta-externalagent|meta-webindexer|curl/|wget/|python-requests|python-urllib|httpclient|go-http-client|java/|okhttp|slackbot|twitterbot|linkedinbot|applebot|googlebot|bingbot|yandex|baiduspider|duckduckbot|semrush|ahrefs|bytespider|petalbot|headlesschrome|phantomjs|selenium|scrapy|preview";
