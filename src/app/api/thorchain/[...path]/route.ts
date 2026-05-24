import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

const THORNODE_ENDPOINTS = [
  process.env.THORNODE_API_URL || 'https://gateway.liquify.com/chain/thorchain_api/thorchain',
];

const ALLOWED_PATHS = [
  /^nodes$/,
  /^node\/[A-Za-z0-9._:-]+$/,
  /^constants$/,
  /^supply$/,
  /^queue$/,
  /^network$/,
  /^lastblock$/,
  /^mimir$/,
  /^version$/,
  /^pools$/,
  /^pool\/[A-Za-z0-9._:-]+$/,
  /^pool\/[A-Za-z0-9._:-]+\/liquidity_provider\/[A-Za-z0-9._:-]+$/,
  /^balance\/[A-Za-z0-9._:-]+$/,
  /^tx\/[A-Za-z0-9._:-]+$/,
  /^actions$/,
  /^ping$/,
  /^health$/,
  /^stakers$/,
];

const MAX_REQUESTS = 300;
const WINDOW_MS = 60 * 1000;

export const dynamic = 'force-dynamic';

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATHS.some((pattern) => pattern.test(path));
}

function corsHeaders(request: NextRequest): HeadersInit {
  const origin = request.headers.get('origin');
  const allowedOrigins = new Set([
    'https://thorchain.no',
    'https://bond.thorchain.no',
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
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  // Tolerate clients that include a leading 'thorchain/' segment.
  // THORNODE_API_URL already ends in '/thorchain', so we strip one if present
  // to avoid building a double-prefixed upstream URL.
  const normalizedPath = path[0] === 'thorchain' ? path.slice(1) : path;

  const decodedPath = normalizedPath.join('/');
  const pathStr = normalizedPath.map((part) => encodeURIComponent(part)).join('/');
  const searchParams = request.nextUrl.search;

  // Rate limit
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`thorchain:${clientIp}`, MAX_REQUESTS, WINDOW_MS);
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

  if (!isAllowedPath(decodedPath)) {
    return NextResponse.json(
      { error: 'Proxy path is not allowed', path: decodedPath },
      { status: 403, headers: corsHeaders(request) }
    );
  }

  const errors: string[] = [];

  for (const baseUrl of THORNODE_ENDPOINTS) {
    const targetUrl = `${baseUrl}/${pathStr}${searchParams}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(targetUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        errors.push(`${baseUrl}: ${response.status}`);
        continue;
      }

      const data = await response.json();

      return NextResponse.json(data, {
        headers: corsHeaders(request),
      });
    } catch (error) {
      errors.push('Upstream request failed');
      continue;
    }
  }

  return NextResponse.json(
    { error: 'All THORNode endpoints failed', details: errors },
    { status: 502, headers: corsHeaders(request) }
  );
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    headers: corsHeaders(request),
  });
}
