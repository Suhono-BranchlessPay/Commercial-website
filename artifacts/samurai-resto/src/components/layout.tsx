import { useLocation } from "wouter";
import { useMemo } from "react";
import { useCart } from "@/lib/cart";
import { useTenant } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useGetFeaturedItems } from "@workspace/api-client-react";
import { buildTenantPageConfig } from "@/lib/buildTenantPageConfig";
import { StorefrontFooter, StorefrontNav } from "@/variants/PageRenderer";

export function CartDrawer() {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeItem, cartTotal } =
    useCart();
  const [, setLocation] = useLocation();

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col bg-background border-l-border">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-primary">Your Order</SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? "Your cart is empty."
              : "Review your items before checkout."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.menuItem.id} className="flex gap-4 items-start">
              <div className="flex-1">
                <h4 className="font-medium text-foreground">{item.menuItem.name}</h4>
                <p className="text-primary font-semibold">
                  ${item.menuItem.price.toFixed(2)}
                </p>
                {item.specialInstructions && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    Note: {item.specialInstructions}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center border border-border rounded-md">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none"
                      onClick={() =>
                        updateQuantity(item.menuItem.id, item.quantity - 1)
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-none"
                      onClick={() =>
                        updateQuantity(item.menuItem.id, item.quantity + 1)
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item.menuItem.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="pt-4 border-t border-border mt-auto">
            <div className="flex justify-between font-serif text-lg mb-6">
              <span>Subtotal</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <Button
              className="w-full text-lg h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => {
                setIsCartOpen(false);
                setLocation("/order");
              }}
            >
              Checkout
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { cartCount, cartTotal, setIsCartOpen } = useCart();
  const {
    tenant,
    brandName,
    logoSrc,
    phoneDisplay,
    fullAddress,
    mapsSearchUrl,
    storefront,
  } = useTenant();
  const { data: featuredItems } = useGetFeaturedItems();

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

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <StorefrontNav config={pageConfig} onCartClick={() => setIsCartOpen(true)} />

      <CartDrawer />

      <main className="flex-1">{children}</main>

      {cartCount > 0 && (
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-primary text-white px-5 py-3.5 rounded-full shadow-2xl shadow-primary/40 hover:bg-primary/90 active:scale-95 transition-all duration-200"
        >
          <div className="relative">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-primary text-[10px] font-bold">
              {cartCount}
            </span>
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="text-xs text-white/70 font-medium">
              {cartCount} item{cartCount !== 1 ? "s" : ""}
            </span>
            <span className="text-sm font-bold">${cartTotal.toFixed(2)}</span>
          </div>
          <span className="text-sm font-bold text-white/90 ml-1 border-l border-white/30 pl-3">
            Checkout →
          </span>
        </button>
      )}

      <StorefrontFooter config={pageConfig} />
    </div>
  );
}
