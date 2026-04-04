'use client';

import { useEffect, useState } from 'react';
import { getAllNodes } from '@/lib/api/thornode';
import { calculateBondRank } from '@/lib/utils/calculations';
import { formatRuneAmount } from '@/lib/utils/formatters';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import type { NodeRaw } from '@/lib/api/thornode';

interface NodeWithRank {
  nodeAddress: string;
  totalBond: string;
  status: string;
  rank: number;
  total: number;
  percentile: number;
  isAtRisk: boolean;
}

export function ChurnOutRisk() {
  const [nodes, setNodes] = useState<NodeRaw[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    async function fetchData() {
      try {
        const nodesData = await getAllNodes({ signal: abortController.signal });
        setNodes(nodesData);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to fetch node data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => {
      abortController.abort();
      clearInterval(interval);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="animate-pulse h-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="text-red-500 text-sm">Error: {error}</div>
      </div>
    );
  }

  const activeNodes = nodes.filter(n => n.status === 'Active' && n.total_bond);
  const sortedNodes = [...activeNodes].sort((a, b) => {
    const bondA = BigInt(a.total_bond || '0');
    const bondB = BigInt(b.total_bond || '0');
    return bondA > bondB ? -1 : bondA < bondB ? 1 : 0;
  });

  const nodesWithRank: NodeWithRank[] = sortedNodes.map((node, index) => {
    const rank = index + 1;
    const total = sortedNodes.length;
    const percentile = total > 0 ? ((total - rank + 1) / total) * 100 : 0;
    const atRisk = rank > Math.floor(total * 0.67);
    return {
      nodeAddress: node.node_address,
      totalBond: node.total_bond,
      status: node.status,
      rank,
      total,
      percentile,
      isAtRisk: atRisk,
    };
  });

  const atRiskNodes = nodesWithRank.filter(n => n.isAtRisk);
  const safeNodes = nodesWithRank.filter(n => !n.isAtRisk);

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Churn-Out Risk</h3>
        <TrendingDown className="w-4 h-4 text-zinc-400" />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 text-center">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">{atRiskNodes.length}</div>
          <div className="text-xs text-red-600 dark:text-red-400">At Risk (Bottom 33%)</div>
        </div>
        <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 text-center">
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{safeNodes.length}</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400">Safe</div>
        </div>
      </div>

      <div className="text-xs text-zinc-500 mb-3">
        Active nodes sorted by bond • Bottom 33% flagged as at risk for churn-out
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {nodesWithRank.slice(0, 10).map((node) => (
          <div key={node.nodeAddress} className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-800/50 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {node.nodeAddress.slice(0, 12)}...{node.nodeAddress.slice(-6)}
              </span>
              {node.isAtRisk && (
                <AlertTriangle className="w-3 h-3 text-red-500" />
              )}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-zinc-500">{formatRuneAmount(node.totalBond)} RUNE</span>
              <span className={node.isAtRisk ? 'text-red-600 dark:text-red-400 font-medium' : 'text-emerald-600 dark:text-emerald-400'}>
                #{node.rank}/{node.total}
              </span>
              <span className="text-zinc-400">{node.percentile.toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-zinc-500">
        Showing top 10 nodes by bond • {atRiskNodes.length} at risk of churn-out
      </div>
    </div>
  );
}
