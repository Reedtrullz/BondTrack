import { NextRequest, NextResponse } from 'next/server';
import { generateTaxReportWithWarnings, exportToCSV, parseTaxDateRange } from '@/lib/utils/tax-export';
import { noStorePrivateHeaders } from '@/lib/api/cors';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { normalizeTHORChainMainnetAddress } from '@/lib/utils/address-validation';

export const dynamic = 'force-dynamic';

const MAX_REQUESTS = 10;
const WINDOW_MS = 60 * 1000;
const MAX_BODY_BYTES = 2_048;
const TAX_REPORT_METHODS = ['POST', 'OPTIONS'];

interface TaxReportRequestBody {
  address?: string;
  startDate?: string;
  endDate?: string;
}

function taxReportHeaders(request: NextRequest): HeadersInit {
  return noStorePrivateHeaders(request, [], TAX_REPORT_METHODS);
}

function jsonError(request: NextRequest, error: string, status: number) {
  return NextResponse.json(
    { error },
    { status, headers: taxReportHeaders(request) }
  );
}

function isJsonRequest(request: NextRequest): boolean {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  return contentType.split(';')[0]?.trim() === 'application/json';
}

function requestBodyTooLarge(request: NextRequest): boolean {
  const rawLength = request.headers.get('content-length');
  if (!rawLength) return false;

  const contentLength = Number(rawLength);
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

export async function POST(request: NextRequest) {
  try {
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

    if (!isJsonRequest(request)) {
      return jsonError(request, 'Content-Type must be application/json', 415);
    }

    if (requestBodyTooLarge(request)) {
      return jsonError(request, 'Tax report request body is too large', 413);
    }

    let body: TaxReportRequestBody;

    try {
      body = (await request.json()) as TaxReportRequestBody;
    } catch {
      return jsonError(request, 'Malformed JSON body', 400);
    }

    const { address, startDate, endDate } = body;
    const normalizedAddress = typeof address === 'string'
      ? normalizeTHORChainMainnetAddress(address)
      : null;

    if (!normalizedAddress) {
      return jsonError(request, 'A valid THORChain mainnet address is required', 400);
    }

    if (!startDate || !endDate) {
      return jsonError(request, 'Start date and end date are required', 400);
    }

    parseTaxDateRange(startDate, endDate);

    const { rows, warnings } = await generateTaxReportWithWarnings(normalizedAddress, startDate, endDate);
    const csv = exportToCSV(rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        ...taxReportHeaders(request),
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=\"tax-worksheet-${normalizedAddress.slice(0, 8)}-${startDate}-to-${endDate}.csv\"`,
        'X-Heimdall-Tax-Warnings': warnings.length > 0 ? JSON.stringify(warnings) : '[]',
      },
    });
  } catch (error) {
    // Only surface known validation errors; generic message for everything else
    const message = error instanceof Error ? error.message : '';
    const isValidationError =
      message.includes('Dates must use YYYY-MM-DD format') ||
      message.includes('Invalid date range') ||
      message.includes('Start date must be before') ||
      message.includes('Tax worksheet range cannot exceed');
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
