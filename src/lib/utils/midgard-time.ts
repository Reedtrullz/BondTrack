const SECOND_TIMESTAMP_UPPER_BOUND = 9_999_999_999;
const MILLISECOND_TIMESTAMP_LOWER_BOUND = 1_000_000_000_000;
const NANOSECOND_TIMESTAMP_LOWER_BOUND = 1_000_000_000_000_000;

export interface MidgardFreshness {
  updatedAt: Date | null;
  updatedAtTimestampSeconds: number | null;
  ageMs: number | null;
  isStale: boolean;
  staleAfterMs: number;
}

/**
 * Normalize Midgard timestamps to Unix seconds.
 *
 * Midgard history endpoints commonly return nanoseconds, while fixtures and a
 * few proxy paths use seconds. Milliseconds are accepted defensively so UI date
 * labels never render nanosecond values as far-future dates.
 */
export function normalizeMidgardTimestampToSeconds(rawTimestamp: string | number | bigint | null | undefined): number {
  if (rawTimestamp === null || rawTimestamp === undefined || rawTimestamp === '') {
    return 0;
  }

  const numericTimestamp = Number(rawTimestamp);
  if (!Number.isFinite(numericTimestamp) || numericTimestamp <= 0) {
    return 0;
  }

  if (numericTimestamp >= NANOSECOND_TIMESTAMP_LOWER_BOUND) {
    const seconds = Math.floor(numericTimestamp / 1_000_000_000);
    return seconds <= SECOND_TIMESTAMP_UPPER_BOUND ? seconds : 0;
  }

  if (numericTimestamp >= MILLISECOND_TIMESTAMP_LOWER_BOUND) {
    const seconds = Math.floor(numericTimestamp / 1_000);
    return seconds <= SECOND_TIMESTAMP_UPPER_BOUND ? seconds : 0;
  }

  if (numericTimestamp <= SECOND_TIMESTAMP_UPPER_BOUND) {
    return Math.floor(numericTimestamp);
  }

  return 0;
}

export function normalizeMidgardTimestampToDate(rawTimestamp: string | number | bigint | null | undefined): Date | null {
  const seconds = normalizeMidgardTimestampToSeconds(rawTimestamp);
  return seconds > 0 ? new Date(seconds * 1000) : null;
}

export function formatMidgardDate(rawTimestamp: string | number | bigint | null | undefined, fallback = '--'): string {
  const date = normalizeMidgardTimestampToDate(rawTimestamp);
  return date ? date.toISOString().slice(0, 10) : fallback;
}

export function getMidgardDataFreshness(
  rawTimestamp: string | number | bigint | null | undefined,
  staleAfterMs: number,
  nowMs = Date.now()
): MidgardFreshness {
  const seconds = normalizeMidgardTimestampToSeconds(rawTimestamp);

  if (seconds <= 0) {
    return {
      updatedAt: null,
      updatedAtTimestampSeconds: null,
      ageMs: null,
      isStale: true,
      staleAfterMs,
    };
  }

  const updatedAtMs = seconds * 1000;
  const ageMs = Math.max(0, nowMs - updatedAtMs);

  return {
    updatedAt: new Date(updatedAtMs),
    updatedAtTimestampSeconds: seconds,
    ageMs,
    isStale: ageMs > staleAfterMs,
    staleAfterMs,
  };
}
