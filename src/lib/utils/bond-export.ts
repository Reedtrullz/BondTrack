import type { BondPosition } from '@/lib/types/node';
import { formatRuneFromNumber } from '@/lib/utils/formatters';

function escapeCsvValue(value: string | number | boolean | null | undefined): string {
  const normalized = value === null || value === undefined ? '' : String(value);

  if (/[",\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

export function generateBondCsv(positions: BondPosition[]): string {
  const headers = [
    'Node Address',
    'Status',
    'Bond Amount',
    'Bond Share %',
    'APY',
    'Slash Points',
    'Operator Fee',
    'Jailed',
    'Version',
  ];

  const rows = positions.map((position) => [
    position.nodeAddress,
    position.status,
    formatRuneFromNumber(position.bondAmount),
    `${position.bondSharePercent.toFixed(2)}%`,
    `${position.netAPY.toFixed(2)}%`,
    position.slashPoints.toFixed(0),
    `${(position.operatorFee / 100).toFixed(2)}%`,
    position.isJailed ? 'Yes' : 'No',
    position.version,
  ].map(escapeCsvValue).join(','));

  return [headers.map(escapeCsvValue).join(','), ...rows].join('\n');
}

export function downloadBondCsv(positions: BondPosition[], filename?: string): void {
  if (positions.length === 0) {
    return;
  }

  const csv = generateBondCsv(positions);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename ?? `bond-positions-${new Date().toISOString().split('T')[0]}.csv`;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => URL.revokeObjectURL(url), 0);
}
