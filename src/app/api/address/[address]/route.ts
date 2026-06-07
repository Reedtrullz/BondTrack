import { NextRequest, NextResponse } from 'next/server';
import { getBondDetails, getActions } from '@/lib/api/midgard';
import { noStorePrivateHeaders } from '@/lib/api/cors';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { isValidTHORChainAddress } from '@/lib/utils/address-validation';

// Increase default limit to get more history for tax calculations
const DEFAULT_ACTION_LIMIT = 500;

export const dynamic = 'force-dynamic';

const MAX_REQUESTS = 30;
const WINDOW_MS = 60 * 1000;
const MAX_ACTION_LIMIT = 1000;

function parseActionLimit(value: string | null): number | string {
  if (value === null) return DEFAULT_ACTION_LIMIT;
  if (!/^\d+$/.test(value)) return 'limit must be a whole number';
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_ACTION_LIMIT) {
    return `limit must be between 1 and ${MAX_ACTION_LIMIT}`;
  }
  return parsed;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address: pathAddress } = await params;
    const { searchParams } = new URL(request.url);
    const address = pathAddress || searchParams.get('address');
    const limit = parseActionLimit(searchParams.get('limit'));

    if (!address) {
      return NextResponse.json({ error: 'Address parameter is required' }, { status: 400, headers: noStorePrivateHeaders(request) });
    }

    if (typeof limit === 'string') {
      return NextResponse.json({ error: limit }, { status: 400, headers: noStorePrivateHeaders(request) });
    }

    // Rate limit
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`address:${clientIp}`, MAX_REQUESTS, WINDOW_MS);
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

    // Validate THORChain address format
    if (!isValidTHORChainAddress(address)) {
      return NextResponse.json({ error: 'Invalid THORChain address format' }, { status: 400, headers: noStorePrivateHeaders(request) });
    }

    const [bondDetails, actions] = await Promise.all([
      getBondDetails(address),
      getActions(address, limit)
    ]);

    const bondActions = actions.actions.filter(action => {
      const memo = action.memo?.toUpperCase() || '';
      return memo.startsWith('BOND:') || memo.startsWith('UNBOND:');
    });

    const parsedActions = bondActions.map(action => {
      const memo = action.memo?.toUpperCase() || '';
      const type: 'BOND' | 'UNBOND' = memo.startsWith('BOND:') ? 'BOND' : 'UNBOND';

      const runeCoin = action.tx?.coins?.find((c: { asset: string }) => c.asset === 'THOR.RUNE');
      const amountBaseUnits = runeCoin?.amount ?? '0';
      const amountRune = (() => {
        try {
          return Number(BigInt(amountBaseUnits)) / 1e8;
        } catch {
          return 0;
        }
      })();
      const parts = memo.split(':');
      const nodeAddress = parts[1] || action.tx?.address || '';

      return {
        type,
        amountBaseUnits,
        amountRune,
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
    }, { headers: noStorePrivateHeaders(request) });
  } catch (error) {
    console.error('Error fetching address data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: noStorePrivateHeaders(request) });
  }
}
