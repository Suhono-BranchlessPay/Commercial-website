import { HeroData } from "@/variants/types/config";
import { Button } from "@/components/ui/button";

export function HeroMinimalCenter({ data }: { data: HeroData }) {
  return (
    <section className="relative w-full py-24 md:py-32 lg:py-48 bg-background border-b border-border">
      <div className="container mx-auto px-4 text-center max-w-4xl space-y-8">
        {data.tagline && (
          <p className="text-accent font-bold tracking-widest uppercase text-sm">
            {data.tagline}
          </p>
        )}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-sans text-foreground leading-[1.1] tracking-tighter">
          {data.headline}
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-2xl mx-auto">
          {data.subheadline}
        </p>
        
        {data.ctaButtons && data.ctaButtons.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 pt-8">
            {data.ctaButtons.map((btn, idx) => (
              <Button key={idx} size="lg" variant={idx === 0 ? "default" : "outline"} asChild className="rounded-full px-8 h-14 text-lg font-semibold shadow-sm">
                <a href={btn.href}>{btn.label}</a>
              </Button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
