import { StoryData } from "@/variants/types/config";

export function StorySplit({ data }: { data: StoryData }) {
  return (
    <section className="py-20 md:py-32 bg-card overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
          <div className="flex-1 w-full relative">
            <div className="aspect-[3/4] relative rounded-t-full overflow-hidden shadow-xl border-[8px] border-background">
              {data.image ? (
                <img src={data.image} alt={data.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                  Photo Needed
                </div>
              )}
            </div>
            {/* Decorative background shape */}
            <div className="absolute top-10 -left-10 bottom-10 -right-10 bg-primary/5 rounded-full z-[-1]" />
          </div>
          
          <div className="flex-1 space-y-8 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground relative inline-block">
              {data.title}
              <span className="absolute -bottom-3 left-0 w-24 h-1 bg-accent" />
            </h2>
            
            <div className="space-y-6 pt-4">
              {data.body.map((p, i) => (
                <p key={i} className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                  {p}
                </p>
              ))}
            </div>

            {data.stats && data.stats.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 pt-8 border-t border-border mt-8">
                {data.stats.map((stat, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-3xl font-bold font-serif text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
