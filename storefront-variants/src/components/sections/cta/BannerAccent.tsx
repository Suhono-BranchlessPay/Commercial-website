import { CtaData } from "@/types/config";
import { Button } from "@/components/ui/button";

export function BannerAccent({ data }: { data: CtaData }) {
  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-2 max-w-xl">
          <h2 className="text-2xl md:text-4xl font-sans font-bold tracking-tight">
            {data.title}
          </h2>
          <p className="text-primary-foreground/80 text-lg font-medium">
            {data.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 shrink-0">
          {data.buttons.map((btn, i) => (
            <Button key={i} size="lg" variant="secondary" asChild className="rounded-xl px-8 shadow-sm">
              <a href={btn.href}>{btn.label}</a>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
