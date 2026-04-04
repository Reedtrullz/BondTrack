import { NETWORK } from '../config';

const RUNE_DIVISOR = BigInt(10 ** NETWORK.RUNE_DECIMALS);

/**
 * Convert a raw API amount string (1e8 units) to a human-readable RUNE number.
 * All THORChain API amounts are strings representing integer satoshis (1e8).
 */
export function formatRuneAmount(raw: string, decimals = 2): string {
  const bigIntAmount = BigInt(raw);
  const whole = bigIntAmount / RUNE_DIVISOR;
  const fraction = bigIntAmount % RUNE_DIVISOR;

  // Pad fraction to 8 digits, then trim to requested decimals
  const fractionStr = fraction.toString().padStart(8, '0').slice(0, decimals);

  if (decimals === 0) return whole.toString();

  return `${whole}.${fractionStr}`;
}

/**
 * Convert raw API amount to a number (for calculations).
 * Use with caution for large values — prefer BigInt math.
 */
export function runeToNumber(raw: string): number {
  return Number(BigInt(raw)) / Number(RUNE_DIVISOR);
}

/**
 * Convert a RUNE number to raw API format (1e8 units as string).
 */
export function numberToRune(num: number): string {
  return String(BigInt(Math.round(num * Number(RUNE_DIVISOR))));
}

/**
 * Format RUNE amount with unit suffix.
 */
export function formatRuneWithUnit(raw: string, decimals = 2): string {
  return `${formatRuneAmount(raw, decimals)} RUNE`;
}

/**
 * Format basis points as percentage.
 */
export function formatBasisPoints(bps: string | number): string {
  const num = typeof bps === 'string' ? Number(bps) : bps;
  return `${(num / 100).toFixed(1)}%`;
}

/**
 * Format a large number with K/M/B suffixes.
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(2);
}
