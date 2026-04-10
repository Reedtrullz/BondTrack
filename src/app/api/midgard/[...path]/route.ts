import { NextRequest, NextResponse } from 'next/server';

const MIDGARD_ENDPOINTS = [
  process.env.MIDGARD_API_URL || 'https://midgard.ninerealms.com',
  process.env.MIDGARD_FALLBACK_URL || 'https://gateway.liquify.com/chain/thorchain_midgard',
];

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const searchParams = request.nextUrl.search;

  const errors: string[] = [];

  for (const baseUrl of MIDGARD_ENDPOINTS) {
    const targetUrl = `${baseUrl}/${pathStr}${searchParams}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
        },
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      errors.push(`${baseUrl}: ${errMsg}`);
      continue;
    }
  }

  return NextResponse.json(
    { error: 'All Midgard endpoints failed', details: errors },
    { status: 502 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
}