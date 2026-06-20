import { NextRequest, NextResponse } from 'next/server';
import { noStorePrivateHeaders } from '@/lib/api/cors';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { normalizeTHORChainMainnetAddress } from '@/lib/utils/address-validation';
import { getNotificationCapability } from '@/lib/notifications/push';
import { summarizeNotificationMonitor } from '@/lib/notifications/store';

export const dynamic = 'force-dynamic';

const MAX_REQUESTS = 60;
const WINDOW_MS = 60 * 1000;
const METHODS = ['GET', 'OPTIONS'];

function headers(request: NextRequest): HeadersInit {
  return noStorePrivateHeaders(request, [], METHODS);
}

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`notifications-status:${clientIp}`, MAX_REQUESTS, WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: {
        ...headers(request),
        'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        'X-RateLimit-Limit': String(MAX_REQUESTS),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
      }}
    );
  }

  const rawAddress = request.nextUrl.searchParams.get('address');
  const address = rawAddress ? normalizeTHORChainMainnetAddress(rawAddress) : null;
  if (rawAddress && !address) {
    return NextResponse.json(
      { error: 'A valid THORChain mainnet address is required' },
      { status: 400, headers: headers(request) }
    );
  }

  const capability = getNotificationCapability();
  const monitor = await summarizeNotificationMonitor(address ?? undefined);

  return NextResponse.json({
    configured: capability.configured,
    monitor: {
      checkedSubscriptionCount: monitor.checkedSubscriptionCount,
      expiredSubscriptionCount: monitor.expiredSubscriptionCount,
      failedSubscriptionCount: monitor.failedSubscriptionCount,
      lastCheckedAt: monitor.lastCheckedAt,
      staleAfterMs: monitor.staleAfterMs,
      staleSubscriptionCount: monitor.staleSubscriptionCount,
      uncheckedSubscriptionCount: monitor.uncheckedSubscriptionCount,
    },
    publicKey: capability.publicKey,
    reason: capability.reason,
    subscriptionCount: monitor.subscriptionCount,
  }, { headers: headers(request) });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { headers: headers(request) });
}
