import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { isMetaInAppBrowser } from "@/lib/inAppBrowser";
import { useCart } from "@/lib/cart";
import { shareCart, withCartToken } from "@/lib/cartShare";
import { openSecureBrowser, toEscapeHref } from "@/lib/safariHandoff";
import { useTenant } from "@/lib/tenant";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

type Props = {
  /** Kept for callers; UI is always a single primary CTA (no lecture). */
  compact?: boolean;
  surface?: "menu" | "checkout" | "layout";
};

/**
 * Quiet handoff for Meta WebViews — one button, not a warning pamphlet.
 * Prefers x-safari-https / Android intent; copy link as backup.
 */
export function OpenInSafariBanner({ surface = "layout" }: Props) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [handoffUrl, setHandoffUrl] = useState(
    typeof window !== "undefined" ? window.location.href : "",
  );
  const [sharing, setSharing] = useState(false);
  const { items } = useCart();
  const { tenant } = useTenant();

  useEffect(() => {
    const inApp = isMetaInAppBrowser();
    setShow(inApp);
    if (inApp && tenant?.tenantId) {
      trackAnalyticsEvent({
        tenantId: tenant.tenantId,
        eventType: "webview_detected",
        meta: { surface, ui: "handoff_cta" },
      });
    }
  }, [tenant?.tenantId, surface]);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    (async () => {
      setSharing(true);
      const token = items.length > 0 ? await shareCart(items) : null;
      if (cancelled) return;
      const base = window.location.href;
      setHandoffUrl(token ? withCartToken(base, token) : base);
      setSharing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [show, items]);

  if (!show) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(handoffUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const continueSecure = () => {
    openSecureBrowser(handoffUrl);
  };

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-2">
      <p className="text-sm text-foreground font-medium">
        Continue to secure checkout
      </p>
      <p className="text-xs text-muted-foreground">
        {items.length > 0
          ? "Your cart is saved in this step."
          : "Opens your phone’s browser for card payment."}
      </p>
      <Button
        type="button"
        className="w-full h-11 bg-primary text-primary-foreground"
        disabled={sharing}
        onClick={continueSecure}
      >
        Continue
      </Button>
      <div className="flex justify-center">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2"
          onClick={copyLink}
          disabled={sharing}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Link copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy link instead
            </>
          )}
        </button>
      </div>
      {/* Hidden prefetch for accessibility / long-press */}
      <a href={toEscapeHref(handoffUrl)} className="sr-only">
        Continue
      </a>
    </div>
  );
}
