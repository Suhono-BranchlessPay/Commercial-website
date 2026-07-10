import { useEffect, useMemo } from "react";
import { useGetFeaturedItems } from "@workspace/api-client-react";
import { useTenant } from "@/lib/tenant";
import { useCart } from "@/lib/cart";
import { buildTenantPageConfig } from "@/lib/buildTenantPageConfig";
import { PageRenderer } from "@/variants/PageRenderer";
import {
  SectionMenuDownload,
  SectionReviews,
} from "@/components/storefront/HomeSections";
import type { SectionConfig } from "@/variants/types/config";
import type { SectionId } from "@/lib/storefrontConfig";

/**
 * Home: config-driven via Replit PageRenderer sections + tenant adapter.
 * Extra section types (reviews, menu_download) keep position from sectionOrder.
 */
export default function Home() {
  const {
    tenant,
    brandName,
    logoSrc,
    phoneDisplay,
    fullAddress,
    mapsSearchUrl,
    metaTitle,
    storefront,
  } = useTenant();
  const { cartCount, setIsCartOpen } = useCart();
  const { data: featuredItems } = useGetFeaturedItems();

  useEffect(() => {
    document.title = metaTitle;
  }, [metaTitle]);

  const pageConfig = useMemo(
    () =>
      buildTenantPageConfig({
        tenantId: tenant?.tenantId || "unknown",
        brandName,
        logoSrc,
        phoneDisplay,
        fullAddress,
        mapsSearchUrl,
        cartCount,
        storefront,
        theme: (tenant?.theme ?? null) as Record<string, unknown> | null,
        featuredItems: featuredItems as
          | {
              id: string;
              name: string;
              description?: string | null;
              price: number;
              imageUrl?: string | null;
              featured?: boolean;
            }[]
          | undefined,
      }),
    [
      tenant?.tenantId,
      tenant?.theme,
      brandName,
      logoSrc,
      phoneDisplay,
      fullAddress,
      mapsSearchUrl,
      cartCount,
      storefront,
      featuredItems,
    ],
  );

  const byId = useMemo(() => {
    const m = new Map<string, SectionConfig>();
    for (const s of pageConfig.sections) m.set(s.id, s);
    return m;
  }, [pageConfig.sections]);

  const order: SectionId[] = storefront.sectionOrder.length
    ? storefront.sectionOrder
    : (["hero", "featured", "story"] as SectionId[]);

  return (
    <div className="flex flex-col w-full">
      {order.map((id) => {
        if (id === "menu_download") {
          return <SectionMenuDownload key={id} config={storefront} />;
        }
        if (id === "reviews") {
          return (
            <SectionReviews
              key={id}
              config={storefront}
              mapsSearchUrl={mapsSearchUrl}
            />
          );
        }
        const section = byId.get(id);
        if (!section) return null;
        return (
          <PageRenderer
            key={id}
            config={{ ...pageConfig, sections: [section] }}
            onCartClick={() => setIsCartOpen(true)}
            includeChrome={false}
            applyThemeCss={false}
          />
        );
      })}
    </div>
  );
}
