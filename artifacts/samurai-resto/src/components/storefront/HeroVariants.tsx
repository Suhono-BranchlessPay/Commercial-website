import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { StorefrontConfig } from "@/lib/storefrontConfig";

type HeroProps = {
  config: StorefrontConfig;
  brandName: string;
  locationLabel: string;
  mapsSearchUrl: string;
};

function CtaRow({
  ctas,
  light,
}: {
  ctas: StorefrontConfig["heroCtas"];
  light?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full sm:w-auto flex-wrap justify-center lg:justify-start">
      {ctas.map((cta) =>
        cta.style === "outline" ? (
          <Button
            key={cta.label}
            asChild
            size="lg"
            variant="outline"
            className={
              light
                ? "text-base px-8 border-white/30 text-white hover:bg-white/10 min-w-[160px]"
                : "text-base px-8 border-primary text-primary hover:bg-primary hover:text-white min-w-[160px]"
            }
          >
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        ) : (
          <Button
            key={cta.label}
            asChild
            size="lg"
            className="text-base px-8 bg-primary hover:bg-primary/90 text-white min-w-[160px]"
          >
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        ),
      )}
    </div>
  );
}

function RatingPill({
  ratingValue,
  reviewCount,
  mapsSearchUrl,
}: {
  ratingValue: string | null;
  reviewCount: string | null;
  mapsSearchUrl: string;
}) {
  if (!ratingValue) return null;
  return (
    <a
      href={mapsSearchUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 mb-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 hover:bg-white/15 transition-colors"
    >
      <span className="text-yellow-400 text-base">★★★★★</span>
      <span className="text-white font-semibold text-sm">{ratingValue}</span>
      {reviewCount && (
        <span className="text-white/60 text-sm">
          · {Number(reviewCount).toLocaleString()}+ reviews
        </span>
      )}
    </a>
  );
}

function Headline({
  lines,
  className = "",
  accentIndex = 1,
}: {
  lines: string[];
  className?: string;
  accentIndex?: number;
}) {
  return (
    <h1 className={`font-serif font-bold tracking-tight leading-none ${className}`}>
      {lines.map((line, i) => (
        <span
          key={line}
          className={`block text-4xl md:text-6xl lg:text-7xl ${i > 0 ? "mt-1" : ""} ${
            i === accentIndex ? "text-primary" : ""
          }`}
        >
          {line}
        </span>
      ))}
    </h1>
  );
}

/** Full-bleed photo + centered headline (Samurai default). */
export function HeroFullimageBold(props: HeroProps) {
  const { config, locationLabel, mapsSearchUrl } = props;
  const slides = config.heroImages;
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrent((i) => (i + 1) % slides.length);
        setVisible(true);
      }, 400);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const slide = slides[current];

  return (
    <section className="relative min-h-[88vh] flex items-center justify-center overflow-hidden bg-black">
      {slide ? (
        <div
          className="absolute inset-0 z-0"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s ease" }}
        >
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/45 to-black/25" />
          <img
            src={slide.src}
            alt={slide.alt}
            className={`w-full h-full object-cover ${slide.pos || "object-center"}`}
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-primary/40" />
      )}

      <div className="container mx-auto px-4 z-20 flex flex-col items-center text-center mt-12">
        <RatingPill
          ratingValue={config.ratingValue}
          reviewCount={config.reviewCount}
          mapsSearchUrl={mapsSearchUrl}
        />
        <Headline lines={config.heroHeadline} className="text-white" />
        <p className="mt-8 text-white/70 text-base md:text-lg max-w-lg">
          {config.heroSubheadline}
        </p>
        <CtaRow ctas={config.heroCtas} light />
        {slides.length > 1 && (
          <div className="flex gap-2 mt-10">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setVisible(false);
                  setTimeout(() => {
                    setCurrent(idx);
                    setVisible(true);
                  }, 300);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  idx === current ? "w-8 bg-primary" : "w-4 bg-white/30"
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
        {locationLabel && (
          <p className="mt-4 text-white/40 text-xs">{locationLabel}</p>
        )}
      </div>
    </section>
  );
}

/** Split: copy left, image right — good for Kirin vintage grill. */
export function HeroSplit(props: HeroProps) {
  const { config, brandName, locationLabel, mapsSearchUrl } = props;
  const img = config.heroImages[0];

  return (
    <section className="min-h-[85vh] grid lg:grid-cols-2 bg-background border-b border-border">
      <div className="flex flex-col justify-center px-6 md:px-12 lg:px-16 py-24 lg:py-16 order-2 lg:order-1">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary mb-4">
          {brandName}
        </p>
        <Headline lines={config.heroHeadline} className="text-foreground" accentIndex={0} />
        <p className="mt-6 text-muted-foreground text-lg max-w-md leading-relaxed">
          {config.heroSubheadline}
        </p>
        {locationLabel && (
          <p className="mt-3 text-sm text-muted-foreground/80">{locationLabel}</p>
        )}
        <CtaRow ctas={config.heroCtas} />
        {config.ratingValue && (
          <a
            href={mapsSearchUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-8 text-sm text-primary underline underline-offset-4 w-fit"
          >
            ★ {config.ratingValue}
            {config.reviewCount
              ? ` · ${Number(config.reviewCount).toLocaleString()}+ reviews`
              : ""}
          </a>
        )}
      </div>
      <div className="relative min-h-[42vh] lg:min-h-full order-1 lg:order-2 bg-muted">
        {img ? (
          <img
            src={img.src}
            alt={img.alt}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 via-secondary/10 to-background">
            <div className="text-center px-8">
              <p className="font-serif text-4xl text-primary/40 uppercase tracking-widest">
                {brandName.split(" ")[0]}
              </p>
              <p className="text-xs text-muted-foreground mt-3">Photo coming soon</p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent hidden lg:block" />
      </div>
    </section>
  );
}

/** Minimal typography hero — no dominant photo. */
export function HeroMinimalCenter(props: HeroProps) {
  const { config, locationLabel } = props;
  return (
    <section className="min-h-[75vh] flex items-center justify-center bg-gradient-to-b from-card via-background to-background border-b border-border">
      <div className="container mx-auto px-4 py-28 text-center max-w-4xl">
        <div className="w-16 h-1 bg-primary mx-auto mb-10" />
        <Headline lines={config.heroHeadline} className="text-foreground" accentIndex={0} />
        <p className="mt-8 text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          {config.heroSubheadline}
        </p>
        <div className="flex justify-center">
          <CtaRow ctas={config.heroCtas} />
        </div>
        {locationLabel && (
          <p className="mt-10 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {locationLabel}
          </p>
        )}
      </div>
    </section>
  );
}

/** Carousel of feature cards + headline beside. */
export function HeroCarouselCards(props: HeroProps) {
  const { config, brandName, locationLabel } = props;
  const cards = config.heroImages.length
    ? config.heroImages
    : [{ src: "", alt: brandName, pos: "object-center" }];
  const [i, setI] = useState(0);

  useEffect(() => {
    if (cards.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % cards.length), 4000);
    return () => clearInterval(t);
  }, [cards.length]);

  const card = cards[i];

  return (
    <section className="py-16 md:py-24 bg-accent text-accent-foreground border-b-4 border-primary">
      <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary mb-4">
            {brandName}
          </p>
          <Headline lines={config.heroHeadline} className="text-accent-foreground" />
          <p className="mt-6 text-accent-foreground/75 text-lg max-w-md">
            {config.heroSubheadline}
          </p>
          <CtaRow ctas={config.heroCtas} light />
          {locationLabel && (
            <p className="mt-6 text-xs text-accent-foreground/50">{locationLabel}</p>
          )}
        </div>
        <div className="relative">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-accent-foreground/10 bg-black/40 shadow-2xl">
            {card.src ? (
              <img
                src={card.src}
                alt={card.alt}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-serif text-2xl text-primary/50 tracking-widest uppercase">
                  Featured
                </span>
              </div>
            )}
          </div>
          {cards.length > 1 && (
            <div className="flex gap-2 mt-4 justify-center">
              {cards.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setI(idx)}
                  className={`h-1.5 rounded-full ${
                    idx === i ? "w-8 bg-primary" : "w-3 bg-accent-foreground/30"
                  }`}
                  aria-label={`Card ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function StorefrontHero(props: HeroProps) {
  switch (props.config.heroVariant) {
    case "hero-split":
      return <HeroSplit {...props} />;
    case "hero-minimal-center":
      return <HeroMinimalCenter {...props} />;
    case "hero-carousel-cards":
      return <HeroCarouselCards {...props} />;
    case "hero-fullimage-bold":
    default:
      return <HeroFullimageBold {...props} />;
  }
}
