import { FeaturedData } from "@/variants/types/config";

export function ListCompact({ data }: { data: FeaturedData }) {
  const hasItems = data.items && data.items.length > 0;

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-12 space-y-2 text-center md:text-left border-b border-border pb-6">
          {data.eyebrow && (
            <span className="text-muted-foreground font-medium uppercase text-sm tracking-widest">
              {data.eyebrow}
            </span>
          )}
          <h2 className="text-3xl md:text-4xl font-bold font-sans text-foreground">
            {data.sectionTitle}
          </h2>
        </div>

        {!hasItems ? (
          <div className="w-full py-12 text-center">
            <p className="text-muted-foreground">Menu currently unavailable.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {data.items.map((item, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 sm:gap-6 group">
                <div className="flex-1 space-y-1">
                  <div className="flex items-baseline gap-4">
                    <h3 className="text-xl font-semibold font-sans text-foreground group-hover:text-primary transition-colors">{item.name}</h3>
                    <div className="hidden sm:block flex-1 border-b border-dotted border-border relative -top-1 opacity-50" />
                  </div>
                  <p className="text-muted-foreground text-sm leading-snug">{item.description}</p>
                </div>
                <div className="font-medium text-lg text-foreground shrink-0">
                  {item.price}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
