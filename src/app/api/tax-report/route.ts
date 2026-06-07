import { NextRequest, NextResponse } from 'next/server';
import { generateTaxReport, exportToCSV, parseTaxDateRange } from '@/lib/utils/tax-export';
import { noStorePrivateHeaders } from '@/lib/api/cors';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

export const dynamic = 'force-dynamic';

const THOR_ADDRESS_PATTERN = /^thor1[0-9a-z]{38,59}$/;

const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 1000;
const TAX_REPORT_METHODS = ['POST', 'OPTIONS'];

function taxReportHeaders(request: NextRequest): HeadersInit {
  return noStorePrivateHeaders(request, [], TAX_REPORT_METHODS);
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
        { status: 400, headers: taxReportHeaders(request) }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400, headers: taxReportHeaders(request) }
      );
    }

    // Rate limit
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(`tax-report:${clientIp}`, MAX_REQUESTS, WINDOW_MS);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: {
          ...taxReportHeaders(request),
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
        ...taxReportHeaders(request),
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
      { status: isValidationError ? 400 : 500, headers: taxReportHeaders(request) }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    headers: taxReportHeaders(request),
  });
}
