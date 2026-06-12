'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAllNodes } from '@/lib/hooks/use-all-nodes';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { NodeExplorer } from '@/components/dashboard/node-explorer';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft, CheckCircle2, Filter, ArrowUpDown } from 'lucide-react';
import { scoreNodeCandidate } from '@/lib/dashboard/node-candidate-score';
import {
  getCandidateSortLabel,
  getDefaultCandidateSortOrder,
  sortNodeCandidates,
  type NodeCandidateSortField,
  type NodeCandidateSortOrder,
} from '@/lib/dashboard/node-candidate-sort';
import { runeToNumber } from '@/lib/utils/formatters';

type FeeFilter = 'all' | 'low' | 'medium' | 'high';

export default function ExplorerPage() {
  const address = useSearchParams().get('address');

  const { data: allNodes, isLoading, error } = useAllNodes();
  const { positions } = useBondPositions(address);

  const [feeFilter, setFeeFilter] = useState<FeeFilter>('all');
  const [sortField, setSortField] = useState<NodeCandidateSortField>('quality');
  const [sortOrder, setSortOrder] = useState<NodeCandidateSortOrder>(getDefaultCandidateSortOrder('quality'));
  // Calculate APY for each node (per-node calculation)
  const nodesWithAPY = useMemo(() => {
    if (!allNodes) return [];

    return allNodes
      .filter((n) => n.status === 'Active')
      .map((node) => {
        const totalBond = runeToNumber(node.total_bond);
        const award = runeToNumber(node.current_award || '0');
        const apy = totalBond > 0 ? (award * 146) / totalBond * 100 : 0;

        // Get operator fee
        const operatorFee = Number(node.bond_providers?.node_operator_fee || 0);
        const operatorFeePercent = operatorFee / 10000;

        // Adjusted APY after fee
        const adjustedAPY = apy * (1 - operatorFeePercent);

        const candidateScore = scoreNodeCandidate({
          adjustedAPY,
          totalBond,
          operatorFeePercent,
          slashPoints: node.slash_points,
          status: node.status,
          capacityTrust: 'unknown',
        });

        return {
          ...node,
          calculatedAPY: apy,
          adjustedAPY,
          operatorFee,
          operatorFeePercent,
          totalBond,
          isFullCapacity: undefined,
          candidateScore,
        };
      });
  }, [allNodes]);

  // Apply fee filter
  const feeFiltered = useMemo(() => {
    if (feeFilter === 'all') return nodesWithAPY;

    return nodesWithAPY.filter((node) => {
      const feePercent = node.operatorFeePercent * 100;
      if (feeFilter === 'low') return feePercent < 10;
      if (feeFilter === 'medium') return feePercent >= 10 && feePercent <= 20;
      if (feeFilter === 'high') return feePercent > 20;
      return true;
    });
  }, [nodesWithAPY, feeFilter]);

  // Apply sorting
  const sortedNodes = useMemo(() => {
    return sortNodeCandidates(feeFiltered, sortField, sortOrder);
  }, [feeFiltered, sortField, sortOrder]);
  const qualityCounts = useMemo(() => {
    return sortedNodes.reduce(
      (counts, node) => {
        counts[node.candidateScore.quality] += 1;
        return counts;
      },
      { Strong: 0, Watch: 0, Avoid: 0 } as Record<'Strong' | 'Watch' | 'Avoid', number>
    );
  }, [sortedNodes]);
  const bondReadyCount = qualityCounts.Strong + qualityCounts.Watch;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href={address ? `/dashboard/portfolio?address=${encodeURIComponent(address)}` : '/dashboard/portfolio'}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Portfolio
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !allNodes) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href={address ? `/dashboard/portfolio?address=${encodeURIComponent(address)}` : '/dashboard/portfolio'}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Portfolio
            </Button>
          </Link>
        </div>
        <div className="text-center py-12 text-zinc-500">
          Failed to load node data. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href={address ? `/dashboard/portfolio?address=${encodeURIComponent(address)}` : '/dashboard/portfolio'}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Node Discovery
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Rank bond candidates by quality, slash history, operator fee, and capacity trust
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">Showing {sortedNodes.length} nodes</span>
        </div>
      </div>

      <section
        aria-label="Candidate quality summary"
        className={`mb-6 rounded-xl border p-4 ${
          bondReadyCount > 0
            ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-100'
            : 'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-100'
        }`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            {bondReadyCount > 0 ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            )}
            <div>
              <h2 className="text-sm font-bold">
                {bondReadyCount > 0
                  ? `${bondReadyCount} candidate${bondReadyCount === 1 ? '' : 's'} are bond-ready enough to inspect`
                  : 'No bond-ready candidates in the current filter'}
              </h2>
              <p className="mt-1 text-sm opacity-85">
                {bondReadyCount > 0
                  ? 'Strong candidates can be prepared directly; Watch candidates still need fee, slash, and capacity review.'
                  : 'Every visible node is avoid-rated by the quality model. Inspect slash history and capacity before preparing any bond.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold md:min-w-72">
            <div className="rounded-lg bg-white/60 px-3 py-2 dark:bg-black/20">
              <div className="text-lg font-bold">{qualityCounts.Strong}</div>
              <div>Strong</div>
            </div>
            <div className="rounded-lg bg-white/60 px-3 py-2 dark:bg-black/20">
              <div className="text-lg font-bold">{qualityCounts.Watch}</div>
              <div>Watch</div>
            </div>
            <div className="rounded-lg bg-white/60 px-3 py-2 dark:bg-black/20">
              <div className="text-lg font-bold">{qualityCounts.Avoid}</div>
              <div>Avoid</div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters and Sorting */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Filters:</span>
        </div>

        {/* Fee Filter */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-zinc-500">Fee:</span>
          {(['all', 'low', 'medium', 'high'] as FeeFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setFeeFilter(filter)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                feeFilter === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {filter === 'all' ? 'All' : filter === 'low' ? '<10%' : filter === 'medium' ? '10-20%' : '>20%'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-zinc-500">Sort by:</span>
          {(['quality', 'apy', 'bond', 'slash', 'version'] as NodeCandidateSortField[]).map((field) => (
            <button
              key={field}
              onClick={() => {
                if (sortField === field) {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField(field);
                  setSortOrder(getDefaultCandidateSortOrder(field));
                }
              }}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                sortField === field
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {getCandidateSortLabel(field)}
              {sortField === field && (
                <ArrowUpDown className={`w-3 h-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Node Cards */}
      <NodeExplorer 
        nodes={sortedNodes}
        userAddress={address}
        positions={positions}
      />
    </div>
  );
}
