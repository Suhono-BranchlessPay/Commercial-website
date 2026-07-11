export const ORDERLY_SITE_URL = "https://orderlyfoods.com";

type Props = {
  /** Dark footers use the light-on-dark mark */
  variant?: "light" | "dark";
  className?: string;
};

/**
 * Footer credit: “Powered by” + Orderly mark → https://orderlyfoods.com
 */
export function PoweredByOrderly({ variant = "light", className = "" }: Props) {
  const src =
    variant === "dark" ? "/orderly-powered-on-dark.png" : "/orderly-powered.png";

  return (
    <a
      href={ORDERLY_SITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2.5 opacity-80 hover:opacity-100 transition-opacity ${className}`}
      aria-label="Powered by Orderly Foods"
    >
      <span
        className={
          variant === "dark"
            ? "text-xs uppercase tracking-[0.18em] font-semibold text-zinc-400"
            : "text-xs uppercase tracking-[0.18em] font-semibold text-muted-foreground"
        }
      >
        Powered by
      </span>
      <img
        src={src}
        alt="Orderly Foods"
        className="h-8 md:h-9 w-auto"
        loading="lazy"
        decoding="async"
      />
    </a>
  );
}
