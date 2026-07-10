import { HeroData } from "@/types/config";
import { Button } from "@/components/ui/button";

export function HeroSplit({ data }: { data: HeroData }) {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="container mx-auto px-4 md:px-6 py-16 md:py-24 lg:py-32 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-6 md:space-y-8 z-10 relative">
          <div className="space-y-4">
            {data.tagline && (
              <span className="inline-block px-3 py-1 bg-muted text-muted-foreground text-xs font-medium tracking-widest uppercase rounded-full">
                {data.tagline}
              </span>
            )}
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold font-serif leading-tight text-foreground">
              {data.headline}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
              {data.subheadline}
            </p>
          </div>
          {data.ctaButtons && data.ctaButtons.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {data.ctaButtons.map((btn, idx) => (
                <Button key={idx} size="lg" variant={idx === 0 ? "default" : "outline"} asChild className="rounded-full">
                  <a href={btn.href}>{btn.label}</a>
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 w-full aspect-[4/3] md:aspect-square relative rounded-2xl overflow-hidden shadow-2xl">
          {data.backgroundImage ? (
            <img src={data.backgroundImage} alt="Hero" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground border border-border">
              Image Needed
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
