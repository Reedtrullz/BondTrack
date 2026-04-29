import { describe, expect, it } from 'vitest';
import { exportToCSV, type TaxReportRow } from '../tax-export';

describe('exportToCSV', () => {
  it('exports headers and formatted rows', () => {
    const rows: TaxReportRow[] = [
      {
        date: '2024-04-24',
        type: 'bond',
        asset: 'RUNE',
        amountRune: 12.3456789,
        amountUSD: 1234.567,
        costBasis: 1000,
        gainLoss: 234.567,
      },
      {
        date: '2024-04-25',
        type: 'lp',
        asset: 'ATOM',
        amountRune: 1,
        amountUSD: 9.5,
        costBasis: 0,
        gainLoss: 9.5,
      },
    ];

    expect(exportToCSV(rows)).toBe(
      [
        'Date,Type,Asset,Amount_RUNE,Amount_USD,Cost_Basis,Gain_Loss',
        '2024-04-24,bond,RUNE,12.34567890,1234.57,1000.00,234.57',
        '2024-04-25,lp,ATOM,1.00000000,9.50,0.00,9.50',
      ].join('\n')
    );
  });

  it('preserves CSV-friendly formatting for simple row values', () => {
    const rows: TaxReportRow[] = [
      {
        date: '2024-05-01',
        type: 'bond',
        asset: 'RUNE',
        amountRune: 0.5,
        amountUSD: 1.25,
        costBasis: 1,
        gainLoss: 0.25,
      },
    ];

    expect(exportToCSV(rows)).toContain('2024-05-01,bond,RUNE,0.50000000,1.25,1.00,0.25');
  });

  it('escapes fields that contain commas or quotes', () => {
    const rows: TaxReportRow[] = [
      {
        date: '2024-05-01',
        type: 'bond',
        asset: 'RUNE,"SPECIAL"',
        amountRune: 1,
        amountUSD: 2,
        costBasis: 3,
        gainLoss: 4,
      },
    ];

    expect(exportToCSV(rows)).toBe(
      [
        'Date,Type,Asset,Amount_RUNE,Amount_USD,Cost_Basis,Gain_Loss',
        '2024-05-01,bond,"RUNE,""SPECIAL""",1.00000000,2.00,3.00,4.00',
      ].join('\n')
    );
  });

  it('returns only headers for empty rows', () => {
    expect(exportToCSV([])).toBe('Date,Type,Asset,Amount_RUNE,Amount_USD,Cost_Basis,Gain_Loss');
  });
});
