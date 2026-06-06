import { NextRequest, NextResponse } from 'next/server';
import { getRunePriceAtDate, getRunePriceRange } from '@/lib/api/coinapi';
import { corsHeaders } from '@/lib/api/cors';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

// CoinAPI free tier: 100 requests/day
// We limit to 80/day to have buffer
const RATE_LIMIT_REQUESTS = 80;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const MAX_RANGE_MS = 370 * 24 * 60 * 60 * 1000;

function parseIsoDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export async function GET(request: NextRequest) {
  // Check rate limit
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
          ...corsHeaders(request),
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(RATE_LIMIT_REQUESTS),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
        }
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const timeStart = searchParams.get('timeStart');
  const timeEnd = searchParams.get('timeEnd');

  if (!process.env.COINAPI_KEY) {
    return NextResponse.json({ error: 'CoinAPI is not configured' }, { status: 503, headers: corsHeaders(request) });
  }

  if (date) {
    const targetDate = parseIsoDate(date);
    if (!targetDate) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400, headers: corsHeaders(request) });
    }
    const price = await getRunePriceAtDate(targetDate);
    if (price === null) {
      return NextResponse.json({ error: 'Price not available' }, { status: 404, headers: corsHeaders(request) });
    }
    return NextResponse.json(
      { price, date: targetDate.toISOString().slice(0, 10) },
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

  if (timeStart && timeEnd) {
    const start = parseIsoDate(timeStart);
    const end = parseIsoDate(timeEnd);
    if (!start || !end) {
      return NextResponse.json({ error: 'Invalid timeStart or timeEnd' }, { status: 400, headers: corsHeaders(request) });
    }
    const rangeMs = end.getTime() - start.getTime();
    if (rangeMs <= 0 || rangeMs > MAX_RANGE_MS) {
      return NextResponse.json({ error: 'Date range must be positive and no longer than 370 days' }, { status: 400, headers: corsHeaders(request) });
    }

    const data = await getRunePriceRange(start.toISOString(), end.toISOString());
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

  return NextResponse.json({ error: 'Missing date parameter' }, { status: 400, headers: corsHeaders(request) });
}
