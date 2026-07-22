/**
 * Process-local counters for fail-closed webhook drops (unmapped page/location).
 * Surfaced on /api/social/health and /api/gbp/health so ops can spot a spike
 * after a new Page/Location is connected without a map entry.
 */
export type UnmappedSkipStats = {
  total: number;
  last_at: string | null;
  last_id: string | null;
};

function empty(): UnmappedSkipStats {
  return { total: 0, last_at: null, last_id: null };
}

const meta = empty();
const gbp = empty();

export function recordMetaUnmappedSkip(pageId: string | null | undefined): void {
  meta.total += 1;
  meta.last_at = new Date().toISOString();
  meta.last_id = pageId?.trim() || null;
}

export function recordGbpUnmappedSkip(
  locationId: string | null | undefined,
): void {
  gbp.total += 1;
  gbp.last_at = new Date().toISOString();
  gbp.last_id = locationId?.trim() || null;
}

export function getMetaUnmappedSkipStats(): UnmappedSkipStats {
  return { ...meta };
}

export function getGbpUnmappedSkipStats(): UnmappedSkipStats {
  return { ...gbp };
}

/** Test-only reset. */
export function resetUnmappedSkipStatsForTests(): void {
  meta.total = 0;
  meta.last_at = null;
  meta.last_id = null;
  gbp.total = 0;
  gbp.last_at = null;
  gbp.last_id = null;
}
