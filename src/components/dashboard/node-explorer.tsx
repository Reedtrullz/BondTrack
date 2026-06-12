import Link from 'next/link';
import { AlertTriangle, Check, ArrowRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NodeRaw } from '@/lib/api/thornode';
import { formatRuneFromNumber } from '@/lib/utils/formatters';
import type { NodeCandidateScore } from '@/lib/dashboard/node-candidate-score';

interface NodeExplorerProps {
  nodes: (NodeRaw & {
    calculatedAPY: number;
    adjustedAPY: number;
    operatorFee: number;
    operatorFeePercent: number;
    totalBond: number;
    candidateScore: NodeCandidateScore;
  })[];
  userAddress: string | null;
  positions: { nodeAddress: string }[];
}

export function NodeExplorer({ nodes, userAddress, positions }: NodeExplorerProps) {
  const isNodeBonded = (nodeAddress: string) => {
    return positions.some(p => p.nodeAddress === nodeAddress);
  };

  const buildQuickBondHref = (nodeAddress: string) => {
    const params = new URLSearchParams();
    if (userAddress) {
      params.set('address', userAddress);
    }
    params.set('action', 'bond');
    params.set('node', nodeAddress);
    return `/dashboard/transactions?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      {nodes.length === 0 && (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          No nodes match your filters. Try adjusting the fee filter.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {nodes.map((node) => {
          const bonded = isNodeBonded(node.node_address);
          const canPrepareBond = node.candidateScore.quality !== 'Avoid';
          const nodeDetailsHref = `/dashboard/nodes?address=${userAddress || ''}&node=${node.node_address}`;
          const qualityTone = node.candidateScore.quality === 'Strong'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
            : node.candidateScore.quality === 'Watch'
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
              : 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200';
          const bondActionClass = node.candidateScore.quality === 'Strong'
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-amber-600 text-white hover:bg-amber-700';

          return (
            <div
              key={node.node_address}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-md transition-all duration-300"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {node.node_address.slice(0, 12)}...{node.node_address.slice(-4)}
                    </span>
                    {bonded && (
                      <span className="px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full">
                        Bonded
                      </span>
                    )}
                    <span className={cn('px-2 py-0.5 text-xs font-bold rounded-full', qualityTone)}>
                      {node.candidateScore.quality} · {node.candidateScore.score}/100
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Version: {node.version}</p>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "text-xl font-bold font-mono",
                    node.adjustedAPY > 70 ? 'text-emerald-600 dark:text-emerald-400' :
                    node.adjustedAPY > 50 ? 'text-blue-600 dark:text-blue-400' :
                    node.adjustedAPY > 30 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  )}>
                    {node.adjustedAPY.toFixed(2)}%
                  </div>
                  <p className="text-xs text-zinc-500">Adj. APY</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div>
                  <p className="text-xs text-zinc-500">Total Bond</p>
                  <p className="font-mono text-zinc-900 dark:text-zinc-100">
                    {formatRuneFromNumber(node.totalBond)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Operator Fee</p>
                  <p className="font-mono text-zinc-900 dark:text-zinc-100">
                    {(node.operatorFeePercent * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Slash Points</p>
                  <p className={cn(
                    "font-mono",
                    node.slash_points === 0 ? 'text-emerald-600 dark:text-emerald-400' :
                    node.slash_points < 50 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  )}>
                    {node.slash_points.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Status</p>
                  <div className="flex items-center gap-1">
                    {node.status === 'Active' ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : node.status === 'Standby' ? (
                      <AlertTriangle className="w-3 h-3 text-yellow-500" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                    )}
                    <span className="text-zinc-900 dark:text-zinc-100">{node.status}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Capacity Trust</p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {node.candidateScore.trustLabel}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Quality Reason</p>
                  <p className="line-clamp-1 text-zinc-900 dark:text-zinc-100" title={node.candidateScore.reasons.join(', ')}>
                    {node.candidateScore.reasons[0]}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                {canPrepareBond ? (
                  <Link
                    href={buildQuickBondHref(node.node_address)}
                    className={cn('flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition', bondActionClass)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {node.candidateScore.quality === 'Strong' ? 'Quick Bond' : 'Review & Bond'}
                  </Link>
                ) : (
                  <Link
                    href={nodeDetailsHref}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Review risk first
                  </Link>
                )}
                <Link
                  href={nodeDetailsHref}
                  className="inline-flex items-center gap-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm transition"
                >
                  Details
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        Showing {nodes.length} nodes with average APY of{' '}
        <span className="font-mono font-medium">
          {nodes.length > 0
            ? (nodes.reduce((sum, n) => sum + n.adjustedAPY, 0) / nodes.length).toFixed(2)
            : '0.00'}%
        </span>
      </div>
    </div>
  );
}
