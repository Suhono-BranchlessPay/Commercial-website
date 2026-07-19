/**
 * Content-Security-Policy for the public storefront (Square Web Payments SDK
 * requires Secure Context + CSP since 2025-10-01).
 *
 * Keep this permissive enough for Google Fonts, Maps Places autocomplete, and
 * Square PCI iframes — a too-strict CSP will blank the card form.
 */
export const STOREFRONT_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    "https://web.squarecdn.com",
    "https://sandbox.web.squarecdn.com",
    "https://maps.googleapis.com",
    "https://maps.gstatic.com",
  ].join(" "),
  [
    "style-src",
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
    "https://web.squarecdn.com",
    "https://sandbox.web.squarecdn.com",
  ].join(" "),
  [
    "font-src",
    "'self'",
    "data:",
    "https://fonts.gstatic.com",
    "https://square-fonts-production-f.squarecdn.com",
    "https://d1g145x70srn7h.cloudfront.net",
  ].join(" "),
  "img-src 'self' data: blob: https:",
  [
    "frame-src",
    "'self'",
    "https://web.squarecdn.com",
    "https://sandbox.web.squarecdn.com",
    "https://maps.googleapis.com",
  ].join(" "),
  [
    "connect-src",
    "'self'",
    "https://web.squarecdn.com",
    "https://sandbox.web.squarecdn.com",
    "https://pci-connect.squareup.com",
    "https://pci-connect.squareupsandbox.com",
    "https://o160250.ingest.sentry.io",
    "https://maps.googleapis.com",
    "https://maps.gstatic.com",
  ].join(" "),
  "worker-src 'self' blob:",
  "form-action 'self'",
].join("; ");

export function setStorefrontCspHeader(res: {
  setHeader: (name: string, value: string) => void;
}): void {
  res.setHeader("Content-Security-Policy", STOREFRONT_CSP);
}
