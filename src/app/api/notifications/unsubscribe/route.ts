import { NextRequest, NextResponse } from 'next/server';
import { noStorePrivateHeaders } from '@/lib/api/cors';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { normalizeTHORChainMainnetAddress } from '@/lib/utils/address-validation';
import { removeNotificationSubscription } from '@/lib/notifications/store';

export const dynamic = 'force-dynamic';

const MAX_REQUESTS = 30;
const WINDOW_MS = 60 * 1000;
const MAX_BODY_BYTES = 16 * 1024;
const METHODS = ['POST', 'OPTIONS'];

function headers(request: NextRequest): HeadersInit {
  return noStorePrivateHeaders(request, [], METHODS);
}

function jsonError(request: NextRequest, error: string, status: number) {
  return NextResponse.json(
    { error },
    { status, headers: headers(request) }
  );
}

function isJsonRequest(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  return contentType.split(';')[0]?.trim() === 'application/json';
}

function requestBodyTooLarge(request: NextRequest): boolean {
  const rawLength = request.headers.get('content-length');
  if (!rawLength) return false;

  const contentLength = Number(rawLength);
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`notifications-unsubscribe:${clientIp}`, MAX_REQUESTS, WINDOW_MS);
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

  if (!isJsonRequest(request)) {
    return jsonError(request, 'Content-Type must be application/json', 415);
  }

  if (requestBodyTooLarge(request)) {
    return jsonError(request, 'Notification unsubscribe request body is too large', 413);
  }

  let body: {
    address?: unknown;
    endpoint?: unknown;
    subscription?: { endpoint?: unknown };
  };

  try {
    body = await request.json() as typeof body;
  } catch {
    return jsonError(request, 'Malformed JSON body', 400);
  }

  const address = typeof body.address === 'string'
    ? normalizeTHORChainMainnetAddress(body.address)
    : null;
  const endpoint = typeof body.endpoint === 'string'
    ? body.endpoint
    : typeof body.subscription?.endpoint === 'string'
      ? body.subscription.endpoint
      : null;

  if (!address) {
    return jsonError(request, 'A valid THORChain mainnet address is required', 400);
  }

  if (!endpoint || !endpoint.startsWith('https://')) {
    return jsonError(request, 'A valid browser push endpoint is required', 400);
  }

  const removed = await removeNotificationSubscription({ address, endpoint });
  return NextResponse.json({ address, subscribed: false, removed }, { headers: headers(request) });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { headers: headers(request) });
}
