import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/api/cors';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_REQUESTS = 60;
const WINDOW_MS = 60 * 1000;

export async function GET(request: NextRequest) {
  // Rate limit
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`health:${clientIp}`, MAX_REQUESTS, WINDOW_MS);
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

  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.VERSION || 'unknown',
    },
    { headers: corsHeaders(request) }
  );
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    headers: corsHeaders(request),
  });
}
