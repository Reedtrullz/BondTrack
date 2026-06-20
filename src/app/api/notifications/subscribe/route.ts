import { NextRequest, NextResponse } from 'next/server';
import { noStorePrivateHeaders } from '@/lib/api/cors';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { normalizeTHORChainMainnetAddress } from '@/lib/utils/address-validation';
import { getNotificationCapability } from '@/lib/notifications/push';
import {
  isBrowserPushSubscription,
  NotificationSubscriptionLimitError,
  upsertNotificationSubscription,
} from '@/lib/notifications/store';
import type { AlertPreferences } from '@/lib/alerts/types';

export const dynamic = 'force-dynamic';

const MAX_REQUESTS = 20;
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
  const rateLimit = checkRateLimit(`notifications-subscribe:${clientIp}`, MAX_REQUESTS, WINDOW_MS);
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

  const capability = getNotificationCapability();
  if (!capability.configured) {
    return jsonError(request, capability.reason ?? 'Background notifications are not configured', 503);
  }

  if (!isJsonRequest(request)) {
    return jsonError(request, 'Content-Type must be application/json', 415);
  }

  if (requestBodyTooLarge(request)) {
    return jsonError(request, 'Notification subscription request body is too large', 413);
  }

  let body: {
    address?: unknown;
    subscription?: unknown;
    preferences?: Partial<Record<keyof AlertPreferences, unknown>> | null;
  };

  try {
    body = await request.json() as typeof body;
  } catch {
    return jsonError(request, 'Malformed JSON body', 400);
  }

  const address = typeof body.address === 'string'
    ? normalizeTHORChainMainnetAddress(body.address)
    : null;
  if (!address) {
    return jsonError(request, 'A valid THORChain mainnet address is required', 400);
  }

  if (!isBrowserPushSubscription(body.subscription)) {
    return jsonError(request, 'A valid browser push subscription is required', 400);
  }

  let subscription: Awaited<ReturnType<typeof upsertNotificationSubscription>>;
  try {
    subscription = await upsertNotificationSubscription({
      address,
      subscription: body.subscription,
      preferences: body.preferences,
    });
  } catch (error) {
    if (error instanceof NotificationSubscriptionLimitError) {
      return jsonError(request, error.message, 429);
    }
    throw error;
  }

  return NextResponse.json({
    id: subscription.id,
    address: subscription.address,
    subscribed: true,
    lastCheckedAt: subscription.lastCheckedAt,
  }, { headers: headers(request) });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { headers: headers(request) });
}
