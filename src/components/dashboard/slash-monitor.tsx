'use client';

import { useEffect, useState } from 'react';
import { getAllNodes, getNetworkConstants } from '@/lib/api/thornode';
import { calculateJailBlocksRemaining, estimateNextChurn } from '@/lib/utils/calculations';
import { StatusBadge } from '@/components/shared/status-badge';
import { AlertTriangle, Clock } from 'lucide-react';
import type { NodeRaw } from '@/lib/api/thornode';

interface SlashNodeData {
  nodeAddress: string;
  status: string;
  slashPoints: number;
  isJailed: boolean;
  jailReleaseHeight: number;
  jailReason: string;
}

function getSlashSeverity(slashPoints: number): { level: 'ok' | 'warning' | 'critical'; label: string; color: string } {
  if (slashPoints >= 200) return { level: 'critical', label: 'Critical', color: 'text-red-600 dark:text-red-400' };
  if (slashPoints >= 50) return { level: 'warning', label: 'Warning', color: 'text-orange-600 dark:text-orange-400' };
  return { level: 'ok', label: 'OK', color: 'text-emerald-600 dark:text-emerald-400' };
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

export function SlashMonitor() {
  const [nodes, setNodes] = useState<NodeRaw[]>([]);
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    async function fetchData() {
      try {
        const [nodesData, constantsData] = await Promise.all([
          getAllNodes({ signal: abortController.signal }),
          getNetworkConstants({ signal: abortController.signal })
        ]);
        setNodes(nodesData);
        const blockHeight = constantsData?.int_64_values?.last_observed_height || constantsData?.int_64_values?.block_height || 0;
        setCurrentBlockHeight(blockHeight);
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

  const slashNodes: SlashNodeData[] = nodes.map((node) => ({
    nodeAddress: node.node_address,
    status: node.status,
    slashPoints: node.slash_points,
    isJailed: 'release_height' in node.jail && node.jail.release_height > 0,
    jailReleaseHeight: 'release_height' in node.jail ? node.jail.release_height : 0,
    jailReason: 'reason' in node.jail ? node.jail.reason : '',
  }));

  const sortedNodes = [...slashNodes].sort((a, b) => b.slashPoints - a.slashPoints);
  
  const criticalNodes = sortedNodes.filter(n => n.slashPoints >= 200);
  const warningNodes = sortedNodes.filter(n => n.slashPoints >= 50 && n.slashPoints < 200);
  const jailedNodes = sortedNodes.filter(n => n.isJailed);

  const nextChurn = estimateNextChurn(currentBlockHeight);

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Slash Point Monitor</h3>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Clock className="w-3.5 h-3.5" />
          <span>Next churn: {formatTimeRemaining(nextChurn.blocksRemaining)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 mb-4">
        <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 text-center">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">{criticalNodes.length}</div>
          <div className="text-xs text-red-600 dark:text-red-400">Critical</div>
        </div>
        <div className="p-2 rounded bg-orange-50 dark:bg-orange-900/20 text-center">
          <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{warningNodes.length}</div>
          <div className="text-xs text-orange-600 dark:text-orange-400">Warning</div>
        </div>
        <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 text-center">
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{jailedNodes.length}</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400">Jailed</div>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sortedNodes.slice(0, 10).map((node) => {
          const severity = getSlashSeverity(node.slashPoints);
          const jailBlocksRemaining = node.isJailed 
            ? calculateJailBlocksRemaining(node.jailReleaseHeight, currentBlockHeight)
            : 0;

          return (
            <div key={node.nodeAddress} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-800/50 text-sm gap-1 sm:gap-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 truncate">
                  {node.nodeAddress.slice(0, 12)}...{node.nodeAddress.slice(-6)}
                </span>
                <StatusBadge status={node.status} isJailed={node.isJailed} />
              </div>
              <div className="flex items-center gap-3 sm:gap-3 ml-0 sm:ml-auto">
                {node.isJailed && jailBlocksRemaining > 0 && (
                  <div className="flex items-center gap-1 text-xs text-red-500">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{formatTimeRemaining(jailBlocksRemaining)}</span>
                  </div>
                )}
                <span className={`font-medium ${severity.color}`}>
                  {node.slashPoints.toLocaleString()}
                </span>
                <span className={`text-xs ${severity.color}`}>{severity.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-zinc-500">
        Showing top 10 nodes by slash points • Severity: OK (0-49), Warning (50-199), Critical (200+)
      </div>
    </div>
  );
}
