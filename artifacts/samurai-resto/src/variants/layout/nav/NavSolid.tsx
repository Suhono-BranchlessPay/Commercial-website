import { NavConfig } from "@/variants/types/config";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Menu } from "lucide-react";

export function NavSolid({
  data,
  onCartClick,
}: {
  data: NavConfig["data"];
  onCartClick?: () => void;
}) {
  const logoIsUrl = data.logo.startsWith("/") || data.logo.startsWith("http");
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {logoIsUrl ? (
            <a href="/">
              <img src={data.logo} alt="" className="h-12 w-auto" />
            </a>
          ) : (
            <a href="/" className="font-serif font-bold text-2xl tracking-tight text-foreground">
              {data.logo}
            </a>
          )}
          <nav className="hidden md:flex gap-6">
            {data.menuLinks.map((link, i) => (
              <a
                key={i}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {data.phone && (
            <span className="hidden lg:inline-flex text-sm font-medium text-muted-foreground border-r border-border pr-4">
              {data.phone}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex gap-2 rounded-full"
            type="button"
            onClick={onCartClick}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{data.cartLabel}</span>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" type="button" onClick={onCartClick}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
