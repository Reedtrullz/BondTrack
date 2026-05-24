import { NextRequest, NextResponse } from 'next/server';
import { getBondDetails, getActions } from '@/lib/api/midgard';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

// Increase default limit to get more history for tax calculations
const DEFAULT_ACTION_LIMIT = 500;

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
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: pathAddress } = await params;
    const { searchParams } = new URL(request.url);
    const address = pathAddress || searchParams.get('address');
    const limit = parseInt(searchParams.get('limit') || String(DEFAULT_ACTION_LIMIT), 10);

    if (!address) {
      return NextResponse.json({ error: 'Address parameter is required' }, { status: 400, headers: corsHeaders(request) });
    }

    // Rate limit
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`address:${clientIp}`, MAX_REQUESTS, WINDOW_MS);
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

    // Validate THORChain address format
    if (!/^thor1[ac-hj-np-z02-9]{38,}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid THORChain address format' }, { status: 400, headers: corsHeaders(request) });
    }

    const [bondDetails, actions] = await Promise.all([
      getBondDetails(address),
      getActions(address, Math.min(limit, 1000)) // Cap at 1000 for safety
    ]);

    const bondActions = actions.actions.filter(action => {
      const memo = action.memo?.toUpperCase() || '';
      return memo.startsWith('BOND:') || memo.startsWith('UNBOND:');
    });

    const parsedActions = bondActions.map(action => {
      const memo = action.memo?.toUpperCase() || '';
      const type: 'BOND' | 'UNBOND' = memo.startsWith('BOND:') ? 'BOND' : 'UNBOND';

      const runeCoin = action.tx?.coins?.find((c: { asset: string }) => c.asset === 'THOR.RUNE');
      const amount = runeCoin ? parseFloat(runeCoin.amount) : 0;
      const parts = memo.split(':');
      const nodeAddress = parts[1] || action.tx?.address || '';

      return {
        type,
        amount,
        nodeAddress,
        timestamp: new Date(Number(BigInt(action.date) / 1000000n)),
        txHash: action.tx?.txID || '',
        status: action.status || 'unknown',
        pools: action.pools || []
      };
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return NextResponse.json({
      address,
      bondDetails,
      actions: parsedActions,
      totalBond: bondDetails.totalBonded,
      nodeCount: bondDetails.nodes.length,
      actionCount: parsedActions.length
    }, { headers: corsHeaders(request) });
  } catch (error) {
    console.error('Error fetching address data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders(request) });
  }
}
