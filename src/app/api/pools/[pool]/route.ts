import { NextRequest, NextResponse } from 'next/server';
import { getEarningsHistory } from '@/lib/api/midgard';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_REQUESTS = 30;
const WINDOW_MS = 60 * 1000;

function corsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get('origin');
  const allowedOrigins = new Set([
    'https://thorchain.no',
    'https://dev.thorchain.no',
    'http://localhost:3000',
    'http://localhost:3001',
  ]);

  if (process.env.NEXT_PUBLIC_APP_URL) allowedOrigins.add(process.env.NEXT_PUBLIC_APP_URL);
  if (process.env.VERCEL_URL) allowedOrigins.add(`https://${process.env.VERCEL_URL}`);

  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.has(origin) ? origin : 'https://thorchain.no',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Vary': 'Origin',
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pool: string }> }
) {
  try {
    const { pool: pathPool } = await params;
    const { searchParams } = new URL(request.url);
    const pool = pathPool || searchParams.get('pool');

    if (!pool) {
      return NextResponse.json({ error: 'Pool parameter is required' }, { status: 400, headers: corsHeaders(request) });
    }

    // Rate limit
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`pools:${clientIp}`, MAX_REQUESTS, WINDOW_MS);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: {
          ...corsHeaders(request),
          'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(MAX_REQUESTS),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
        }}
      );
    }

    const earnings = await getEarningsHistory('day', 30);

    if (!earnings || !earnings.meta || !earnings.intervals) {
      return NextResponse.json({ error: 'Failed to fetch earnings data' }, { status: 500, headers: corsHeaders(request) });
    }

    const poolData = earnings.meta.pools.find(p => p.pool === pool);
    const poolIntervals = earnings.intervals.map(interval => {
      const poolInterval = interval.pools.find(p => p.pool === pool);
      return {
        startTime: interval.startTime,
        endTime: interval.endTime,
        assetLiquidityFees: poolInterval?.assetLiquidityFees,
        runeLiquidityFees: poolInterval?.runeLiquidityFees,
        totalLiquidityFeesRune: poolInterval?.totalLiquidityFeesRune,
        saverEarning: poolInterval?.saverEarning,
        rewards: poolInterval?.rewards,
        earnings: poolInterval?.earnings
      };
    }).filter(interval => interval.assetLiquidityFees !== undefined);

    return NextResponse.json({
      pool,
      meta: poolData,
      intervals: poolIntervals,
      totalPooledRune: earnings.meta.pools.length > 0 ? earnings.meta.pools[0].totalLiquidityFeesRune : '0',
      totalNetworkBond: earnings.meta.bondingEarnings
    }, { headers: corsHeaders(request) });
  } catch (error) {
    console.error('Error fetching pool data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders(request) });
  }
}
