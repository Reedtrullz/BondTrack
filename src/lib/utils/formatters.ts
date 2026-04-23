import { NETWORK } from '../config';

const RUNE_DIVISOR = BigInt(10 ** NETWORK.RUNE_DECIMALS);

/**
 * Convert a raw API amount string (1e8 units) to a human-readable RUNE number.
 * All THORChain API amounts are strings representing integer satoshis (1e8).
 */
export function formatRuneAmount(raw: string | number | undefined, decimals = 2): string {
  try {
    if (!raw) {
      return '0'.repeat(decimals + 1).replace('.', '').slice(0, decimals) || '0';
    }
    let bigIntAmount: bigint;
    if (typeof raw === 'string') {
      bigIntAmount = BigInt(raw);
    } else if (typeof raw === 'number' && isFinite(raw)) {
      bigIntAmount = BigInt(Math.round(raw));
    } else {
      return '0'.repeat(decimals + 1).replace('.', '').slice(0, decimals) || '0';
    }
    const whole = bigIntAmount / RUNE_DIVISOR;
    const fraction = bigIntAmount % RUNE_DIVISOR;
    const fractionStr = fraction.toString().padStart(8, '0').slice(0, decimals);
    if (decimals === 0) return whole.toString();
    return `${whole}.${fractionStr}`;
  } catch {
    return '0'.repeat(decimals + 1).replace('.', '').slice(0, decimals) || '0';
  }
}

export function runeToNumber(raw: string | number | undefined): number {
  try {
    if (!raw) return 0;
    if (typeof raw === 'string') {
      return Number(BigInt(raw)) / Number(RUNE_DIVISOR);
    }
    if (typeof raw === 'number' && isFinite(raw)) {
      return raw / Number(RUNE_DIVISOR);
    }
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Convert a RUNE number to raw API format (1e8 units as string).
 * NOTE: Precision is limited by JavaScript's Number.MAX_SAFE_INTEGER (~90M RUNE).
 */
export function numberToRune(num: number): string {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  return String(BigInt(Math.round(num * Number(RUNE_DIVISOR))));
}

/**
 * Formats a RUNE decimal number as a formatted string.
 * Uses numberToRune internally to ensure consistent satoshi-based formatting.
 */
export function formatRuneFromNumber(num: number, decimals = 2): string {
  return formatRuneAmount(numberToRune(num), decimals);
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

export function formatUsd(value: number | null | undefined, maximumFractionDigits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }

  return `${value.toFixed(digits)}%`;
}
