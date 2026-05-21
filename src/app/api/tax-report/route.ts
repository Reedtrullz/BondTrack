import { NextRequest, NextResponse } from 'next/server';
import { generateTaxReport, exportToCSV, parseTaxDateRange } from '@/lib/utils/tax-export';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

const THOR_ADDRESS_PATTERN = /^thor1[0-9a-z]{38,59}$/;

const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 1000;

function corsHeaders(_request?: NextRequest): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
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
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('date') || message.includes('Date') || message.includes('YYYY-MM-DD') ? 400 : 500;
    return NextResponse.json({ error: message }, { status, headers: corsHeaders(request) });
  }
}
