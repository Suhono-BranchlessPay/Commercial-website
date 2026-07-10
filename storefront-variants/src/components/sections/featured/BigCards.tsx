import { FeaturedData } from "@/types/config";

export function BigCards({ data }: { data: FeaturedData }) {
  const hasItems = data.items && data.items.length > 0;

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          {data.eyebrow && (
            <span className="text-accent font-semibold tracking-wider uppercase text-sm">
              {data.eyebrow}
            </span>
          )}
          <h2 className="text-3xl md:text-5xl font-bold font-serif text-foreground">
            {data.sectionTitle}
          </h2>
        </div>

        {!hasItems ? (
          <div className="w-full p-12 bg-card border border-border border-dashed rounded-2xl flex items-center justify-center text-center">
            <div className="space-y-2">
              <h3 className="text-xl font-medium text-foreground">Menu Coming Soon</h3>
              <p className="text-muted-foreground">We are curating our offerings.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            {data.items.map((item, i) => (
              <div key={i} className="group relative bg-card rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-md transition-shadow">
                <div className="aspect-[4/3] relative bg-muted overflow-hidden">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
                      No photo
                    </div>
                  )}
                </div>
                <div className="p-6 md:p-8 space-y-4 bg-card relative">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="text-2xl font-bold font-serif text-foreground">{item.name}</h3>
                    <span className="text-xl font-medium text-accent">{item.price}</span>
                  </div>
                  <p className="text-muted-foreground text-lg leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
