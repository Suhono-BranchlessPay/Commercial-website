import { Router } from "express";
import {
  DELIVERY_RADIUS_MILES,
  getTenantId,
  GOOGLE_MAPS_API_KEY,
  RESTAURANT_LAT,
  RESTAURANT_LNG,
} from "../lib/tenant";

const router = Router();

/** Public checkout config — no secrets beyond Maps key (domain-restricted in Google Cloud). */
router.get("/config/checkout", (_req, res): void => {
  res.json({
    tenantId: getTenantId(),
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || null,
    places: {
      country: "us",
      locationBias: {
        lat: RESTAURANT_LAT,
        lng: RESTAURANT_LNG,
        radiusMeters: 25000,
      },
    },
    delivery: {
      radiusMiles: DELIVERY_RADIUS_MILES,
      restaurantLat: RESTAURANT_LAT,
      restaurantLng: RESTAURANT_LNG,
    },
  });
});

export default router;
