import { useGetFeaturedItems } from "@workspace/api-client-react";
import { useEffect } from "react";
import { useTenant } from "@/lib/tenant";
import { StorefrontHero } from "@/components/storefront/HeroVariants";
import {
  SectionCateringCta,
  SectionFeatured,
  SectionLocationCta,
  SectionMenuDownload,
  SectionReviews,
  SectionStory,
} from "@/components/storefront/HomeSections";
import type { SectionId } from "@/lib/storefrontConfig";

export default function Home() {
  const {
    brandName,
    addressLine,
    cityLine,
    mapsSearchUrl,
    metaTitle,
    fullAddress,
    phoneDisplay,
    phoneTel,
    storefront,
  } = useTenant();

  useEffect(() => {
    document.title = metaTitle;
  }, [metaTitle]);

  const { data: featuredItems, isLoading } = useGetFeaturedItems();
  const locationLabel = [cityLine.split(",")[0], addressLine]
    .filter(Boolean)
    .join(" · ");

  const renderSection = (id: SectionId) => {
    switch (id) {
      case "hero":
        return (
          <StorefrontHero
            key="hero"
            config={storefront}
            brandName={brandName}
            locationLabel={locationLabel}
            mapsSearchUrl={mapsSearchUrl}
          />
        );
      case "menu_download":
        return <SectionMenuDownload key="menu_download" config={storefront} />;
      case "featured":
        return (
          <SectionFeatured
            key="featured"
            config={storefront}
            items={featuredItems}
            isLoading={isLoading}
          />
        );
      case "reviews":
        return (
          <SectionReviews
            key="reviews"
            config={storefront}
            mapsSearchUrl={mapsSearchUrl}
          />
        );
      case "story":
        return (
          <SectionStory key="story" config={storefront} brandName={brandName} />
        );
      case "catering_cta":
        return <SectionCateringCta key="catering_cta" brandName={brandName} />;
      case "location_cta":
        return (
          <SectionLocationCta
            key="location_cta"
            fullAddress={fullAddress}
            mapsSearchUrl={mapsSearchUrl}
            phoneDisplay={phoneDisplay}
            phoneTel={phoneTel}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col w-full">
      {storefront.sectionOrder.map((id) => renderSection(id))}
    </div>
  );
}
