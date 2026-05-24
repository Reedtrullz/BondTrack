import { NextRequest, NextResponse } from 'next/server';
import { generateTaxReport, exportToCSV, parseTaxDateRange } from '@/lib/utils/tax-export';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

const THOR_ADDRESS_PATTERN = /^thor1[0-9a-z]{38,59}$/;

const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 1000;

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Vary': 'Origin',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      address?: string;
      startDate?: string;
      endDate?: string;
    };

    const { address, startDate, endDate } = body;

    if (!address || typeof address !== 'string' || !THOR_ADDRESS_PATTERN.test(address)) {
      return NextResponse.json(
        { error: 'A valid THORChain address is required' },
        { status: 400, headers: corsHeaders(request) }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400, headers: corsHeaders(request) }
      );
    }

    // Rate limit
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`tax-report:${clientIp}`, MAX_REQUESTS, WINDOW_MS);
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

    parseTaxDateRange(startDate, endDate);

    const rows = await generateTaxReport(address, startDate, endDate);
    const csv = exportToCSV(rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        ...corsHeaders(request),
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=\"tax-report-${address.slice(0, 8)}-${startDate}-to-${endDate}.csv\"`,
      },
    });
  } catch (error) {
    // Only surface known validation errors; generic message for everything else
    const message = error instanceof Error ? error.message : '';
    const isValidationError =
      message.includes('Dates must use YYYY-MM-DD format') ||
      message.includes('Invalid date range') ||
      message.includes('Start date must be before');
    return NextResponse.json(
      { error: isValidationError ? message : 'Internal server error' },
      { status: isValidationError ? 400 : 500, headers: corsHeaders(request) }
    );
  }
}
