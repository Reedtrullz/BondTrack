import { NETWORK } from '../config';

const RUNE_DIVISOR = BigInt(10 ** NETWORK.RUNE_DECIMALS);
const RUNE_DIVISOR_NUMBER = Number(RUNE_DIVISOR);
const USD_FORMATTERS = new Map<string, Intl.NumberFormat>();
const NUMBER_FORMATTERS = new Map<string, Intl.NumberFormat>();

function getUsdFormatter(maximumFractionDigits: number, minimumFractionDigits = 0): Intl.NumberFormat {
  const key = `${minimumFractionDigits}:${maximumFractionDigits}`;
  const cached = USD_FORMATTERS.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits,
  });
  USD_FORMATTERS.set(key, formatter);
  return formatter;
}

function getNumberFormatter(maximumFractionDigits: number, minimumFractionDigits = maximumFractionDigits): Intl.NumberFormat {
  const key = `${minimumFractionDigits}:${maximumFractionDigits}`;
  const cached = NUMBER_FORMATTERS.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  });
  NUMBER_FORMATTERS.set(key, formatter);
  return formatter;
}

function parseRawRuneToBigInt(raw: string | number | undefined): bigint | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'string') return BigInt(raw);
  if (typeof raw === 'number' && isFinite(raw)) return BigInt(Math.round(raw));
  return null;
}

/**
 * Generic numeric formatter for crypto amounts with thousands separators.
 */
export function formatAmount(raw: string | number | undefined, decimals = 2): string {
  try {
    if (raw === undefined || raw === null) return '0.00';
    
    const bigIntAmount = parseRawRuneToBigInt(raw);
    if (bigIntAmount === null) return '0.00';

    const whole = bigIntAmount / RUNE_DIVISOR;
    const fraction = bigIntAmount % RUNE_DIVISOR;
    const fractionStr = fraction.toString().padStart(8, '0').slice(0, decimals);
    
    const wholeStr = whole.toLocaleString('en-US');
    
    if (decimals === 0) return wholeStr;
    return `${wholeStr}.${fractionStr}`;
  } catch {
    return '0.00';
  }
}

/**
 * Format a RUNE amount with the ᚱ symbol prefix.
 */
export function formatRuneAmount(raw: string | number | undefined, decimals = 2): string {
  return `ᚱ${formatAmount(raw, decimals)}`;
}

/**
 * Convert raw 1e8 RUNE base units into a JavaScript number for UI display.
 *
 * This intentionally loses precision for very large raw amounts because charts,
 * percentages, and labels need number values. Keep BigInt/string values for
 * ledger math and transaction construction.
 */
export function rawRuneToDisplayNumber(raw: string | number | undefined): number {
  try {
    if (!raw) return 0;
    if (typeof raw === 'string') {
      const value = Number(BigInt(raw)) / RUNE_DIVISOR_NUMBER;
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof raw === 'number' && isFinite(raw)) {
      return raw / RUNE_DIVISOR_NUMBER;
    }
    return 0;
  } catch {
    return 0;
  }
}

/** @deprecated Prefer rawRuneToDisplayNumber() to make display-only precision loss explicit. */
export function runeToNumber(raw: string | number | undefined): number {
  return rawRuneToDisplayNumber(raw);
}

/**
 * Convert a RUNE number to raw API format (1e8 units as string).
 */
export function numberToRune(num: number): string {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  return String(BigInt(Math.round(num * RUNE_DIVISOR_NUMBER)));
}

export function formatRuneFromNumber(num: number, decimals = 2): string {
  return formatRuneAmount(numberToRune(num), decimals);
}

/**
 * Format RUNE amount with unit suffix.
 */
export function formatRuneWithUnit(raw: string, decimals = 2): string {
  return formatRuneAmount(raw, decimals);
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

export function formatUsd(value: number | null | undefined, maximumFractionDigits = 0, minimumFractionDigits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }

  return getUsdFormatter(maximumFractionDigits, minimumFractionDigits).format(value);
}

export function formatRuneDisplayNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }

  return getNumberFormatter(decimals).format(value);
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }

  return `${value.toFixed(digits)}%`;
}

export function formatDecimalPercent(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }

  return `${(value * 100).toFixed(digits)}%`;
}
