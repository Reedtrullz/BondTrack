import { NextRequest, NextResponse } from 'next/server';
import { generateTaxReport, exportToCSV } from '@/lib/utils/tax-export';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      address?: string;
      startDate?: string;
      endDate?: string;
    };

    const { address, startDate, endDate } = body;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
