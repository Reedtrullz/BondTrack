import { NextRequest, NextResponse } from 'next/server';
import { getRunePriceAtDate, getRunePriceRange } from '@/lib/api/coinapi';
import { corsHeaders, noStorePrivateHeaders } from '@/lib/api/cors';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

// CoinAPI free tier: 100 requests/day
// We limit to 80/day to have buffer
const RATE_LIMIT_REQUESTS = 80;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const MAX_RANGE_MS = 370 * 24 * 60 * 60 * 1000;
const EARLIEST_COINAPI_DATE = new Date('2019-07-20T00:00:00.000Z');
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

interface ValidatedRequest {
  mode: 'date' | 'range';
  date?: Date;
  timeStart?: Date;
  timeEnd?: Date;
}

function errorResponse(request: NextRequest, message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    { status, headers: noStorePrivateHeaders(request) }
  );
}

function parseDateOnly(value: string): Date | null {
  if (!DATE_ONLY_PATTERN.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

function parseStrictDateTime(value: string, fieldName: string): Date | string {
  if (DATE_ONLY_PATTERN.test(value)) {
    const date = parseDateOnly(value);
    return date ?? `${fieldName} is invalid`;
  }

  if (!ISO_UTC_PATTERN.test(value)) return `${fieldName} must be YYYY-MM-DD or an ISO UTC timestamp`;
  const date = new Date(value);
  const normalized = value.includes('.') ? value : value.replace(/Z$/, '.000Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== normalized) {
    return `${fieldName} is invalid`;
  }
  return date;
}

function validateBounds(date: Date, fieldName: string, now = new Date()): string | null {
  if (date.getTime() < EARLIEST_COINAPI_DATE.getTime()) {
    return `${fieldName} is earlier than supported CoinAPI history`;
  }
  if (date.getTime() > now.getTime()) {
    return `${fieldName} cannot be in the future`;
  }
  return null;
}

function validateRequest(searchParams: URLSearchParams, now = new Date()): ValidatedRequest | string {
  const keys = [...new Set(searchParams.keys())];
  const allowed = new Set(['date', 'timeStart', 'timeEnd']);
  for (const key of keys) {
    if (!allowed.has(key)) return `Unknown query parameter '${key}'`;
    if (searchParams.getAll(key).length > 1) return `Query parameter '${key}' may only be supplied once`;
  }

  const hasDate = searchParams.has('date');
  const hasTimeStart = searchParams.has('timeStart');
  const hasTimeEnd = searchParams.has('timeEnd');
  const dateValue = searchParams.get('date');
  const timeStartValue = searchParams.get('timeStart');
  const timeEndValue = searchParams.get('timeEnd');

  if (hasDate && (hasTimeStart || hasTimeEnd)) {
    return 'Use either date or timeStart/timeEnd, not both';
  }

  if (hasDate) {
    if (dateValue === null || dateValue.trim() === '') return 'date is required';
    const date = parseDateOnly(dateValue);
    if (!date) return 'date must use YYYY-MM-DD format';
    const boundError = validateBounds(date, 'date', now);
    if (boundError) return boundError;
    return { mode: 'date', date };
  }

  if (hasTimeStart || hasTimeEnd) {
    if (!hasTimeStart || !hasTimeEnd) return 'timeStart and timeEnd are required together';
    if (timeStartValue === null || timeStartValue.trim() === '') return 'timeStart is required';
    if (timeEndValue === null || timeEndValue.trim() === '') return 'timeEnd is required';
    const start = parseStrictDateTime(timeStartValue, 'timeStart');
    if (typeof start === 'string') return start;
    const end = parseStrictDateTime(timeEndValue, 'timeEnd');
    if (typeof end === 'string') return end;

    const startBoundError = validateBounds(start, 'timeStart', now);
    if (startBoundError) return startBoundError;
    const endBoundError = validateBounds(end, 'timeEnd', now);
    if (endBoundError) return endBoundError;

    const rangeMs = end.getTime() - start.getTime();
    if (rangeMs <= 0) return 'timeEnd must be after timeStart';
    if (rangeMs > MAX_RANGE_MS) return 'Date range must be positive and no longer than 370 days';
    return { mode: 'range', timeStart: start, timeEnd: end };
  }

  return 'Missing date parameter';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const validation = validateRequest(searchParams);
  if (typeof validation === 'string') {
    return errorResponse(request, validation);
  }

  if (!process.env.COINAPI_KEY) {
    return errorResponse(request, 'CoinAPI is not configured', 503);
  }

  // Check rate limit only after validating the request shape so rejected input
  // never consumes the small CoinAPI-backed quota.
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(
    `coinapi:${clientIp}`,
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW_MS
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      {
        status: 429,
        headers: {
          ...noStorePrivateHeaders(request),
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(RATE_LIMIT_REQUESTS),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
        }
      }
    );
  }

  if (validation.mode === 'date' && validation.date) {
    const price = await getRunePriceAtDate(validation.date);
    if (price === null) {
      return errorResponse(request, 'Price not available', 404);
    }
    return NextResponse.json(
      { price, date: validation.date.toISOString().slice(0, 10) },
      {
        headers: {
          ...corsHeaders(request),
          'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800',
          'X-RateLimit-Limit': String(RATE_LIMIT_REQUESTS),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
        }
      }
    );
  }

  if (validation.mode === 'range' && validation.timeStart && validation.timeEnd) {
    const data = await getRunePriceRange(validation.timeStart.toISOString(), validation.timeEnd.toISOString());
    return NextResponse.json(
      { intervals: data },
      {
        headers: {
          ...corsHeaders(request),
          'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800',
          'X-RateLimit-Limit': String(RATE_LIMIT_REQUESTS),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
        }
      }
    );
  }

  return errorResponse(request, 'Invalid CoinAPI request');
}
