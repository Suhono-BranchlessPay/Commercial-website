/**
 * Compact seed of US localities near known Orderly tenants (IN / KY).
 * Filtered at rebuild time by haversine ≤ tenant.service_area_radius.
 * Expand over time — never invent places outside the radius.
 */
export type PlaceSeed = {
  name: string;
  state: string;
  lat: number;
  lng: number;
};

export const US_PLACE_SEEDS: PlaceSeed[] = [
  // Martinsville / Indianapolis metro (Samurai)
  { name: "Martinsville", state: "IN", lat: 39.4278, lng: -86.4283 },
  { name: "Mooresville", state: "IN", lat: 39.6128, lng: -86.3742 },
  { name: "Plainfield", state: "IN", lat: 39.7042, lng: -86.3994 },
  { name: "Avon", state: "IN", lat: 39.7628, lng: -86.3997 },
  { name: "Danville", state: "IN", lat: 39.7603, lng: -86.5264 },
  { name: "Brownsburg", state: "IN", lat: 39.8434, lng: -86.3978 },
  { name: "Greenwood", state: "IN", lat: 39.6137, lng: -86.1067 },
  { name: "Franklin", state: "IN", lat: 39.4806, lng: -86.055 },
  { name: "Bloomington", state: "IN", lat: 39.1653, lng: -86.5264 },
  { name: "Spencer", state: "IN", lat: 39.2867, lng: -86.7625 },
  { name: "Cloverdale", state: "IN", lat: 39.5148, lng: -86.7939 },
  { name: "Monrovia", state: "IN", lat: 39.5792, lng: -86.4822 },
  { name: "Paragon", state: "IN", lat: 39.395, lng: -86.5617 },
  { name: "Brooklyn", state: "IN", lat: 39.5392, lng: -86.3703 },
  { name: "Bargersville", state: "IN", lat: 39.5209, lng: -86.1678 },
  { name: "Whiteland", state: "IN", lat: 39.5498, lng: -86.0797 },
  { name: "Center Grove", state: "IN", lat: 39.5648, lng: -86.2014 },
  { name: "Camby", state: "IN", lat: 39.6614, lng: -86.3125 },
  { name: "Indianapolis", state: "IN", lat: 39.7684, lng: -86.1581 },
  { name: "Southport", state: "IN", lat: 39.665, lng: -86.1275 },
  { name: "Beech Grove", state: "IN", lat: 39.7217, lng: -86.0897 },
  { name: "Speedway", state: "IN", lat: 39.8023, lng: -86.2411 },
  { name: "Clayton", state: "IN", lat: 39.6895, lng: -86.5228 },
  { name: "Amo", state: "IN", lat: 39.6881, lng: -86.6139 },
  { name: "Stilesville", state: "IN", lat: 39.6384, lng: -86.6336 },
  { name: "Gosport", state: "IN", lat: 39.3509, lng: -86.6669 },
  { name: "Ellettsville", state: "IN", lat: 39.2339, lng: -86.625 },
  { name: "Nashville", state: "IN", lat: 39.2073, lng: -86.2472 },
  { name: "Morgantown", state: "IN", lat: 39.3625, lng: -86.2608 },
  { name: "Trafalgar", state: "IN", lat: 39.4162, lng: -86.1508 },

  // Henderson KY metro (Kirin)
  { name: "Henderson", state: "KY", lat: 37.8362, lng: -87.5903 },
  { name: "Evansville", state: "IN", lat: 37.9716, lng: -87.5711 },
  { name: "Owensboro", state: "KY", lat: 37.7719, lng: -87.1112 },
  { name: "Newburgh", state: "IN", lat: 37.9445, lng: -87.4053 },
  { name: "Mount Vernon", state: "IN", lat: 37.9323, lng: -87.895 },
  { name: "Corydon", state: "KY", lat: 37.7059, lng: -87.7017 },
  { name: "Smith Mills", state: "KY", lat: 37.7814, lng: -87.7625 },
  { name: "Anthoston", state: "KY", lat: 37.7614, lng: -87.5306 },
  { name: "Robards", state: "KY", lat: 37.6731, lng: -87.5442 },
  { name: "Spottsville", state: "KY", lat: 37.8564, lng: -87.4103 },
  { name: "Reed", state: "KY", lat: 37.8556, lng: -87.365 },
  { name: "Sebree", state: "KY", lat: 37.6031, lng: -87.5256 },
  { name: "Morganfield", state: "KY", lat: 37.6834, lng: -87.9167 },
  { name: "Madisonville", state: "KY", lat: 37.3281, lng: -87.4989 },
  { name: "Boonsville", state: "IN", lat: 38.045, lng: -87.2742 },
  { name: "Chandler", state: "IN", lat: 38.0417, lng: -87.3681 },
  { name: "Darmstadt", state: "IN", lat: 38.0942, lng: -87.5772 },
  { name: "Highland", state: "IN", lat: 38.0442, lng: -87.6125 },
];
