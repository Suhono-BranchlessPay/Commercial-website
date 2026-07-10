import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuItemCard, IMAGE_MAP } from "@/components/MenuItemCard";
import { Download, FileText, MapPin } from "lucide-react";
import { useState } from "react";
import type { MenuItem } from "@workspace/api-client-react";
import type { StorefrontConfig } from "@/lib/storefrontConfig";

export function SectionFeatured({
  config,
  items,
  isLoading,
}: {
  config: StorefrontConfig;
  items: MenuItem[] | undefined;
  isLoading: boolean;
}) {
  const photoSet = new Set(Object.keys(IMAGE_MAP));
  const list = config.useSharedFoodPhotos
    ? (items?.filter((i) => photoSet.has(i.name) || i.imageUrl) ?? [])
    : (items?.filter((i) => Boolean(i.imageUrl)) ?? items ?? []);

  const wide = config.featuredVariant === "featured-wide";

  return (
    <section className="py-24 bg-background border-t-4 border-primary">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary mb-3">
            {config.featuredEyebrow}
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-foreground">
            {config.featuredTitle}
          </h2>
          <div className="w-20 h-0.5 bg-secondary mx-auto mt-5" />
        </div>

        {isLoading ? (
          <div
            className={`grid gap-6 ${wide ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"}`}
          >
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="w-full aspect-[4/3] rounded-xl" />
            ))}
          </div>
        ) : list.length > 0 ? (
          <div
            className={`grid gap-6 ${wide ? "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"}`}
          >
            {list.slice(0, wide ? 4 : 4).map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl max-w-xl mx-auto">
            <p className="font-serif text-xl text-foreground mb-2">Menu coming soon</p>
            <p className="text-muted-foreground text-sm">
              Featured dishes will appear here once this restaurant’s catalog is connected.
            </p>
          </div>
        )}

        <div className="mt-14 text-center">
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-primary text-primary hover:bg-primary hover:text-white"
          >
            <Link href="/menu">See Full Menu</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function SectionMenuDownload({ config }: { config: StorefrontConfig }) {
  const [preview, setPreview] = useState<StorefrontConfig["brochures"][0] | null>(
    null,
  );
  if (!config.brochures.length) return null;

  return (
    <>
      <section className="py-20 bg-card border-t border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary mb-3">
              Save For Later
            </p>
            <h2 className="font-serif text-4xl md:text-5xl text-foreground">
              Download Our Menus
            </h2>
            <div className="w-20 h-0.5 bg-secondary mx-auto mt-5" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {config.brochures.map((brochure) => (
              <div
                key={brochure.title}
                className="bg-background border border-border rounded-2xl overflow-hidden flex flex-col hover:border-primary/50 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setPreview(brochure)}
                  className="relative aspect-[16/9] overflow-hidden group w-full"
                >
                  <img
                    src={brochure.src}
                    alt={brochure.title}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-sm font-semibold bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" /> View
                    </span>
                  </div>
                </button>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="font-serif text-xl font-semibold">{brochure.title}</h3>
                  <p className="text-xs text-primary font-semibold uppercase tracking-wider mt-1">
                    {brochure.subtitle}
                  </p>
                  <p className="text-muted-foreground text-sm flex-1 mt-3 mb-5">
                    {brochure.description}
                  </p>
                  <a
                    href={brochure.src}
                    download={brochure.filename}
                    className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-white font-semibold text-sm py-3 rounded-lg"
                  >
                    <Download className="h-4 w-4" /> Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {preview && (
        <div
          className="fixed inset-0 z-[100] bg-black/96 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between mb-3 text-white">
              <h3 className="font-serif text-xl">{preview.title}</h3>
              <button type="button" onClick={() => setPreview(null)}>
                ✕ Close
              </button>
            </div>
            <img
              src={preview.src}
              alt={preview.title}
              className="w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}

export function SectionReviews({
  config,
  mapsSearchUrl,
}: {
  config: StorefrontConfig;
  mapsSearchUrl: string;
}) {
  if (!config.reviews.length) return null;
  return (
    <section className="py-24 bg-card border-t border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary mb-3">
            Guest Reviews
          </p>
          <h2 className="font-serif text-4xl md:text-5xl text-foreground">
            What Our Guests Are Saying
          </h2>
          <div className="w-20 h-0.5 bg-secondary mx-auto mt-5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {config.reviews.map((review) => (
            <div
              key={review.name + review.text.slice(0, 12)}
              className="bg-background border border-border rounded-2xl p-6 flex flex-col gap-4"
            >
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className="text-yellow-400 text-sm">
                    ★
                  </span>
                ))}
                <span className="ml-1 text-xs text-muted-foreground uppercase">
                  {review.source}
                </span>
              </div>
              <p className="text-foreground/80 text-sm leading-relaxed flex-1">
                &ldquo;{review.text}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                  {review.initials}
                </div>
                <span className="font-semibold text-sm">{review.name}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <a
            href={mapsSearchUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary text-sm underline underline-offset-4"
          >
            Read more on Google Maps →
          </a>
        </div>
      </div>
    </section>
  );
}

export function SectionStory({
  config,
  brandName,
}: {
  config: StorefrontConfig;
  brandName: string;
}) {
  return (
    <section className="py-24 bg-background border-t border-border overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="order-2 md:order-1 flex justify-center">
            <div className="relative w-full max-w-sm mx-auto">
              <div className="absolute -inset-3 rounded-3xl bg-primary/20 blur-2xl" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/60 aspect-[4/5] bg-muted">
                {config.storyImage ? (
                  <img
                    src={config.storyImage}
                    alt={config.storyImageLabel || brandName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center px-6 text-center bg-gradient-to-br from-primary/15 to-secondary/10">
                    <p className="font-serif text-3xl text-primary/30 uppercase tracking-widest">
                      {brandName.split(/\s+/)[0]}
                    </p>
                    <p className="text-xs text-muted-foreground mt-4">
                      Restaurant photo needed
                    </p>
                  </div>
                )}
                {(config.storyImageLabel || config.storyImageCaption) && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                    {config.storyImageLabel && (
                      <p className="text-white font-semibold text-sm">
                        {config.storyImageLabel}
                      </p>
                    )}
                    {config.storyImageCaption && (
                      <p className="text-white/60 text-xs mt-0.5">
                        {config.storyImageCaption}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2 lg:pl-4">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary mb-3">
              {config.storyEyebrow}
            </p>
            <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-6 leading-tight">
              {config.storyTitle}
            </h2>
            {config.storyBody.map((p) => (
              <p
                key={p.slice(0, 24)}
                className="text-muted-foreground mb-5 leading-relaxed"
              >
                {p}
              </p>
            ))}
            {config.stats.length > 0 && (
              <div className="flex items-center gap-8 pt-6 border-t border-border flex-wrap">
                {config.stats.map((s, idx) => (
                  <div
                    key={s.label}
                    className={`text-center ${idx > 0 ? "border-l border-border pl-8" : ""}`}
                  >
                    <span className="block font-serif text-3xl text-primary mb-1">
                      {s.value}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      {s.label}
                    </span>
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

export function SectionCateringCta({ brandName }: { brandName: string }) {
  return (
    <section className="py-20 bg-accent text-accent-foreground border-t border-primary/40">
      <div className="container mx-auto px-4 text-center max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary mb-3">
          Groups &amp; Events
        </p>
        <h2 className="font-serif text-4xl md:text-5xl mb-4">
          Catering from {brandName}
        </h2>
        <p className="text-accent-foreground/70 mb-8">
          Party trays and office lunch — call ahead or order online for pickup.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white">
            <Link href="/catering">View Catering</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-accent-foreground/30 text-accent-foreground hover:bg-accent-foreground/10"
          >
            <Link href="/order">Order Online</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function SectionLocationCta({
  fullAddress,
  mapsSearchUrl,
  phoneDisplay,
  phoneTel,
}: {
  fullAddress: string;
  mapsSearchUrl: string;
  phoneDisplay: string;
  phoneTel: string;
}) {
  return (
    <section className="py-16 bg-card border-t border-border">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8 max-w-4xl">
        <div className="text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary mb-2">
            Visit Us
          </p>
          <h2 className="font-serif text-3xl text-foreground mb-2">Find the restaurant</h2>
          <p className="text-muted-foreground">{fullAddress || "Address coming soon"}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild variant="outline" className="border-primary text-primary">
            <a href={mapsSearchUrl} target="_blank" rel="noreferrer">
              <MapPin className="h-4 w-4 mr-2" />
              Maps
            </a>
          </Button>
          {phoneTel && (
            <Button asChild className="bg-primary text-white">
              <a href={`tel:${phoneTel}`}>Call {phoneDisplay || phoneTel}</a>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
