import type { TenantContext } from "./tenant";
import {
  buildTenantSeo,
  type TenantSeo,
  injectTenantHead,
} from "./tenantSeo";

export type SeoTagRow = {
  slug: string;
  name: string;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  itemCount: number;
};

export type SeoPlaceRow = {
  slug: string;
  name: string;
  state: string | null;
  distanceMiles: number;
  deliveryAvailable: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  lat: number;
  lng: number;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJson(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

export type SeoPageItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
};

/** Override homepage SEO for a specific path (canonical, title, JSON-LD extras). */
export function buildPageSeo(
  tenant: TenantContext,
  opts: {
    path: string;
    title: string;
    description: string;
    noindex?: boolean;
  },
): TenantSeo {
  const base = buildTenantSeo(tenant);
  const path = opts.path.startsWith("/") ? opts.path : `/${opts.path}`;
  const canonical = `https://${tenant.domain}${path}`;
  return {
    ...base,
    title: opts.title,
    description: opts.description,
    ogTitle: opts.title,
    ogDescription: opts.description,
    canonical,
    ogUrl: canonical,
  };
}

export function renderTagSsrBody(opts: {
  seo: TenantSeo;
  tag: SeoTagRow;
  items: SeoPageItem[];
  relatedTags: Array<{ slug: string; name: string }>;
}): string {
  const { seo, tag, items, relatedTags } = opts;
  const city = seo.address.city || "";
  const h1 = city
    ? `${escapeHtml(tag.name)} in ${escapeHtml(city)} — ${escapeHtml(seo.brandName)}`
    : `${escapeHtml(tag.name)} — ${escapeHtml(seo.brandName)}`;

  const itemListJson = items
    .map(
      (it, i) => `{
      "@type": "ListItem",
      "position": ${i + 1},
      "item": {
        "@type": "MenuItem",
        "name": "${escapeJson(it.name)}",
        "description": "${escapeJson(it.description || "")}",
        "offers": {
          "@type": "Offer",
          "price": "${Number(it.price).toFixed(2)}",
          "priceCurrency": "USD"
        }
      }
    }`,
    )
    .join(",\n");

  const cards = items
    .map((it) => {
      const img = it.imageUrl
        ? `<img src="${escapeHtml(it.imageUrl)}" alt="${escapeHtml(it.name)}" width="120" height="90" loading="lazy" />`
        : "";
      return `<li class="seo-item">
        ${img}
        <div>
          <strong>${escapeHtml(it.name)}</strong>
          <p>${escapeHtml(it.description || "")}</p>
          <span>$${Number(it.price).toFixed(2)}</span>
        </div>
      </li>`;
    })
    .join("\n");

  const related = relatedTags
    .filter((t) => t.slug !== tag.slug)
    .slice(0, 8)
    .map(
      (t) =>
        `<a href="/tags/${escapeHtml(t.slug)}">${escapeHtml(t.name)}</a>`,
    )
    .join(" · ");

  return `
<main class="orderly-seo-ssr" data-seo-page="tag">
  <nav aria-label="Breadcrumb"><a href="/">Home</a> · <a href="/menu">Menu</a> · ${escapeHtml(tag.name)}</nav>
  <h1>${h1}</h1>
  <p>${escapeHtml(tag.description || "")}</p>
  <p><a href="/order">Order online</a> · <a href="/menu">Full menu</a></p>
  <h2>Order ${escapeHtml(tag.name)} from ${escapeHtml(seo.brandName)}</h2>
  <ul class="seo-items">${cards}</ul>
  ${related ? `<p>Related: ${related}</p>` : ""}
  <address>
    ${escapeHtml(seo.brandName)} ·
    ${escapeHtml([seo.address.street, seo.address.city, seo.address.state].filter(Boolean).join(", "))}
    ${seo.phone ? ` · <a href="tel:${escapeHtml(seo.phone)}">${escapeHtml(seo.phone)}</a>` : ""}
  </address>
</main>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "${escapeJson(tag.name)} menu",
  "itemListElement": [
${itemListJson}
  ]
}
</script>`;
}

export function renderPlaceSsrBody(opts: {
  seo: TenantSeo;
  place: SeoPlaceRow;
  featured: SeoPageItem[];
  cuisine: string;
}): string {
  const { seo, place, featured, cuisine } = opts;
  const h1 = `${escapeHtml(cuisine)} Delivery & Pickup in ${escapeHtml(place.name)} — ${escapeHtml(seo.brandName)}`;
  const deliveryLine = place.deliveryAvailable
    ? `Delivery available within our service area (~${place.distanceMiles} miles from the restaurant).`
    : `Pickup available — about ${place.distanceMiles} miles from ${escapeHtml(place.name)}.`;

  const cards = featured
    .map(
      (it) => `<li class="seo-item">
      <strong>${escapeHtml(it.name)}</strong> — $${Number(it.price).toFixed(2)}
      <p>${escapeHtml(it.description || "")}</p>
    </li>`,
    )
    .join("\n");

  return `
<main class="orderly-seo-ssr" data-seo-page="place">
  <nav aria-label="Breadcrumb"><a href="/">Home</a> · <a href="/menu">Menu</a> · ${escapeHtml(place.name)}</nav>
  <h1>${h1}</h1>
  <p>${escapeHtml(place.metaDescription || deliveryLine)}</p>
  <p>${escapeHtml(deliveryLine)}</p>
  <p><a href="/order">Order for pickup</a> · <a href="/menu">View menu</a></p>
  <h2>Popular from ${escapeHtml(seo.brandName)}</h2>
  <ul class="seo-items">${cards}</ul>
  <h2>Restaurant location</h2>
  <address>
    ${escapeHtml(seo.brandName)}<br/>
    ${escapeHtml([seo.address.street, seo.address.city, seo.address.state, seo.address.postcode].filter(Boolean).join(", "))}
    ${seo.phone ? `<br/><a href="tel:${escapeHtml(seo.phone)}">${escapeHtml(seo.phone)}</a>` : ""}
  </address>
  <p><a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(
    [seo.address.street, seo.address.city, seo.address.state].filter(Boolean).join(", "),
  )}">Map &amp; directions</a></p>
</main>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "${escapeJson(seo.brandName)}",
  "url": "${escapeJson(seo.canonical)}",
  "areaServed": {
    "@type": "City",
    "name": "${escapeJson(place.name)}"
  },
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "${escapeJson(seo.address.street || "")}",
    "addressLocality": "${escapeJson(seo.address.city || "")}",
    "addressRegion": "${escapeJson(seo.address.state || "")}",
    "postalCode": "${escapeJson(seo.address.postcode || "")}",
    "addressCountry": "US"
  }
}
</script>`;
}

const SSR_START = "<!-- ORDERLY:SSR_BODY -->";
const SSR_END = "<!-- /ORDERLY:SSR_BODY -->";

/** Inject crawlable body into #root so bots see real content before JS. */
export function injectSsrBody(html: string, body: string): string {
  const wrapped = `<div id="root">${SSR_START}${body}${SSR_END}</div>`;
  if (html.includes('<div id="root"></div>')) {
    return html.replace('<div id="root"></div>', wrapped);
  }
  if (html.includes("id=\"root\"")) {
    return html.replace(
      /<div id="root">[\s\S]*?<\/div>/,
      wrapped,
    );
  }
  return html;
}

export function injectPageHead(
  html: string,
  seo: TenantSeo,
  extraHead = "",
): string {
  let out = injectTenantHead(html, seo);
  if (extraHead) {
    out = out.replace("</head>", `${extraHead}\n</head>`);
  }
  return out;
}

export function robotsMetaNoindex(): string {
  return `    <meta name="robots" content="noindex, follow" />\n`;
}
