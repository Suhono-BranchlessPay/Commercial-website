import { FeaturedData } from "@/types/config";

export function CardGrid({ data }: { data: FeaturedData }) {
  const hasItems = data.items && data.items.length > 0;

  return (
    <section className="py-16 md:py-24 bg-card">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="max-w-2xl space-y-2">
            {data.eyebrow && (
              <span className="text-accent font-bold tracking-widest uppercase text-xs">
                {data.eyebrow}
              </span>
            )}
            <h2 className="text-3xl md:text-5xl font-bold font-sans text-foreground tracking-tight">
              {data.sectionTitle}
            </h2>
          </div>
        </div>

        {!hasItems ? (
          <div className="w-full p-16 bg-background border border-border border-dashed rounded-xl flex items-center justify-center text-center">
            <p className="text-muted-foreground font-medium">Menu updating soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {data.items.map((item, i) => (
              <div key={i} className="group bg-background rounded-xl overflow-hidden shadow-sm border border-border flex flex-col hover:border-primary transition-colors">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted text-sm">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <h3 className="text-xl font-bold font-sans text-foreground leading-tight">{item.name}</h3>
                    <span className="font-mono font-medium text-foreground bg-muted px-2 py-1 rounded text-sm">{item.price}</span>
                  </div>
                  <p className="text-muted-foreground text-sm flex-1">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
