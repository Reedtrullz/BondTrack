import { NextRequest, NextResponse } from 'next/server';
import { getEarningsHistory } from '@/lib/api/midgard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pool = searchParams.get('pool');
    
    if (!pool) {
      return NextResponse.json({ error: 'Pool parameter is required' }, { status: 400 });
    }

    const earnings = await getEarningsHistory('day', 30);
    
    if (!earnings || !earnings.meta || !earnings.intervals) {
      return NextResponse.json({ error: 'Failed to fetch earnings data' }, { status: 500 });
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
      pool: pool,
      meta: poolData,
      intervals: poolIntervals,
      totalPooledRune: earnings.meta.pools.length > 0 ? earnings.meta.pools[0].totalLiquidityFeesRune : '0',
      totalNetworkBond: earnings.meta.bondingEarnings
    });
  } catch (error) {
    console.error('Error fetching pool data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}