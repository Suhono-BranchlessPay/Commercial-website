import { FooterConfig } from "@/variants/types/config";
import { PoweredByOrderly } from "@/components/PoweredByOrderly";

export function FooterLight({ data }: { data: FooterConfig["data"] }) {
  return (
    <footer className="bg-muted text-muted-foreground py-16">
      <div className="container mx-auto px-4 flex flex-col items-center text-center space-y-8">
        <a href="/" className="font-sans font-black text-3xl tracking-tighter text-foreground uppercase">
          {data.logo}
        </a>
        
        <nav className="flex flex-wrap justify-center gap-6 md:gap-8">
          {data.menuLinks.map((link, i) => (
            <a key={i} href={link.href} className="text-sm font-bold uppercase tracking-widest hover:text-foreground transition-colors">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
          {data.address && <span>{data.address}</span>}
          {data.phone && <span>{data.phone}</span>}
        </div>

        <div className="w-full max-w-md h-px bg-border my-4" />

        <PoweredByOrderly variant="light" />
      </div>
    </footer>
  );
}
