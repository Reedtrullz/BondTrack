'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAllNodes } from '@/lib/hooks/use-all-nodes';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { NodeExplorer } from '@/components/dashboard/node-explorer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Filter, ArrowUpDown } from 'lucide-react';
import type { NodeRaw } from '@/lib/api/thornode';
import { runeToNumber } from '@/lib/utils/formatters';

type SortField = 'apy' | 'bond' | 'slash' | 'version';
type SortOrder = 'asc' | 'desc';
type FeeFilter = 'all' | 'low' | 'medium' | 'high';

export default function ExplorerPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');

  const { data: allNodes, isLoading, error } = useAllNodes();
  const { positions } = useBondPositions(address);

  const [feeFilter, setFeeFilter] = useState<FeeFilter>('all');
  const [sortField, setSortField] = useState<SortField>('apy');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFullCapacity, setShowFullCapacity] = useState(true);

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

        return {
          ...node,
          calculatedAPY: apy,
          adjustedAPY,
          operatorFee,
          operatorFeePercent,
          totalBond,
          isFullCapacity: false, // TODO: determine from provider count vs limit
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
    const sorted = [...feeFiltered].sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case 'apy':
          aVal = a.adjustedAPY;
          bVal = b.adjustedAPY;
          break;
        case 'bond':
          aVal = a.totalBond;
          bVal = b.totalBond;
          break;
        case 'slash':
          aVal = a.slash_points;
          bVal = b.slash_points;
          break;
        case 'version':
          aVal = a.version;
          bVal = b.version;
          break;
      }

      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    return sorted;
  }, [feeFiltered, sortField, sortOrder]);

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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Node Discovery
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Browse top-performing nodes and find your next bonding opportunity
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">Showing {sortedNodes.length} nodes</span>
        </div>
      </div>

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
          {(['apy', 'bond', 'slash', 'version'] as SortField[]).map((field) => (
            <button
              key={field}
              onClick={() => {
                if (sortField === field) {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField(field);
                  setSortOrder('desc');
                }
              }}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                sortField === field
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {field === 'apy' ? 'APY' : field === 'bond' ? 'Bond' : field === 'slash' ? 'Slash' : 'Version'}
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
