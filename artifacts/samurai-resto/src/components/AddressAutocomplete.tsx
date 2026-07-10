import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { StructuredAddress } from "@/lib/checkoutStorage";
import { useTenant } from "@/lib/tenant";

type Prediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

interface AddressAutocompleteProps {
  apiBase: string;
  value: StructuredAddress | null;
  unit: string;
  onAddressChange: (address: StructuredAddress | null) => void;
  onUnitChange: (unit: string) => void;
  disabled?: boolean;
}

export function AddressAutocomplete({
  apiBase,
  value,
  unit,
  onAddressChange,
  onUnitChange,
  disabled,
}: AddressAutocompleteProps) {
  const { tenant } = useTenant();
  const areaLabel =
    tenant?.restaurant?.city || tenant?.name || "our delivery";
  const listId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [streetInput, setStreetInput] = useState(value?.street ?? "");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value?.street) setStreetInput(value.street);
  }, [value?.street]);

  useEffect(() => {
    const q = streetInput.trim();
    if (value && q === value.street.trim()) {
      setPredictions([]);
      return;
    }
    if (q.length < 3) {
      setPredictions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${apiBase}/api/places/autocomplete?input=${encodeURIComponent(q)}`,
        );
        const data = (await res.json()) as {
          predictions?: Prediction[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Could not load address search.");
          setPredictions([]);
          return;
        }
        setError(null);
        setPredictions(data.predictions ?? []);
        setOpen(true);
      } catch {
        if (!cancelled) {
          setError("Could not load address search.");
          setPredictions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [apiBase, streetInput, value]);

  async function selectPrediction(prediction: Prediction) {
    setOpen(false);
    setPredictions([]);
    setStreetInput(prediction.mainText);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase}/api/places/details?placeId=${encodeURIComponent(prediction.placeId)}`,
      );
      const data = (await res.json()) as {
        address?: StructuredAddress;
        error?: string;
      };
      if (!res.ok || !data.address) {
        setError(data.error || "Please select a complete street address from the list.");
        onAddressChange(null);
        return;
      }
      setStreetInput(data.address.street);
      onAddressChange({
        ...data.address,
        unit: unit.trim() || null,
      });
    } catch {
      setError("Could not resolve address.");
      onAddressChange(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          value={streetInput}
          onChange={(e) => {
            setStreetInput(e.target.value);
            if (!e.target.value.trim()) onAddressChange(null);
          }}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            if (predictions.length) setOpen(true);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          placeholder="Start typing your street address…"
          className="h-12 bg-background"
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        {open && predictions.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-background shadow-lg"
          >
            {predictions.map((p) => (
              <li key={p.placeId} role="option">
                <button
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-muted"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void selectPrediction(p)}
                >
                  <span className="text-sm font-medium">{p.mainText}</span>
                  {p.secondaryText ? (
                    <span className="text-xs text-muted-foreground">
                      {p.secondaryText}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
        {value && (
          <p className="text-xs text-muted-foreground mt-1.5">
            {value.city}, {value.state} {value.postcode}
          </p>
        )}
        {loading && !value && (
          <p className="text-xs text-muted-foreground mt-1.5">Searching…</p>
        )}
      </div>
      <Input
        value={unit}
        onChange={(e) => {
          onUnitChange(e.target.value);
          if (value) {
            onAddressChange({ ...value, unit: e.target.value.trim() || null });
          }
        }}
        placeholder="Apt / Suite / Unit (optional)"
        className="h-11 bg-background"
        disabled={disabled}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!value && !error && (
        <p className="text-xs text-muted-foreground">
          Select your address from the suggestions — we deliver within the{" "}
          {areaLabel} area.
        </p>
      )}
    </div>
  );
}
