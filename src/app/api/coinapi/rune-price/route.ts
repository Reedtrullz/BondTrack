import { NextRequest, NextResponse } from 'next/server';
import { getRunePriceAtDate, getRunePriceRange } from '@/lib/api/coinapi';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const timeStart = searchParams.get('timeStart');
  const timeEnd = searchParams.get('timeEnd');

  if (date) {
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
    const price = await getRunePriceAtDate(targetDate);
    if (price === null) {
      return NextResponse.json({ error: 'Price not available' }, { status: 404 });
    }
    return NextResponse.json({ price, date: targetDate.toISOString().slice(0, 10) });
  }

  if (timeStart && timeEnd) {
    const data = await getRunePriceRange(timeStart, timeEnd);
    return NextResponse.json({ intervals: data });
  }

  return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
}