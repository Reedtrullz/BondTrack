import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import {
  __getRateLimitStoreSizeForTests,
  __resetRateLimitStoreForTests,
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_MAX_ENTRIES,
} from '../rate-limit';

function requestWithHeaders(headers: Record<string, string>): NextRequest {
  return { headers: new Headers(headers) } as NextRequest;
}

describe('in-memory rate limit store', () => {
  beforeEach(() => {
    __resetRateLimitStoreForTests();
    vi.useRealTimers();
  });

  it('allows requests until the per-window limit and reports reset metadata', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    expect(checkRateLimit('client-a', 2, 60_000)).toEqual({
      allowed: true,
      remaining: 1,
      resetAt: 61_000,
    });
    expect(checkRateLimit('client-a', 2, 60_000)).toEqual({
      allowed: true,
      remaining: 0,
      resetAt: 61_000,
    });
    expect(checkRateLimit('client-a', 2, 60_000)).toEqual({
      allowed: false,
      remaining: 0,
      resetAt: 61_000,
    });
  });

  it('documents single-process best-effort cap behavior by rejecting new live entries at the cap', () => {
    for (let index = 0; index < RATE_LIMIT_MAX_ENTRIES; index += 1) {
      expect(checkRateLimit(`client-${index}`, 1, 60_000).allowed).toBe(true);
    }

    expect(__getRateLimitStoreSizeForTests()).toBe(RATE_LIMIT_MAX_ENTRIES);
    expect(checkRateLimit('client-over-cap', 1, 60_000)).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it('cleans expired entries before applying the cap to new identifiers', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);

    for (let index = 0; index < RATE_LIMIT_MAX_ENTRIES; index += 1) {
      checkRateLimit(`expired-${index}`, 1, 1_000);
    }

    vi.setSystemTime(3_000);

    expect(checkRateLimit('new-client', 1, 1_000)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(__getRateLimitStoreSizeForTests()).toBe(1);
  });
});

describe('getClientIp', () => {
  it('prefers trusted proxy headers and first valid forwarded address', () => {
    expect(getClientIp(requestWithHeaders({
      'x-vercel-forwarded-for': '203.0.113.7, 198.51.100.2',
      'x-forwarded-for': '198.51.100.9',
    }))).toBe('203.0.113.7');
  });

  it('rejects obviously spoofed or malformed IP header values and falls back safely', () => {
    expect(getClientIp(requestWithHeaders({
      'x-forwarded-for': '999.999.999.999',
      'x-real-ip': '203.0.113.10<script>',
      'cf-connecting-ip': '2001:db8::1',
    }))).toBe('2001:db8::1');

    expect(getClientIp(requestWithHeaders({
      'x-forwarded-for': 'not-an-ip',
      'x-real-ip': '127.0.0.1:1234',
    }))).toBe('unknown');
  });
});
