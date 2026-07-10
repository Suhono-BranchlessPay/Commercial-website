import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

export type TenantTheme = {
  primary?: string;
  secondary?: string;
  accent?: string;
  brandName?: string;
  [key: string]: unknown;
};

export type TenantPublicConfig = {
  tenantId: string;
  name: string | null;
  theme: TenantTheme | null;
  logoUrl?: string | null;
  googleMapsApiKey: string | null;
  places: {
    country: string;
    locationBias: { lat: number; lng: number; radiusMeters: number };
  };
  delivery: {
    radiusMiles: number;
    restaurantLat: number;
    restaurantLng: number;
  };
  restaurant: {
    address: string | null;
    city: string | null;
    state: string | null;
    postcode: string | null;
    phone: string | null;
  } | null;
};

type TenantContextValue = {
  tenant: TenantPublicConfig | null;
  isLoading: boolean;
  brandName: string;
  logoSrc: string;
  phoneDisplay: string;
  phoneTel: string;
  addressLine: string;
  cityLine: string;
};

const TenantContext = createContext<TenantContextValue | null>(null);

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

function formatPhoneDisplay(e164: string | null | undefined): string {
  if (!e164) return "";
  const digits = e164.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return e164;
}

function applyTheme(theme: TenantTheme | null | undefined) {
  if (!theme || typeof document === "undefined") return;
  const root = document.documentElement;
  if (typeof theme.primary === "string" && theme.primary.trim()) {
    root.style.setProperty("--primary", theme.primary.trim());
  }
  if (typeof theme.secondary === "string" && theme.secondary.trim()) {
    root.style.setProperty("--secondary", theme.secondary.trim());
  }
  if (typeof theme.accent === "string" && theme.accent.trim()) {
    root.style.setProperty("--accent", theme.accent.trim());
  }
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["tenant-checkout-config"],
    queryFn: async (): Promise<TenantPublicConfig> => {
      const res = await fetch(`${API_BASE}/api/config/checkout`);
      if (!res.ok) throw new Error("Failed to load tenant config");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    applyTheme(data?.theme ?? null);
    const brand =
      (typeof data?.theme?.brandName === "string" && data.theme.brandName) ||
      data?.name ||
      "Order Online";
    if (brand) {
      document.title = brand;
    }
  }, [data]);

  const value = useMemo<TenantContextValue>(() => {
    const brandName =
      (typeof data?.theme?.brandName === "string" && data.theme.brandName) ||
      data?.name ||
      "Restaurant";
    const phone = data?.restaurant?.phone ?? null;
    const address = data?.restaurant?.address ?? null;
    const city = data?.restaurant?.city ?? null;
    const state = data?.restaurant?.state ?? null;
    const postcode = data?.restaurant?.postcode ?? null;
    const cityLine = [city, state, postcode].filter(Boolean).join(", ");

    return {
      tenant: data ?? null,
      isLoading,
      brandName,
      logoSrc:
        data?.logoUrl ||
        (typeof data?.theme?.logoUrl === "string"
          ? data.theme.logoUrl
          : null) ||
        "/samurai-logo.png",
      phoneDisplay: formatPhoneDisplay(phone) || "(765) 315-0073",
      phoneTel: phone || "+17653150073",
      addressLine: address || "789 E Morgan St",
      cityLine: cityLine || "Martinsville, IN 46151",
    };
  }, [data, isLoading]);

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return ctx;
}
