import { z } from "zod";
import {
  DELIVERY_RADIUS_MILES,
  RESTAURANT_LAT,
  RESTAURANT_LNG,
} from "./tenant";

export const structuredAddressSchema = z.object({
  street: z.string().min(1),
  unit: z.string().nullable().optional(),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  postcode: z.string().min(5),
  lat: z.number(),
  lng: z.number(),
});

export type StructuredAddress = z.infer<typeof structuredAddressSchema>;

export function formatAddress(addr: StructuredAddress): string {
  const line1 = [addr.street, addr.unit?.trim()].filter(Boolean).join(" ");
  return `${line1}, ${addr.city}, ${addr.state} ${addr.postcode}`;
}

export function addressFingerprint(addr: StructuredAddress): string {
  return [
    addr.street.trim().toLowerCase(),
    (addr.unit ?? "").trim().toLowerCase(),
    addr.city.trim().toLowerCase(),
    addr.state.trim().toUpperCase(),
    addr.postcode.trim(),
    addr.lat.toFixed(6),
    addr.lng.toFixed(6),
  ].join("|");
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine distance in miles. */
export function distanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinDeliveryRadius(
  lat: number,
  lng: number,
  radiusMiles: number = DELIVERY_RADIUS_MILES,
  restaurantLat: number = RESTAURANT_LAT,
  restaurantLng: number = RESTAURANT_LNG,
): boolean {
  return (
    distanceMiles(restaurantLat, restaurantLng, lat, lng) <= radiusMiles
  );
}

export const OUT_OF_RADIUS_MESSAGE =
  "Sorry, we don't deliver to this address. It's outside our delivery area. Please try pickup or a closer address.";
