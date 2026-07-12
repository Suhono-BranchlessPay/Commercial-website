/**
 * Per-tenant BP anchor mode (SUMBER §4.3).
 * Samurai = pos-native (Square anchors). Others = platform (Orderly anchors).
 */

export type AnchorMode = "platform" | "pos-native";

const POS_NATIVE_SLUGS = new Set(["samurai"]);

export function normalizeAnchorMode(raw: unknown): AnchorMode {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === "pos-native" || v === "pos_native" || v === "native") {
    return "pos-native";
  }
  return "platform";
}

/**
 * Resolve mode from DB column, then env override, then known pos-native slugs.
 */
export function resolveAnchorMode(input: {
  slug: string;
  anchorMode?: string | null;
}): AnchorMode {
  const envKey = `TENANT_${input.slug.toUpperCase().replace(/-/g, "_")}_ANCHOR_MODE`;
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) return normalizeAnchorMode(fromEnv);

  if (input.anchorMode != null && String(input.anchorMode).trim() !== "") {
    return normalizeAnchorMode(input.anchorMode);
  }

  if (POS_NATIVE_SLUGS.has(input.slug.trim().toLowerCase())) {
    return "pos-native";
  }

  return "platform";
}

export function isPosNativeAnchor(input: {
  slug: string;
  anchorMode?: string | null;
}): boolean {
  return resolveAnchorMode(input) === "pos-native";
}
