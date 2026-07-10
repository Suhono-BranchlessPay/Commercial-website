import { Router } from "express";
import { GOOGLE_MAPS_API_KEY } from "../lib/tenant";

const router = Router();

type PlacesPrediction = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

function mapsKey(): string | null {
  const key = GOOGLE_MAPS_API_KEY?.trim();
  return key || null;
}

/** Proxy Google Place Autocomplete (server-side — avoids Maps JS widget / referrer issues). */
router.get("/places/autocomplete", async (req, res): Promise<void> => {
  const key = mapsKey();
  if (!key) {
    res.status(503).json({ error: "Address search is not configured." });
    return;
  }

  const input = String(req.query.input ?? "").trim();
  if (input.length < 3) {
    res.json({ predictions: [] as PlacesPrediction[] });
    return;
  }

  const tenant = req.tenant;
  const lat =
    tenant?.lat ?? Number(process.env.RESTAURANT_LAT ?? "39.4277084");
  const lng =
    tenant?.lng ?? Number(process.env.RESTAURANT_LNG ?? "-86.4191611");

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json",
  );
  url.searchParams.set("input", input);
  url.searchParams.set("key", key);
  url.searchParams.set("components", "country:us");
  url.searchParams.set("types", "address");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", "25000");

  try {
    const upstream = await fetch(url);
    const data = (await upstream.json()) as {
      status: string;
      error_message?: string;
      predictions?: Array<{
        place_id: string;
        description: string;
        structured_formatting?: {
          main_text?: string;
          secondary_text?: string;
        };
      }>;
    };

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      req.log.warn(
        { status: data.status, message: data.error_message },
        "Google Places autocomplete failed",
      );
      res.status(502).json({
        error: data.error_message || `Places autocomplete failed (${data.status})`,
      });
      return;
    }

    const predictions: PlacesPrediction[] = (data.predictions ?? []).map(
      (p) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text ?? p.description,
        secondaryText: p.structured_formatting?.secondary_text ?? "",
      }),
    );

    res.json({ predictions });
  } catch (err) {
    req.log.error({ err }, "Places autocomplete proxy error");
    res.status(502).json({ error: "Could not load address search." });
  }
});

/** Resolve a place_id to a structured US address + lat/lng. */
router.get("/places/details", async (req, res): Promise<void> => {
  const key = mapsKey();
  if (!key) {
    res.status(503).json({ error: "Address search is not configured." });
    return;
  }

  const placeId = String(req.query.placeId ?? "").trim();
  if (!placeId) {
    res.status(400).json({ error: "placeId is required" });
    return;
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json",
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("key", key);
  url.searchParams.set("fields", "address_component,geometry");

  try {
    const upstream = await fetch(url);
    const data = (await upstream.json()) as {
      status: string;
      error_message?: string;
      result?: {
        address_components?: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
        geometry?: { location?: { lat: number; lng: number } };
      };
    };

    if (data.status !== "OK" || !data.result) {
      res.status(502).json({
        error: data.error_message || `Place details failed (${data.status})`,
      });
      return;
    }

    const components = data.result.address_components ?? [];
    const get = (type: string, short = false) => {
      const c = components.find((x) => x.types.includes(type));
      return short ? c?.short_name : c?.long_name;
    };

    const streetNumber = get("street_number") ?? "";
    const route = get("route") ?? "";
    const street = [streetNumber, route].filter(Boolean).join(" ").trim();
    const city =
      get("locality") ??
      get("sublocality") ??
      get("administrative_area_level_2") ??
      "";
    const state = get("administrative_area_level_1", true) ?? "";
    const postcode = get("postal_code") ?? "";
    const lat = data.result.geometry?.location?.lat;
    const lng = data.result.geometry?.location?.lng;

    if (!street || !city || !state || !postcode || lat == null || lng == null) {
      res.status(422).json({
        error: "Please select a complete street address from the list.",
      });
      return;
    }

    res.json({
      address: {
        street,
        unit: null,
        city,
        state,
        postcode,
        lat,
        lng,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Places details proxy error");
    res.status(502).json({ error: "Could not resolve address." });
  }
});

export default router;
