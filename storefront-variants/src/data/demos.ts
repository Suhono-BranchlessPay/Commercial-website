import { TenantConfig } from "../types/config";
import { samuraiLinton } from "./samurai-linton";

const demoA: TenantConfig = {
  id: "demo-a",
  name: "Vintage Hibachi",
  theme: {
    colors: {
      primary: "350 40% 30%", // Maroon
      accent: "30 60% 50%",
      background: "40 20% 95%", // Cream
      foreground: "350 20% 15%",
      card: "40 30% 98%",
      cardForeground: "350 20% 15%",
      muted: "40 20% 85%",
      mutedForeground: "350 20% 40%",
      border: "40 20% 80%",
    },
    fonts: { sans: "'Playfair Display', serif", serif: "'Playfair Display', serif" },
  },
  nav: {
    variant: "NavSolid",
    data: {
      logo: "Sizzling Grill",
      menuLinks: [{ label: "Menu", href: "#" }, { label: "Story", href: "#" }],
      phone: "555-123-4567",
      cartLabel: "Order (0)",
    },
  },
  sections: [
    {
      id: "h1",
      type: "hero",
      variant: "HeroSplit",
      data: {
        headline: "Authentic Teppanyaki Experience",
        subheadline: "Where culinary art meets vintage tradition.",
        ctaButtons: [{ label: "Book a Table", href: "#" }],
        backgroundImage: "https://images.unsplash.com/photo-1555507036-ab1d4075cbf9?q=80&w=1000",
      },
    },
    {
      id: "f1",
      type: "featured",
      variant: "BigCards",
      data: {
        sectionTitle: "Signature Meats",
        eyebrow: "Prepared before your eyes",
        items: [
          { name: "Wagyu A5", description: "Premium cut with rich marbling", price: "$85", image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000" },
          { name: "Hibachi Scallops", description: "Jumbo scallops seared in garlic butter", price: "$42", image: "https://images.unsplash.com/photo-1626078298711-2eb2f6797cc6?q=80&w=1000" }
        ],
      },
    },
    {
      id: "s1",
      type: "story",
      variant: "StorySplit",
      data: {
        title: "Our Heritage",
        body: ["Founded in 1978, we brought the heat of authentic teppanyaki to the neighborhood. We believe in high quality meats, theatrical cooking, and unforgettable nights."],
        image: "https://images.unsplash.com/photo-1582450871972-ab5ca641643d?q=80&w=1000"
      },
    }
  ],
  footer: {
    variant: "FooterDark",
    data: { logo: "Sizzling Grill", menuLinks: [] },
  },
};

const demoB: TenantConfig = {
  id: "demo-b",
  name: "Modern Sushi",
  theme: {
    colors: {
      primary: "350 80% 50%", // Bold Red
      accent: "0 0% 100%",
      background: "0 0% 5%", // Black
      foreground: "0 0% 95%",
      card: "0 0% 10%",
      cardForeground: "0 0% 95%",
      muted: "0 0% 15%",
      mutedForeground: "0 0% 60%",
      border: "0 0% 20%",
    },
    fonts: { sans: "'Space Mono', sans-serif", serif: "'Inter', sans-serif" },
  },
  nav: {
    variant: "NavTransparent",
    data: {
      logo: "NEO TOKYO",
      menuLinks: [{ label: "Omakase", href: "#" }],
      cartLabel: "Cart",
    },
  },
  sections: [
    {
      id: "h2",
      type: "hero",
      variant: "HeroFullImage",
      data: {
        headline: "The Future of Sushi",
        subheadline: "Precision, starkness, and raw quality.",
        ctaButtons: [{ label: "Order Delivery", href: "#" }],
        backgroundImage: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=1000",
      },
    },
    {
      id: "f2",
      type: "featured",
      variant: "CardGrid",
      data: {
        sectionTitle: "Seasonal Catch",
        items: [
          { name: "Bluefin Otoro", description: "Fatty tuna belly", price: "$24", image: "https://images.unsplash.com/photo-1617196034183-421b4917c92d?q=80&w=1000" },
          { name: "Uni Nigiri", description: "Sea urchin from Hokkaido", price: "$32", image: "https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=1000" },
          { name: "Moriawase", description: "Chef's selection 12pc", price: "$65", image: "https://images.unsplash.com/photo-1583623025817-d180a2221d0a?q=80&w=1000" }
        ],
      },
    },
    {
      id: "s2",
      type: "story",
      variant: "StoryCentered",
      data: {
        title: "Edgy & Raw",
        body: ["No compromises. We fly our fish in daily from Toyosu Market.", "We keep it simple: sharp knives, cold fish, warm rice."],
      },
    }
  ],
  footer: {
    variant: "FooterLight",
    data: { logo: "NEO TOKYO", menuLinks: [] },
  },
};

const demoC: TenantConfig = {
  id: "demo-c",
  name: "Fast Casual Bowls",
  theme: {
    colors: {
      primary: "150 60% 40%", // Green
      accent: "45 90% 50%",
      background: "0 0% 100%", // White
      foreground: "0 0% 15%",
      card: "0 0% 95%",
      cardForeground: "0 0% 15%",
      muted: "0 0% 90%",
      mutedForeground: "0 0% 40%",
      border: "0 0% 90%",
    },
    fonts: { sans: "'Plus Jakarta Sans', sans-serif", serif: "'Plus Jakarta Sans', sans-serif" },
  },
  nav: {
    variant: "NavSolid",
    data: {
      logo: "FreshBowl",
      menuLinks: [{ label: "Locations", href: "#" }],
      cartLabel: "Bag",
    },
  },
  sections: [
    {
      id: "h3",
      type: "hero",
      variant: "HeroMinimalCenter",
      data: {
        headline: "Real Food, Real Fast.",
        subheadline: "Customizable grain bowls for people on the move.",
        ctaButtons: [{ label: "Start Order", href: "#" }],
      },
    },
    {
      id: "f3",
      type: "featured",
      variant: "ListCompact",
      data: {
        sectionTitle: "Popular Bowls",
        items: [
          { name: "Harvest Bowl", description: "Quinoa, sweet potato, kale, balsamic vinaigrette", price: "$12.50" },
          { name: "Spicy Thai", description: "Brown rice, blackened chicken, spicy peanut dressing", price: "$13.50" }
        ],
      },
    },
  ],
  footer: {
    variant: "FooterDark",
    data: { logo: "FreshBowl", menuLinks: [] },
  },
};

export const demos = [demoA, demoB, demoC, samuraiLinton];
