import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Prevent unbounded memory growth — cap the store at 10000 entries
const MAX_ENTRIES = 10000;

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// Simple IP validation — rejects obviously spoofed values
function isValidIp(value: string): boolean {
  // IPv4: 0.0.0.0 - 255.255.255.255
  // IPv6: allow hex/colon patterns
  return /^[\d.]+$/.test(value) || /^[0-9a-fA-F:.]+$/.test(value);
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
    // Enforce store size limit before adding new entries
    if (!entry && rateLimitStore.size >= MAX_ENTRIES) {
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
