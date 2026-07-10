import { HeroData } from "@/types/config";
import { Button } from "@/components/ui/button";

export function HeroFullImage({ data }: { data: HeroData }) {
  return (
    <section className="relative w-full h-[80vh] min-h-[500px] flex items-center justify-center bg-black">
      {data.backgroundImage ? (
        <div className="absolute inset-0 z-0">
          <img src={data.backgroundImage} alt="Hero background" className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-muted flex items-center justify-center text-muted-foreground border border-border">
          Image Needed
        </div>
      )}
      
      <div className="relative z-10 container mx-auto px-4 text-center text-white space-y-6 md:space-y-8">
        {data.tagline && (
          <span className="inline-block tracking-[0.2em] text-sm uppercase text-white/80 font-medium">
            {data.tagline}
          </span>
        )}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold font-sans tracking-tight max-w-4xl mx-auto drop-shadow-lg">
          {data.headline}
        </h1>
        <p className="text-lg md:text-2xl text-white/90 max-w-2xl mx-auto font-light drop-shadow-md">
          {data.subheadline}
        </p>
        
        {data.ctaButtons && data.ctaButtons.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            {data.ctaButtons.map((btn, idx) => (
              <Button key={idx} size="lg" variant={idx === 0 ? "default" : "secondary"} asChild className="rounded-none px-8 py-6 text-base font-bold uppercase tracking-wider">
                <a href={btn.href}>{btn.label}</a>
              </Button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
