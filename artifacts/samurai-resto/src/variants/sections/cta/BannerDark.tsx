import { CtaData } from "@/variants/types/config";
import { Button } from "@/components/ui/button";

export function BannerDark({ data }: { data: CtaData }) {
  return (
    <section className="py-20 bg-zinc-950 text-white">
      <div className="container mx-auto px-4 text-center max-w-3xl space-y-6">
        <h2 className="text-3xl md:text-5xl font-serif font-bold">
          {data.title}
        </h2>
        <p className="text-zinc-400 text-lg md:text-xl">
          {data.subtitle}
        </p>
        <div className="pt-6 flex flex-wrap justify-center gap-4">
          {data.buttons.map((btn, i) => (
            <Button key={i} size="lg" variant={i === 0 ? "default" : "secondary"} asChild className="rounded-full px-8">
              <a href={btn.href}>{btn.label}</a>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
