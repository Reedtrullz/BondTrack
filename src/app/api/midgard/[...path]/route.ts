import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

const MIDGARD_ENDPOINTS = [
  process.env.MIDGARD_API_URL || 'https://gateway.liquify.com/chain/thorchain_midgard',
  process.env.MIDGARD_FALLBACK_URL || 'https://midgard.thorchain.network',
];

const ALLOWED_PATHS = [
  /^v2\/health$/,
  /^v2\/bonds\/[A-Za-z0-9._:-]+$/,
  /^v2\/churns$/,
  /^v2\/history\/(earnings|rune)$/,
  /^v2\/network$/,
  /^v2\/actions$/,
  /^v2\/pools$/,
  /^v2\/pools\/[A-Za-z0-9._:-]+\/history$/,
  /^v2\/thorname\/(lookup|rlookup)\/[A-Za-z0-9._-]+$/,
  /^v2\/member\/[A-Za-z0-9._:-]+$/,
];

export const dynamic = 'force-dynamic';

const MAX_REQUESTS = 300;
const WINDOW_MS = 60 * 1000;
const SUCCESS_CACHE_CONTROL = 'public, max-age=30';

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATHS.some((pattern) => pattern.test(path));
}

function successHeaders(request: NextRequest): HeadersInit {
  return {
    ...corsHeaders(request, ['https://bond.thorchain.no']),
    'Cache-Control': SUCCESS_CACHE_CONTROL,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.map((part) => encodeURIComponent(part)).join('/');
  const decodedPath = path.join('/');
  const searchParams = request.nextUrl.search;

  // Rate limit
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`midgard:${clientIp}`, MAX_REQUESTS, WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: {
        ...corsHeaders(request, ['https://bond.thorchain.no']),
        'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        'X-RateLimit-Limit': String(MAX_REQUESTS),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
      }}
    );
  }

  if (!isAllowedPath(decodedPath)) {
    return NextResponse.json(
      { error: 'Proxy path is not allowed' },
      { status: 403, headers: corsHeaders(request, ['https://bond.thorchain.no']) }
    );
  }

  const errors: string[] = [];
  const statusCodes: number[] = [];
  for (const baseUrl of MIDGARD_ENDPOINTS) {
    const targetUrl = `${baseUrl}/${pathStr}${searchParams}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Heimdall/1.0',
        },
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        statusCodes.push(response.status);
        errors.push(`${baseUrl}: ${response.status}`);
        continue;
      }

      const data = await response.json();

      return NextResponse.json(data, {
        headers: successHeaders(request),
      });
    } catch {
      errors.push('Upstream request failed');
      continue;
    }
  }

  // If all failed, prefer returning a client error (400-499) if any endpoint said so, otherwise 502
  const clientError = statusCodes.find((code) => code >= 400 && code < 500);
  const finalStatus = clientError || 502;

  return NextResponse.json(
    { error: 'All Midgard endpoints failed', details: errors },
    { status: finalStatus, headers: corsHeaders(request, ['https://bond.thorchain.no']) }
  );
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    headers: corsHeaders(request, ['https://bond.thorchain.no']),
  });
}
