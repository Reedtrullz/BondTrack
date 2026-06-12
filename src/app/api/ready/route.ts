import { NextRequest, NextResponse } from 'next/server';
import { noStorePrivateHeaders } from '@/lib/api/cors';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { getHealth } from '@/lib/api/midgard';
import { getAllNodes } from '@/lib/api/thornode';

export const dynamic = 'force-dynamic';

const MAX_REQUESTS = 60;
const WINDOW_MS = 60 * 1000;
const READINESS_FETCH_INIT: RequestInit = { cache: 'no-store' };

type ReadyCheckStatus = 'ready' | 'degraded';

interface ReadyCheck {
  status: ReadyCheckStatus;
  latencyMs: number;
  detail?: string;
}

async function runCheck(name: 'midgard' | 'thornode'): Promise<ReadyCheck> {
  const startedAt = Date.now();

  try {
    if (name === 'midgard') {
      await getHealth(READINESS_FETCH_INIT);
    } else {
      await getAllNodes(READINESS_FETCH_INIT);
    }

    return {
      status: 'ready',
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      status: 'degraded',
      latencyMs: Date.now() - startedAt,
      detail: error instanceof Error ? error.message : 'Source check failed',
    };
  }
}

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`ready:${clientIp}`, MAX_REQUESTS, WINDOW_MS);
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

  const [midgard, thornode] = await Promise.all([
    runCheck('midgard'),
    runCheck('thornode'),
  ]);
  const status = midgard.status === 'ready' && thornode.status === 'ready' ? 'ready' : 'degraded';

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.VERSION || 'unknown',
      checks: { midgard, thornode },
    },
    {
      status: status === 'ready' ? 200 : 503,
      headers: noStorePrivateHeaders(request),
    }
  );
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    headers: noStorePrivateHeaders(request),
  });
}
