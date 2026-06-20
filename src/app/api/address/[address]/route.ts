import { NextRequest, NextResponse } from 'next/server';
import { getBondDetails, getActions } from '@/lib/api/midgard';
import type { ActionRaw, ActionsResponseRaw } from '@/lib/api/midgard';
import { noStorePrivateHeaders } from '@/lib/api/cors';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { normalizeTHORChainMainnetAddress } from '@/lib/utils/address-validation';
import { NETWORK } from '@/lib/config';

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

async function getPaginatedActions(address: string, actionLimit: number): Promise<ActionsResponseRaw> {
  const actions: ActionRaw[] = [];
  let totalActionCount: number | null = null;

  for (let offset = 0; offset < actionLimit; offset += NETWORK.MAX_ACTIONS_LIMIT) {
    const remaining = actionLimit - actions.length;
    const pageLimit = Math.min(NETWORK.MAX_ACTIONS_LIMIT, remaining);
    const page = await getActions(address, pageLimit, undefined, 'type', offset);
    const pageActions = page.actions ?? [];

    if (totalActionCount === null) {
      const parsedCount = Number(page.count);
      totalActionCount = Number.isFinite(parsedCount) && parsedCount >= 0 ? parsedCount : null;
    }

    actions.push(...pageActions.slice(0, pageLimit));

    if (
      pageActions.length < pageLimit ||
      pageActions.length === 0 ||
      actions.length >= actionLimit ||
      (totalActionCount !== null && actions.length >= totalActionCount)
    ) {
      break;
    }
  }

  return {
    actions,
    count: totalActionCount !== null ? String(totalActionCount) : String(actions.length),
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
    const limit = parseActionLimit(searchParams.get('limit'));

    if (!address) {
      return NextResponse.json({ error: 'Address parameter is required' }, { status: 400, headers: noStorePrivateHeaders(request) });
    }

    if (typeof limit === 'string') {
      return NextResponse.json({ error: limit }, { status: 400, headers: noStorePrivateHeaders(request) });
    }

    const normalizedAddress = normalizeTHORChainMainnetAddress(address);
    if (!normalizedAddress) {
      return NextResponse.json({ error: 'A valid THORChain mainnet address is required' }, { status: 400, headers: noStorePrivateHeaders(request) });
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

    const [bondDetails, actions] = await Promise.all([
      getBondDetails(normalizedAddress),
      getPaginatedActions(normalizedAddress, limit)
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
        affectedPools: action.pools || []
      };
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return NextResponse.json({
      address: normalizedAddress,
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
