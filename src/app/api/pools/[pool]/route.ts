import { NextRequest, NextResponse } from 'next/server';
import { getEarningsHistory } from '@/lib/api/midgard';
import { noStorePrivateHeaders } from '@/lib/api/cors';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_REQUESTS = 30;
const WINDOW_MS = 60 * 1000;
const POOL_ASSET_PATTERN = /^[A-Z0-9]+\.[A-Z0-9]+(?:-[A-Z0-9]+)?$/i;
const MIN_POOL_LENGTH = 3;
const MAX_POOL_LENGTH = 128;

function isValidPoolIdentifier(pool: string): boolean {
  return pool.length >= MIN_POOL_LENGTH
    && pool.length <= MAX_POOL_LENGTH
    && POOL_ASSET_PATTERN.test(pool);
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
      return NextResponse.json({ error: 'Pool parameter is required' }, { status: 400, headers: noStorePrivateHeaders(request) });
    }

    if (!isValidPoolIdentifier(pool)) {
      return NextResponse.json({ error: 'Invalid THORChain pool identifier' }, { status: 400, headers: noStorePrivateHeaders(request) });
    }

    // Rate limit
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`pools:${clientIp}`, MAX_REQUESTS, WINDOW_MS);
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

    const earnings = await getEarningsHistory('day', 30);

    if (!earnings || !earnings.meta || !earnings.intervals) {
      return NextResponse.json({ error: 'Failed to fetch earnings data' }, { status: 500, headers: noStorePrivateHeaders(request) });
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
    }, { headers: noStorePrivateHeaders(request) });
  } catch (error) {
    console.error('Error fetching pool data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStorePrivateHeaders(request) });
  }
}
