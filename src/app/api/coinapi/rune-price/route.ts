import { NextRequest, NextResponse } from 'next/server';
import { getRunePriceAtDate, getRunePriceRange } from '@/lib/api/coinapi';

export const dynamic = 'force-dynamic';

const MAX_RANGE_MS = 370 * 24 * 60 * 60 * 1000;

function parseIsoDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const timeStart = searchParams.get('timeStart');
  const timeEnd = searchParams.get('timeEnd');

  if (!process.env.COINAPI_KEY) {
    return NextResponse.json({ error: 'CoinAPI is not configured' }, { status: 503 });
  }

  if (date) {
    const targetDate = parseIsoDate(date);
    if (!targetDate) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
    const price = await getRunePriceAtDate(targetDate);
    if (price === null) {
      return NextResponse.json({ error: 'Price not available' }, { status: 404 });
    }
    return NextResponse.json(
      { price, date: targetDate.toISOString().slice(0, 10) },
      { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800' } }
    );
  }

  if (timeStart && timeEnd) {
    const start = parseIsoDate(timeStart);
    const end = parseIsoDate(timeEnd);
    if (!start || !end) {
      return NextResponse.json({ error: 'Invalid timeStart or timeEnd' }, { status: 400 });
    }
    const rangeMs = end.getTime() - start.getTime();
    if (rangeMs <= 0 || rangeMs > MAX_RANGE_MS) {
      return NextResponse.json({ error: 'Date range must be positive and no longer than 370 days' }, { status: 400 });
    }

    const data = await getRunePriceRange(start.toISOString(), end.toISOString());
    return NextResponse.json(
      { intervals: data },
      { headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800' } }
    );
  }

  return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
}
