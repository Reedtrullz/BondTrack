import { NextRequest, NextResponse } from 'next/server';

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

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATHS.some((pattern) => pattern.test(path));
}

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
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.map((part) => encodeURIComponent(part)).join('/');
  const decodedPath = path.join('/');
  const searchParams = request.nextUrl.search;

  if (!isAllowedPath(decodedPath)) {
    return NextResponse.json(
      { error: 'Proxy path is not allowed' },
      { status: 403, headers: corsHeaders(request) }
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
        headers: corsHeaders(request),
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      errors.push(`${baseUrl}: ${errMsg}`);
      continue;
    }
  }

  // If all failed, prefer returning a client error (400-499) if any endpoint said so, otherwise 502
  const clientError = statusCodes.find((code) => code >= 400 && code < 500);
  const finalStatus = clientError || 502;

  return NextResponse.json(
    { error: 'All Midgard endpoints failed', details: errors },
    { status: finalStatus, headers: corsHeaders(request) }
  );
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    headers: corsHeaders(request),
  });
}
