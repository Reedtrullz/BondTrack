import { useMemo } from 'react';
import useSWR from 'swr';
import { getAllNodes, type NodeRaw } from '@/lib/api/thornode';
import { LATEST_THORNODE_VERSION } from '@/lib/config';

function parseVersion(version: string | null | undefined): number[] | null {
  if (!version) return null;

  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;

  return match.slice(1).map((part) => Number(part));
}

function isVersionOlder(currentVersion: string, latestVersion: string): boolean {
  const current = parseVersion(currentVersion);
  const latest = parseVersion(latestVersion);

  if (!current || !latest) return false;

  for (let index = 0; index < 3; index += 1) {
    if (current[index] < latest[index]) return true;
    if (current[index] > latest[index]) return false;
  }

  return false;
}

function pickCurrentVersion(nodes: NodeRaw[] | undefined): string | null {
  if (!nodes?.length) return null;

  const activeNode = nodes.find((node) => node.status === 'Active');
  return activeNode?.version ?? nodes[0]?.version ?? null;
}

export function useProtocolVersion() {
  const { data, error, isLoading } = useSWR<NodeRaw[]>(
    'protocol-version',
    () => getAllNodes(),
    {
      refreshInterval: 60_000,
      errorRetryInterval: 10_000,
    }
  );

  const currentVersion = useMemo(() => pickCurrentVersion(data), [data]);
  const latestVersion = LATEST_THORNODE_VERSION;
  const hasUpgrade = Boolean(currentVersion) && isVersionOlder(currentVersion ?? '', latestVersion);

  return {
    currentVersion,
    latestVersion,
    hasUpgrade,
    isLoading: isLoading && !error,
  };
}
