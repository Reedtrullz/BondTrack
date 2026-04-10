import { NextRequest, NextResponse } from 'next/server';

const THORNODE_ENDPOINTS = [
  process.env.THORNODE_API_URL || 'https://gateway.liquify.com/chain/thorchain_api',
];

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const searchParams = request.nextUrl.search;

  for (const baseUrl of THORNODE_ENDPOINTS) {
    const targetUrl = `${baseUrl}/${pathStr}${searchParams}`;
    
    try {
      const response = await fetch(targetUrl, {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) continue;

      const data = await response.json();
      
      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Accept',
        },
      });
    } catch (error) {
      continue;
    }
  }

  return NextResponse.json(
    { error: 'All THORNode endpoints failed' },
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