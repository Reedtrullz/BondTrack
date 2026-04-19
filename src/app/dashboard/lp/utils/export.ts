// Export positions to CSV
export const handleExport = (positions: any[], address: string | null) => {
  if (positions.length === 0) return;

  const headers = [
    'Pool',
    'RUNE Deposit',
    'Asset Deposit',
    'Ownership %',
    'Withdrawable RUNE',
    'Withdrawable Asset',
    'Net PnL',
    'Impermanent Loss %',
    'Pool APY',
    'Status',
  ];

  const rows = positions.map((p) => [
    p.pool,
    p.runeDeposit,
    p.asset2Deposit,
    `${p.ownershipPercent.toFixed(2)}%`,
    p.runeWithdrawable,
    p.asset2Withdrawable,
    p.netProfitLoss,
    `${p.impermanentLossPercent.toFixed(2)}%`,
    `${p.poolApy.toFixed(2)}%`,
    p.poolStatus,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `lp-positions-${address || 'export'}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

