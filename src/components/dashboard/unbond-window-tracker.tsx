'use client';

import { useAllNodes } from '@/lib/hooks/use-all-nodes';
import { useNetworkConstants } from '@/lib/hooks/use-network-constants';
import { estimateNextChurn } from '@/lib/utils/calculations';
import { StatusBadge } from '@/components/shared/status-badge';
import type { BondPosition } from '@/lib/types/node';
import { Clock, Unlock, Lock, AlertCircle } from 'lucide-react';

interface NodeUnbondStatus {
  nodeAddress: string;
  status: string;
  signerMembership: string[] | null;
  isSigning: boolean;
  canUnbond: boolean;
}

function formatTimeRemaining(blocks: number): string {
  const totalSeconds = blocks * 6;
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function UnbondWindowTracker({ positions }: { positions: BondPosition[] }) {
  const { data: nodes, error: nodesError, isLoading: nodesLoading } = useAllNodes();
  const { constants, isLoading: constantsLoading, error: constantsError } = useNetworkConstants();

  const isLoadingFull = nodesLoading || constantsLoading;
  const error = nodesError?.message || constantsError?.message || null;

  if (isLoadingFull) {
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

  if (!positions || positions.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Unbond Window</h3>
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <Clock className="w-3.5 h-3.5" />
            <span>--</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Lock className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">No active bond positions</p>
          <p className="text-zinc-500 dark:text-zinc-500 text-xs max-w-[200px] mt-1">
            Bond RUNE to a Node Operator to start earning rewards and track your unbond window.
          </p>
        </div>
      </div>
    );
  }

  if (!nodes) {
    return (
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="animate-pulse h-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    );
  }

  const currentBlockHeight = constants?.last_observed_height || constants?.block_height || 0;

  const nodeSignerMap = new Map<string, string[] | null>();
  nodes.forEach(node => {
    nodeSignerMap.set(node.node_address, node.signer_membership);
  });

  const bondedPositions = positions.filter(p => p.status === 'Active' || p.status === 'Standby');
  
  const nodesWithUnbondStatus: NodeUnbondStatus[] = bondedPositions.map(pos => {
    const signerMembership = nodeSignerMap.get(pos.nodeAddress) ?? null;
    const isSigning = !!(signerMembership && signerMembership.length > 0);
    const canUnbond = pos.status === 'Standby' && isSigning;
    return {
      nodeAddress: pos.nodeAddress,
      status: pos.status,
      signerMembership,
      isSigning,
      canUnbond,
    };
  });

  const activeNodes = nodesWithUnbondStatus.filter(n => n.status === 'Active');
  const standbyNodes = nodesWithUnbondStatus.filter(n => n.status === 'Standby');
  const canUnbondCount = standbyNodes.filter(n => n.canUnbond).length;
  const cannotUnbondCount = standbyNodes.filter(n => !n.canUnbond).length;
  const nonSigningCount = nodesWithUnbondStatus.filter(n => !n.isSigning).length;

  const nextChurn = estimateNextChurn(currentBlockHeight);

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Unbond Window</h3>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Clock className="w-3.5 h-3.5" />
          <span>Next: {formatTimeRemaining(nextChurn.blocksRemaining)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2 rounded bg-zinc-100 dark:bg-zinc-800 text-center">
          <div className="text-lg font-bold text-zinc-600 dark:text-zinc-400">{activeNodes.length}</div>
          <div className="text-xs text-zinc-500">Active</div>
        </div>
        <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 text-center">
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{canUnbondCount}</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400">Can Unbond</div>
        </div>
        <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 text-center">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">{cannotUnbondCount + activeNodes.length}</div>
          <div className="text-xs text-red-600 dark:text-red-400">Locked</div>
        </div>
      </div>

      <div className="text-xs text-zinc-500 mb-3">
        {nonSigningCount} nodes not signing • unbond window opens on next churn
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {nodesWithUnbondStatus.slice(0, 10).map((node) => (
          <div key={node.nodeAddress} className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-800/50 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {node.nodeAddress.slice(0, 12)}...{node.nodeAddress.slice(-6)}
              </span>
              <StatusBadge status={node.status} />
            </div>
            <div className="flex items-center gap-2">
              {!node.isSigning && (
                <div className="flex items-center gap-1 text-xs text-orange-500" title="Node not signing">
                  <AlertCircle className="w-3 h-3" />
                </div>
              )}
              {node.canUnbond ? (
                <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <Unlock className="w-3 h-3" />
                  <span>Open</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <Lock className="w-3 h-3" />
                  <span>{node.status === 'Active' ? 'Active' : 'No Sign'}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-zinc-500">
        Standby nodes with signer membership can unbond • Active nodes cannot unbond
      </div>
    </div>
  );
}
