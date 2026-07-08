import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type SquareConfig =
  | { enabled: false }
  | {
      enabled: true;
      applicationId: string;
      locationId: string;
      environment: string;
    };

type SquarePayments = {
  card: () => Promise<{
    attach: (selector: string) => Promise<void>;
    tokenize: () => Promise<{
      status: string;
      token?: string;
      errors?: Array<{ message?: string }>;
    }>;
  }>;
};

declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId: string) => Promise<SquarePayments>;
    };
  }
}

function squareScriptUrl(environment: string): string {
  return environment === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";
}

function loadSquareScript(environment: string): Promise<void> {
  const src = squareScriptUrl(environment);
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing && window.Square) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Square payments"));
    document.head.appendChild(script);
  });
}

export type SquareCardHandle = {
  tokenize: () => Promise<string>;
  isReady: () => boolean;
};

type Props = {
  onReadyChange?: (ready: boolean) => void;
};

export const SquareCardPayment = forwardRef<SquareCardHandle, Props>(
  function SquareCardPayment({ onReadyChange }, ref) {
    const containerId = useRef(`sq-card-${Math.random().toString(36).slice(2)}`);
    const cardRef = useRef<Awaited<ReturnType<SquarePayments["card"]>> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
      let cancelled = false;

      (async () => {
        try {
          const res = await fetch(`${API_BASE}/api/square/config`);
          const config = (await res.json()) as SquareConfig;
          if (!config.enabled) {
            setError("Online card payment is not configured.");
            setLoading(false);
            onReadyChange?.(false);
            return;
          }

          await loadSquareScript(config.environment);
          if (cancelled || !window.Square) return;

          const payments = await window.Square.payments(
            config.applicationId,
            config.locationId,
          );
          const card = await payments.card();
          await card.attach(`#${containerId.current}`);
          if (cancelled) return;

          cardRef.current = card;
          setReady(true);
          setLoading(false);
          onReadyChange?.(true);
        } catch (err) {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Card form failed to load");
          setLoading(false);
          onReadyChange?.(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [onReadyChange]);

    useImperativeHandle(ref, () => ({
      isReady: () => ready && Boolean(cardRef.current),
      tokenize: async () => {
        if (!cardRef.current) {
          throw new Error("Card form is not ready");
        }
        const result = await cardRef.current.tokenize();
        if (result.status !== "OK" || !result.token) {
          const msg = result.errors?.[0]?.message ?? "Card could not be verified";
          throw new Error(msg);
        }
        return result.token;
      },
    }));

    return (
      <div className="space-y-2">
        <div
          id={containerId.current}
          className="min-h-[52px] rounded-lg border border-border bg-background px-3 py-2"
        />
        {loading && (
          <p className="text-xs text-muted-foreground">Loading secure card form…</p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);
