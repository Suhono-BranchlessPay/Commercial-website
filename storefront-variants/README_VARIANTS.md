# Orderly Storefront Component Library

This is the config-driven component library for Orderly. 

## Tenant Config Shape
```ts
export type TenantConfig = {
  theme: {
    colors: {
      primary: string; // HSL value, e.g. "0 100% 50%"
      accent: string;
      background: string;
      foreground: string;
      card: string;
      cardForeground: string;
      muted: string;
      mutedForeground: string;
    };
    fonts: {
      sans: string;
      serif: string;
    };
  };
  nav: {
    variant: 'NavSolid' | 'NavTransparent';
    data: {
      logo: string;
      menuLinks: { label: string; href: string }[];
      phone?: string;
      cartLabel: string;
    };
  };
  sections: Array<{
    id: string;
    type: 'hero' | 'featured' | 'story' | 'cta';
    variant: string;
    data: any;
  }>;
  footer: {
    variant: 'FooterDark' | 'FooterLight';
    data: {
      logo: string;
      menuLinks: { label: string; href: string }[];
      address?: string;
      phone?: string;
    };
  };
};
```

## Section Variants

### Hero
- **HeroSplit**: Text + CTA left, image right.
- **HeroFullImage**: Full-bleed photo with large overlay headline.
- **HeroMinimalCenter**: Solid color/gradient background, bold centered typography.
- **HeroCarouselCards**: Featured-menu card slider beside headline.

### Featured (Menu)
- **CardGrid**: Photo card grid.
- **ListCompact**: Compact list.
- **BigCards**: 1-2 column large cards.

### Story
- **StorySplit**: Photo + text side by side.
- **StoryCentered**: Centered text.

### CTA
- **BannerDark**: Dark background CTA.
- **BannerAccent**: Accent background CTA.
