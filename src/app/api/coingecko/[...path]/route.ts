import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const MAX_RANGE_SECONDS = 370 * 24 * 60 * 60;

const ALLOWED_PATHS = [
  /^coins\/thorchain\/market_chart\/range$/,
];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATHS.some((pattern) => pattern.test(path));
}

function validateRangeParams(searchParams: URLSearchParams): string | null {
  const vsCurrency = searchParams.get('vs_currency');
  const from = Number(searchParams.get('from'));
  const to = Number(searchParams.get('to'));

  if (vsCurrency !== 'usd') return 'Only usd vs_currency is supported';
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 'from and to must be numeric Unix timestamps';
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

  if (!isAllowedPath(decodedPath)) {
    return NextResponse.json({ error: 'Proxy path is not allowed' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rangeError = validateRangeParams(searchParams);
  if (rangeError) {
    return NextResponse.json({ error: rangeError }, { status: 400 });
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
      return NextResponse.json(
        { error: `CoinGecko error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 502 }
    );
  }
}
