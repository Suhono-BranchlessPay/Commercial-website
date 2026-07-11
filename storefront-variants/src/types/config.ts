export type ThemeConfig = {
  colors: {
    primary: string;
    accent: string;
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    muted: string;
    mutedForeground: string;
    border: string;
  };
  fonts: {
    sans: string;
    serif: string;
  };
};

export type CtaButton = {
  label: string;
  href: string;
};

export type MenuItem = {
  name: string;
  description: string;
  price: string;
  image?: string;
};

export type HeroData = {
  headline: string;
  subheadline: string;
  tagline?: string;
  ctaButtons?: CtaButton[];
  backgroundImage?: string;
  colors?: any;
};

export type FeaturedData = {
  sectionTitle: string;
  eyebrow?: string;
  items: MenuItem[];
};

export type StoryData = {
  title: string;
  body: string[];
  stats?: { label: string; value: string }[];
  image?: string;
};

export type CtaData = {
  title: string;
  subtitle: string;
  buttons: CtaButton[];
};

export type SectionConfig =
  | { id: string; type: "hero"; variant: "HeroSplit" | "HeroFullImage" | "HeroMinimalCenter" | "HeroCarouselCards"; data: HeroData }
  | { id: string; type: "featured"; variant: "CardGrid" | "ListCompact" | "BigCards"; data: FeaturedData }
  | { id: string; type: "story"; variant: "StorySplit" | "StoryCentered"; data: StoryData }
  | { id: string; type: "cta"; variant: "BannerDark" | "BannerAccent"; data: CtaData };

export type NavConfig = {
  variant: "NavSolid" | "NavTransparent";
  data: {
    logo: string;
    menuLinks: { label: string; href: string }[];
    phone?: string;
    address?: string;
    mapsUrl?: string;
    cartLabel: string;
  };
};

export type FooterConfig = {
  variant: "FooterDark" | "FooterLight";
  data: {
    logo: string;
    menuLinks: { label: string; href: string }[];
    phone?: string;
    address?: string;
    mapsUrl?: string;
    cartLabel?: string;
  };
};

export type TenantMeta = {
  brand?: string;
  location?: { city: string; state: string; address?: string; phone?: string; hours?: string };
  orderTypes?: ("pickup" | "delivery")[];
  notes?: string;
};

export type TenantConfig = {
  id: string;
  name: string;
  meta?: TenantMeta;
  theme: ThemeConfig;
  nav: NavConfig;
  sections: SectionConfig[];
  footer: FooterConfig;
};
