import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Single-process, best-effort limiter. In serverless/multi-process deployments each
// process keeps its own store, so this reduces accidental bursts but is not a
// durable abuse-prevention boundary. Prevent unbounded memory growth by capping
// the in-memory store at 10000 live entries.
export const RATE_LIMIT_MAX_ENTRIES = 10000;

function cleanupExpiredEntries(now = Date.now()): void {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

export function __resetRateLimitStoreForTests(): void {
  if (process.env.NODE_ENV !== 'test') return;
  rateLimitStore.clear();
}

export function __getRateLimitStoreSizeForTests(): number {
  if (process.env.NODE_ENV !== 'test') return 0;
  return rateLimitStore.size;
}

// Clean up expired entries every 10 minutes
const cleanupTimer = setInterval(() => cleanupExpiredEntries(), 10 * 60 * 1000);
cleanupTimer.unref?.();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// Simple IP validation — rejects obviously spoofed values. Trust still comes from
// the deployment proxy that sets these headers; client-supplied spoofed headers
// can only be treated as best effort here.
function isValidIp(value: string): boolean {
  const trimmed = value.trim();
  const ipv4Parts = trimmed.split('.');
  if (ipv4Parts.length === 4 && ipv4Parts.every((part) => /^\d{1,3}$/.test(part))) {
    return ipv4Parts.every((part) => Number(part) >= 0 && Number(part) <= 255);
  }

  // IPv6: allow only hex/colon patterns with at least one colon.
  return trimmed.includes(':') && /^[0-9a-fA-F:]+$/.test(trimmed);
}

export function getClientIp(request: NextRequest): string {
  // Prefer Vercel's trusted header in production
  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  if (vercelIp) {
    const first = vercelIp.split(',')[0].trim();
    if (isValidIp(first)) return first;
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0].trim();
    if (isValidIp(first)) return first;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp && isValidIp(realIp)) return realIp;

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && isValidIp(cfIp)) return cfIp;

  return 'unknown';
}

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    cleanupExpiredEntries(now);
    // Enforce store size limit before adding new entries
    if (!entry && rateLimitStore.size >= RATE_LIMIT_MAX_ENTRIES) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + windowMs,
      };
    }
    // First request or window expired
    const resetAt = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
    };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  rateLimitStore.set(identifier, entry);
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}
