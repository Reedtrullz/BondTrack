import { useMemo } from 'react';
import useSWR from 'swr';
import { getAllNodes, getThorchainVersion, type NodeRaw, type ThorchainVersionRaw } from '@/lib/api/thornode';

interface ProtocolVersionPayload {
  nodes?: NodeRaw[];
  networkVersion: ThorchainVersionRaw | null;
}

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

function normalizeVersion(version: string | null | undefined): string | null {
  return parseVersion(version) ? version?.trim() ?? null : null;
}

function pickLatestVersion(networkVersion: ThorchainVersionRaw | null): string | null {
  return (
    normalizeVersion(networkVersion?.next) ??
    normalizeVersion(networkVersion?.current) ??
    normalizeVersion(networkVersion?.querier)
  );
}

async function fetchProtocolVersionPayload(): Promise<ProtocolVersionPayload> {
  const [nodesResult, versionResult] = await Promise.allSettled([
    getAllNodes(),
    getThorchainVersion({ cache: 'no-store', retry: false }),
  ]);

  return {
    nodes: nodesResult.status === 'fulfilled' ? nodesResult.value : undefined,
    networkVersion: versionResult.status === 'fulfilled' ? versionResult.value : null,
  };
}

interface UseProtocolVersionOptions {
  enabled?: boolean;
}

export function useProtocolVersion({ enabled = true }: UseProtocolVersionOptions = {}) {
  const { data, error, isLoading } = useSWR<ProtocolVersionPayload>(
    enabled ? 'protocol-version' : null,
    fetchProtocolVersionPayload,
    {
      refreshInterval: 60_000,
      errorRetryInterval: 10_000,
    }
  );

  const currentVersion = useMemo(() => pickCurrentVersion(data?.nodes), [data?.nodes]);
  const latestVersion = useMemo(() => pickLatestVersion(data?.networkVersion ?? null), [data?.networkVersion]);
  const hasUpgrade = Boolean(currentVersion && latestVersion) && isVersionOlder(currentVersion ?? '', latestVersion ?? '');

  return {
    currentVersion,
    latestVersion,
    hasUpgrade,
    isLoading: enabled && isLoading && !error,
  };
}
