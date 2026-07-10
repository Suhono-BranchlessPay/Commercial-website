import { NavConfig } from "@/variants/types/config";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export function NavTransparent({
  data,
  onCartClick,
}: {
  data: NavConfig["data"];
  onCartClick?: () => void;
}) {
  const logoIsUrl = data.logo.startsWith("/") || data.logo.startsWith("http");
  return (
    <header className="absolute top-0 w-full z-50 bg-transparent text-white border-b border-white/10">
      <div className="container mx-auto px-4 h-24 flex items-center justify-between">
        {logoIsUrl ? (
          <a href="/">
            <img src={data.logo} alt="" className="h-12 w-auto brightness-0 invert" />
          </a>
        ) : (
          <a
            href="/"
            className="font-sans font-black text-2xl tracking-tighter uppercase drop-shadow-md"
          >
            {data.logo}
          </a>
        )}

        <nav className="hidden md:flex items-center gap-8">
          {data.menuLinks.map((link, i) => (
            <a
              key={i}
              href={link.href}
              className="text-sm font-bold uppercase tracking-widest text-white/90 hover:text-white drop-shadow-sm"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={onCartClick}
            className="hidden sm:flex bg-white text-black hover:bg-white/90 rounded-none px-6 font-bold uppercase text-xs tracking-wider"
          >
            {data.cartLabel}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={onCartClick}
            className="md:hidden text-white hover:bg-white/10"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </header>
  );
}
