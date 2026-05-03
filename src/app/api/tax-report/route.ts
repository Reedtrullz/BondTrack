import { NextRequest, NextResponse } from 'next/server';
import { generateTaxReport, exportToCSV, parseTaxDateRange } from '@/lib/utils/tax-export';

export const dynamic = 'force-dynamic';

const THOR_ADDRESS_PATTERN = /^thor1[0-9a-z]{38,59}$/;

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
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    parseTaxDateRange(startDate, endDate);

    const rows = await generateTaxReport(address, startDate, endDate);
    const csv = exportToCSV(rows);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tax-report-${address.slice(0, 8)}-${startDate}-to-${endDate}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('date') || message.includes('Date') || message.includes('YYYY-MM-DD') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
