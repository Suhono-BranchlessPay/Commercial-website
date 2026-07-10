import { HeroData } from "@/types/config";
import { Button } from "@/components/ui/button";

export function HeroCarouselCards({ data }: { data: HeroData }) {
  return (
    <section className="relative bg-background overflow-hidden py-16 md:py-24">
      <div className="container mx-auto px-4 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        <div className="flex-1 space-y-6 md:space-y-8 z-10">
          {data.tagline && (
            <span className="inline-block px-4 py-1.5 bg-accent/10 text-accent text-sm font-bold tracking-widest uppercase rounded-md">
              {data.tagline}
            </span>
          )}
          <h1 className="text-4xl md:text-6xl font-bold font-serif leading-[1.1] text-foreground">
            {data.headline}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            {data.subheadline}
          </p>
          {data.ctaButtons && data.ctaButtons.length > 0 && (
            <div className="flex flex-wrap gap-4 pt-4">
              {data.ctaButtons.map((btn, idx) => (
                <Button key={idx} size="lg" variant={idx === 0 ? "default" : "outline"} asChild className="rounded-xl px-6">
                  <a href={btn.href}>{btn.label}</a>
                </Button>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex-1 w-full relative">
          <div className="w-full relative h-[400px] md:h-[500px]">
             {/* Mock Carousel effect */}
             <div className="absolute top-0 right-0 w-[80%] h-full bg-card rounded-2xl shadow-xl border border-border z-20 flex flex-col overflow-hidden rotate-2 transform origin-bottom-right transition-transform hover:rotate-0">
                <div className="h-2/3 bg-muted w-full">
                  {data.backgroundImage ? (
                    <img src={data.backgroundImage} alt="Featured" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">Image Needed</div>
                  )}
                </div>
                <div className="p-6 bg-card flex-1">
                  <div className="w-1/3 h-4 bg-muted rounded mb-2" />
                  <div className="w-2/3 h-4 bg-muted rounded" />
                </div>
             </div>
             
             <div className="absolute top-4 right-4 w-[80%] h-full bg-muted/50 rounded-2xl border border-border/50 z-10 -rotate-2 transform origin-bottom-right" />
             <div className="absolute top-8 right-8 w-[80%] h-full bg-muted/20 rounded-2xl border border-border/20 z-0 -rotate-6 transform origin-bottom-right" />
          </div>
        </div>
      </div>
    </section>
  );
}
