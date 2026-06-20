import { NextRequest, NextResponse } from 'next/server';
import { noStorePrivateHeaders } from '@/lib/api/cors';
import { getNotificationRunnerToken } from '@/lib/notifications/config';
import { runNotificationMonitorPass } from '@/lib/notifications/monitor';

export const dynamic = 'force-dynamic';

const METHODS = ['POST', 'OPTIONS'];

function headers(request: NextRequest): HeadersInit {
  return noStorePrivateHeaders(request, [], METHODS);
}

function hasBearerToken(request: NextRequest, expectedToken: string): boolean {
  const header = request.headers.get('authorization') ?? '';
  return header === `Bearer ${expectedToken}`;
}

export async function POST(request: NextRequest) {
  const expectedToken = getNotificationRunnerToken();
  if (!expectedToken || !hasBearerToken(request, expectedToken)) {
    return NextResponse.json(
      { error: 'Notification runner token required' },
      { status: 401, headers: headers(request) }
    );
  }

  await runNotificationMonitorPass();
  return NextResponse.json({ ok: true }, { headers: headers(request) });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { headers: headers(request) });
}
