import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, noStorePrivateHeaders } from '@/lib/api/cors';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const MAX_RANGE_SECONDS = 370 * 24 * 60 * 60;

const MAX_REQUESTS = 60;
const WINDOW_MS = 60 * 1000;

const ALLOWED_PATHS = [
  /^coins\/thorchain\/market_chart\/range$/,
];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATHS.some((pattern) => pattern.test(path));
}

function validateRangeParams(searchParams: URLSearchParams): string | null {
  const allowed = new Set(['vs_currency', 'from', 'to']);
  for (const key of searchParams.keys()) {
    if (!allowed.has(key)) return `Query parameter '${key}' is not allowed`;
    if (searchParams.getAll(key).length > 1) return `Query parameter '${key}' may only be supplied once`;
  }

  const vsCurrency = searchParams.get('vs_currency');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const from = Number(fromParam);
  const to = Number(toParam);

  if (vsCurrency !== 'usd') return 'Only usd vs_currency is supported';
  if (!fromParam || !toParam || !/^\d+$/.test(fromParam) || !/^\d+$/.test(toParam)) return 'from and to must be numeric Unix timestamps';
  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to)) return 'from and to must be numeric Unix timestamps';
  if (from <= 0 || to <= from) return 'Invalid CoinGecko time range';
  if (to - from > MAX_RANGE_SECONDS) return 'CoinGecko time range may not exceed 370 days';

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const decodedPath = path.join('/');

  // Rate limit
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`coingecko:${clientIp}`, MAX_REQUESTS, WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: {
        ...noStorePrivateHeaders(request),
        'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        'X-RateLimit-Limit': String(MAX_REQUESTS),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
      }}
    );
  }

  if (!isAllowedPath(decodedPath)) {
    return NextResponse.json({ error: 'Proxy path is not allowed' }, { status: 403, headers: noStorePrivateHeaders(request) });
  }

  const { searchParams } = new URL(request.url);
  const rangeError = validateRangeParams(searchParams);
  if (rangeError) {
    return NextResponse.json({ error: rangeError }, { status: 400, headers: noStorePrivateHeaders(request) });
  }

  const encodedPath = path.map((part) => encodeURIComponent(part)).join('/');
  const targetUrl = `${COINGECKO_BASE}/${encodedPath}?${searchParams.toString()}`;

  try {
    const response = await fetch(targetUrl, {
      headers: { Accept: 'application/json' },
      cache: 'force-cache',
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.warn('CoinGecko upstream error', { path: decodedPath, status: response.status });
      return NextResponse.json(
        { error: 'CoinGecko request failed' },
        { status: response.status, headers: noStorePrivateHeaders(request) }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: { ...corsHeaders(request), 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Upstream request failed' },
      { status: 502, headers: noStorePrivateHeaders(request) }
    );
  }
}
