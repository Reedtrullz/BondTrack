'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { NodeStatusCard } from '@/components/dashboard/node-status-card';
import { NetworkComparisonTable } from '@/components/dashboard/network-comparison-table';
import { DashboardCard } from '@/components/shared/dashboard-card';
import { ExportButton } from '@/components/shared/export-button';
import { NETWORK } from '@/lib/config';
import { formatRuneFromNumber, formatBasisPoints } from '@/lib/utils/formatters';
import type { BondPosition } from '@/lib/types/node';

type SortField = 'nodeAddress' | 'status' | 'bondAmount' | 'netAPY' | 'slashPoints' | 'operatorFee' | 'riskScore';

function calculateRiskScore(position: BondPosition): number {
  if (position.isJailed) return 100;
  return Math.min((position.slashPoints / NETWORK.SLASH_POINT_THRESHOLDS.critical) * 100, 100);
}

function getRowRiskClass(position: BondPosition): string {
  if (position.isJailed || position.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.critical) {
    return 'bg-red-50 dark:bg-red-950/30';
  }
  if (position.slashPoints >= NETWORK.SLASH_POINT_THRESHOLDS.warning) {
    return 'bg-amber-50 dark:bg-amber-950/30';
  }
  return '';
}

function SortHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  onSort: (field: SortField) => void;
}) {
  return (
    <th
      className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
      onClick={() => onSort(field)}
    >
      {label} {sortField === field && (sortDirection === 'asc' ? '↑' : '↓')}
    </th>
  );
}

export default function NodesPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading } = useBondPositions(address);

  const [sortField, setSortField] = React.useState<SortField>('riskScore');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

  const handleSort = React.useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDirection('asc');
      return field;
    });
  }, []);

  const sortedPositions = React.useMemo(() => {
    return [...positions].sort((left, right) => {
      let comparison = 0;

      switch (sortField) {
        case 'nodeAddress':
          comparison = left.nodeAddress.localeCompare(right.nodeAddress);
          break;
        case 'status':
          comparison = left.status.localeCompare(right.status);
          break;
        case 'bondAmount':
          comparison = left.bondAmount - right.bondAmount;
          break;
        case 'netAPY':
          comparison = left.netAPY - right.netAPY;
          break;
        case 'slashPoints':
          comparison = left.slashPoints - right.slashPoints;
          break;
        case 'operatorFee':
          comparison = left.operatorFee - right.operatorFee;
          break;
        case 'riskScore':
          comparison = calculateRiskScore(left) - calculateRiskScore(right);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [positions, sortField, sortDirection]);

  if (isLoading) {
    return <div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-48 rounded-lg bg-zinc-200 dark:bg-zinc-800" />)}</div>;
  }

  if (positions.length === 0) {
    return <p className="text-zinc-500">No bonded positions found.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Node Health</h2>
          {positions.length > 0 && <ExportButton bondPositions={positions} />}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {positions.map((pos) => (
            <NodeStatusCard key={pos.nodeAddress} position={pos} address={address} />
          ))}
        </div>
      </div>

      <DashboardCard>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">Node Comparison</h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Sortable overview of all bonded nodes. Rows are color-coded by risk: red for jailed or critical slash, amber for elevated slash points.
            </p>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
            <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-950/60">
              <tr>
                <SortHeader label="Node Address" field="nodeAddress" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Status" field="status" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Bond Amount" field="bondAmount" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="APY" field="netAPY" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Slash Points" field="slashPoints" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Operator Fee" field="operatorFee" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader label="Risk Score" field="riskScore" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900/50">
              {sortedPositions.map((position) => (
                <tr
                  key={position.nodeAddress}
                  className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${getRowRiskClass(position)}`}
                >
                  <td className="px-4 py-3 font-mono text-sm text-zinc-900 dark:text-zinc-100">
                    {position.nodeAddress.slice(0, 8)}...{position.nodeAddress.slice(-4)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                    {position.status}
                    {position.isJailed && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
                        Jailed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-zinc-900 dark:text-zinc-100">
                    {formatRuneFromNumber(position.bondAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-zinc-900 dark:text-zinc-100">
                    {position.netAPY.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-zinc-900 dark:text-zinc-100">
                    {position.slashPoints.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-zinc-900 dark:text-zinc-100">
                    {formatBasisPoints(position.operatorFee)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-zinc-900 dark:text-zinc-100">
                    {calculateRiskScore(position).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <NetworkComparisonTable address={address} />
    </div>
  );
}
