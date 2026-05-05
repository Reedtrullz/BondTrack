import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.VERSION || process.env.npm_package_version || 'unknown',
    },
    { status: 200 }
  );
}
