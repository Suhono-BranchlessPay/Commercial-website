import { TenantConfig } from "@/types/config";
import { ThemeProvider } from "./theme/ThemeProvider";
import { NavSolid } from "./layout/nav/NavSolid";
import { NavTransparent } from "./layout/nav/NavTransparent";
import { FooterDark } from "./layout/footer/FooterDark";
import { FooterLight } from "./layout/footer/FooterLight";
import { HeroSplit } from "./sections/hero/HeroSplit";
import { HeroFullImage } from "./sections/hero/HeroFullImage";
import { HeroMinimalCenter } from "./sections/hero/HeroMinimalCenter";
import { HeroCarouselCards } from "./sections/hero/HeroCarouselCards";
import { CardGrid } from "./sections/featured/CardGrid";
import { ListCompact } from "./sections/featured/ListCompact";
import { BigCards } from "./sections/featured/BigCards";
import { StorySplit } from "./sections/story/StorySplit";
import { StoryCentered } from "./sections/story/StoryCentered";
import { BannerDark } from "./sections/cta/BannerDark";
import { BannerAccent } from "./sections/cta/BannerAccent";

export function PageRenderer({ config }: { config: TenantConfig }) {
  const renderNav = () => {
    switch (config.nav.variant) {
      case "NavSolid": return <NavSolid data={config.nav.data} />;
      case "NavTransparent": return <NavTransparent data={config.nav.data} />;
      default: return null;
    }
  };

  const renderFooter = () => {
    switch (config.footer.variant) {
      case "FooterDark": return <FooterDark data={config.footer.data} />;
      case "FooterLight": return <FooterLight data={config.footer.data} />;
      default: return null;
    }
  };

  const renderSection = (section: any) => {
    switch (section.type) {
      case "hero":
        if (section.variant === "HeroSplit") return <HeroSplit data={section.data} />;
        if (section.variant === "HeroFullImage") return <HeroFullImage data={section.data} />;
        if (section.variant === "HeroMinimalCenter") return <HeroMinimalCenter data={section.data} />;
        if (section.variant === "HeroCarouselCards") return <HeroCarouselCards data={section.data} />;
        break;
      case "featured":
        if (section.variant === "CardGrid") return <CardGrid data={section.data} />;
        if (section.variant === "ListCompact") return <ListCompact data={section.data} />;
        if (section.variant === "BigCards") return <BigCards data={section.data} />;
        break;
      case "story":
        if (section.variant === "StorySplit") return <StorySplit data={section.data} />;
        if (section.variant === "StoryCentered") return <StoryCentered data={section.data} />;
        break;
      case "cta":
        if (section.variant === "BannerDark") return <BannerDark data={section.data} />;
        if (section.variant === "BannerAccent") return <BannerAccent data={section.data} />;
        break;
    }
    return null;
  };

  return (
    <ThemeProvider theme={config.theme}>
      <div className="flex flex-col min-h-screen">
        {renderNav()}
        <main className="flex-1">
          {config.sections.map((section, idx) => (
            <div key={`${section.id}-${idx}`}>
              {renderSection(section)}
            </div>
          ))}
        </main>
        {renderFooter()}
      </div>
    </ThemeProvider>
  );
}
