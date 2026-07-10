import type { SectionConfig, TenantConfig } from "@/variants/types/config";
import { ThemeProvider } from "@/variants/theme/ThemeProvider";
import { NavSolid } from "@/variants/layout/nav/NavSolid";
import { NavTransparent } from "@/variants/layout/nav/NavTransparent";
import { FooterDark } from "@/variants/layout/footer/FooterDark";
import { FooterLight } from "@/variants/layout/footer/FooterLight";
import { HeroSplit } from "@/variants/sections/hero/HeroSplit";
import { HeroFullImage } from "@/variants/sections/hero/HeroFullImage";
import { HeroMinimalCenter } from "@/variants/sections/hero/HeroMinimalCenter";
import { HeroCarouselCards } from "@/variants/sections/hero/HeroCarouselCards";
import { CardGrid } from "@/variants/sections/featured/CardGrid";
import { ListCompact } from "@/variants/sections/featured/ListCompact";
import { BigCards } from "@/variants/sections/featured/BigCards";
import { StorySplit } from "@/variants/sections/story/StorySplit";
import { StoryCentered } from "@/variants/sections/story/StoryCentered";
import { BannerDark } from "@/variants/sections/cta/BannerDark";
import { BannerAccent } from "@/variants/sections/cta/BannerAccent";

export type PageRendererProps = {
  config: TenantConfig;
  onCartClick?: () => void;
  /** When false, only sections render (nav/footer owned by Layout). Default true. */
  includeChrome?: boolean;
  /** When false, skip injecting CSS vars (tenant.tsx already applied theme). Default false in app. */
  applyThemeCss?: boolean;
};

function renderSection(section: SectionConfig) {
  switch (section.type) {
    case "hero":
      if (section.variant === "HeroSplit") return <HeroSplit data={section.data} />;
      if (section.variant === "HeroFullImage") return <HeroFullImage data={section.data} />;
      if (section.variant === "HeroMinimalCenter")
        return <HeroMinimalCenter data={section.data} />;
      if (section.variant === "HeroCarouselCards")
        return <HeroCarouselCards data={section.data} />;
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
}

export function PageRenderer({
  config,
  onCartClick,
  includeChrome = true,
  applyThemeCss = false,
}: PageRendererProps) {
  const nav =
    config.nav.variant === "NavTransparent" ? (
      <NavTransparent data={config.nav.data} onCartClick={onCartClick} />
    ) : (
      <NavSolid data={config.nav.data} onCartClick={onCartClick} />
    );

  const footer =
    config.footer.variant === "FooterLight" ? (
      <FooterLight data={config.footer.data} />
    ) : (
      <FooterDark data={config.footer.data} />
    );

  const body = (
    <div className="flex flex-col min-h-screen">
      {includeChrome && nav}
      <main className="flex-1">
        {config.sections.map((section, idx) => (
          <div key={`${section.id}-${idx}`}>{renderSection(section)}</div>
        ))}
      </main>
      {includeChrome && footer}
    </div>
  );

  if (applyThemeCss) {
    return <ThemeProvider theme={config.theme}>{body}</ThemeProvider>;
  }
  return body;
}

export function StorefrontNav({
  config,
  onCartClick,
}: {
  config: TenantConfig;
  onCartClick?: () => void;
}) {
  return config.nav.variant === "NavTransparent" ? (
    <NavTransparent data={config.nav.data} onCartClick={onCartClick} />
  ) : (
    <NavSolid data={config.nav.data} onCartClick={onCartClick} />
  );
}

export function StorefrontFooter({ config }: { config: TenantConfig }) {
  return config.footer.variant === "FooterLight" ? (
    <FooterLight data={config.footer.data} />
  ) : (
    <FooterDark data={config.footer.data} />
  );
}
