import { StoryData } from "@/variants/types/config";

export function StoryCentered({ data }: { data: StoryData }) {
  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-sans font-black text-foreground tracking-tight">
            {data.title}
          </h2>
          
          <div className="space-y-6 text-lg md:text-xl text-muted-foreground leading-relaxed font-medium">
            {data.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          
          {data.image && (
            <div className="mt-12 aspect-[21/9] w-full relative rounded-xl overflow-hidden shadow-2xl border border-border">
              <img src={data.image} alt={data.title} className="w-full h-full object-cover" />
            </div>
          )}

          {data.stats && data.stats.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12 mt-12 border-t border-border">
              {data.stats.map((stat, i) => (
                <div key={i} className="space-y-2">
                  <p className="text-4xl font-bold font-sans text-primary">{stat.value}</p>
                  <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
