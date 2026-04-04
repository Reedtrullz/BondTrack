'use client';

import { useEffect, useState } from 'react';
import { getAllNodes } from '@/lib/api/thornode';
import { estimateNextChurn } from '@/lib/utils/calculations';
import { StatusBadge } from '@/components/shared/status-badge';
import { Clock, Unlock, Lock, AlertCircle } from 'lucide-react';
import type { NodeRaw } from '@/lib/api/thornode';

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

export function UnbondWindowTracker() {
  const [nodes, setNodes] = useState<NodeRaw[]>([]);
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [nodesData, constantsData] = await Promise.all([
          getAllNodes(),
          fetch('https://gateway.liquify.com/chain/thorchain_api/thorchain/constants').then(r => r.json())
        ]);
        setNodes(nodesData);
        const blockHeight = constantsData?.int_64_values?.last_observed_height || constantsData?.int_64_values?.block_height || 0;
        setCurrentBlockHeight(blockHeight);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch node data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
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

  const bondedNodes = nodes.filter(n => n.status === 'Active' || n.status === 'Standby');
  
  const nodesWithUnbondStatus: NodeUnbondStatus[] = bondedNodes.map(node => {
    const isSigning = !!(node.signer_membership && node.signer_membership.length > 0);
    const canUnbond = node.status === 'Standby' && isSigning;
    return {
      nodeAddress: node.node_address,
      status: node.status,
      signerMembership: node.signer_membership,
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
