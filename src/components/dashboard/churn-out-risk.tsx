'use client';

import { useMemo, useState, useEffect } from 'react';
import { type BondPosition } from '@/lib/types/node';
import { useNodeRankings, type NodeRanking } from '@/lib/hooks/use-node-rankings';
import { formatRuneFromNumber } from '@/lib/utils/formatters';
import { AlertTriangle, TrendingDown, Clock, XCircle } from 'lucide-react';

interface NodeWithRank extends NodeRanking {
  totalBond: number;
  status: string;
}

interface ChurnOutRiskProps {
  positions: BondPosition[];
}

export function ChurnOutRisk({ positions }: ChurnOutRiskProps) {
  const rankings = useNodeRankings(positions);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  // Timeout for loading state to prevent endless loading
  useEffect(() => {
    if (rankings.length === 0 && positions.length > 0) {
      const timer = setTimeout(() => {
        setShowError(true);
      }, 10000); // Show error after 10 seconds

      return () => clearTimeout(timer);
    }
  }, [rankings, positions]);

  const nodesWithRank: NodeWithRank[] = useMemo(() => {
    if (rankings.length === 0) {
      return [];
    }

    return positions
      .filter((pos) => pos.status === 'Active')
      .map((position) => {
        const ranking = rankings.find((r) => r.nodeAddress === position.nodeAddress);
        if (!ranking) {
          return null;
        }
        return {
          ...ranking,
          totalBond: position.bondAmount,
          status: position.status,
        };
      })
      .filter((n): n is NodeWithRank => n !== null)
      .sort((a, b) => b.totalBond - a.totalBond);
  }, [positions, rankings]);

  const atRiskNodes = nodesWithRank.filter((n) => n.isAtRisk);
  const outsideBandNodes = nodesWithRank.filter((n) => !n.isAtRisk);
  const isLoading = rankings.length === 0 && positions.length > 0;
  const excludedActiveNodeCount = Math.max(
    0,
    ...rankings.map((ranking) => ranking.excludedActiveNodeCount ?? 0)
  );
  const excludedNodeNoun = excludedActiveNodeCount === 1 ? 'node' : 'nodes';

  if (error || showError) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Churn-Out Risk</h3>
          <XCircle className="w-4 h-4 text-zinc-400" />
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <XCircle className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">Unable to load churn risk data</p>
          <p className="text-zinc-500 dark:text-zinc-500 text-xs max-w-[200px] mt-2">
            There was an error loading node rankings. Please check your connection or try again later.
          </p>
          <button
            onClick={() => {
              setError(null);
              setShowError(false);
              // Trigger SWR revalidation
              // Note: Rankings are derived from useAllNodes, so we need to revalidate that
              // This is a limitation - we can't directly revalidate rankings
            }}
            className="mt-4 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Churn-Out Risk</h3>
          <Clock className="w-4 h-4 text-zinc-400" />
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-3 animate-pulse" />
          <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">Loading node rankings...</p>
          <p className="text-zinc-500 dark:text-zinc-500 text-xs max-w-[200px] mt-2">
            This may take a few seconds depending on network conditions.
          </p>
        </div>
      </div>
    );
  }

  if (nodesWithRank.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Churn-Out Risk</h3>
          <TrendingDown className="w-4 h-4 text-zinc-400" />
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <TrendingDown className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">No active nodes found</p>
          <p className="text-zinc-500 dark:text-zinc-500 text-xs max-w-[200px] mt-2">
            You have no active nodes currently bonded. Only active nodes are monitored for churn risk.
          </p>
          <p className="text-zinc-500 dark:text-zinc-500 text-xs max-w-[200px] mt-1">
            Check your bond positions or wait for nodes to become active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Churn-Out Risk</h3>
        <TrendingDown className="w-4 h-4 text-zinc-400" />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2 rounded bg-amber-50 dark:bg-amber-900/20 text-center">
          <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{atRiskNodes.length}</div>
          <div className="text-xs text-amber-700 dark:text-amber-300">Review Band</div>
        </div>
        <div className="p-2 rounded bg-sky-50 dark:bg-sky-950/30 text-center">
          <div className="text-lg font-bold text-sky-700 dark:text-sky-300">{outsideBandNodes.length}</div>
          <div className="text-xs leading-tight text-sky-700 dark:text-sky-300">Outside Review Band</div>
        </div>
        <div className="p-2 rounded bg-zinc-100 dark:bg-zinc-800 text-center">
          <div className="text-lg font-bold text-zinc-600 dark:text-zinc-400">{nodesWithRank.length}</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">Total</div>
        </div>
      </div>

      <div className="text-xs text-zinc-500 mb-3">
        Your active nodes sorted by bond • Bottom 33% are treated as the churn-risk band
      </div>
      {excludedActiveNodeCount > 0 ? (
        <p className="mb-3 text-xs text-amber-700 dark:text-amber-300">
          {excludedActiveNodeCount} active {excludedNodeNoun} had unusable bond source data and {excludedActiveNodeCount === 1 ? 'was' : 'were'} excluded from churn-risk rank.
        </p>
      ) : null}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {nodesWithRank.map((node) => (
          <div key={node.nodeAddress} className="flex flex-col gap-2 rounded bg-zinc-50 p-2 text-sm dark:bg-zinc-800/50 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {node.nodeAddress.slice(0, 12)}...{node.nodeAddress.slice(-6)}
              </span>
              {node.isAtRisk && (
                <AlertTriangle className="w-3 h-3 text-amber-500" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:justify-end">
              <span className="text-zinc-500">{formatRuneFromNumber(node.totalBond)} RUNE</span>
              <span className={node.isAtRisk ? 'text-amber-700 dark:text-amber-300 font-medium' : 'text-sky-700 dark:text-sky-300'}>
                #{node.rank}/{node.totalNodes}
              </span>
              <span className="text-zinc-400">{node.percentile}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-zinc-500">
        {atRiskNodes.length > 0
          ? `${atRiskNodes.length} active node${atRiskNodes.length === 1 ? ' is' : 's are'} in the churn-risk band.`
          : 'No active nodes are in the churn-risk band right now.'}
      </div>
    </div>
  );
}
