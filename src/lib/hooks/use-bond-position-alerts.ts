'use client';

import { useEffect, useRef } from 'react';
import type { BondPosition } from '@/lib/types/node';
import { getAlertPositionSnapshotStorageKey, readLocalStorageValue, writeLocalStorageValue } from '@/lib/storage/keys';
import { useBondPositions } from './use-bond-positions';
import type { AlertType } from './use-alerts';

interface BondPositionAlertChecks {
  checkSlash: (currentSlashPoints: number, previousSlashPoints: number, nodeAddress: string) => void;
  checkJail: (currentPosition: BondPosition, previousPosition: BondPosition | null, nodeAddress: string) => void;
  checkStatusChange: (currentStatus: string, previousStatus: string | null, nodeAddress: string) => void;
  triggerAlert: (type: AlertType, nodeAddress: string, message: string) => void;
}

function hasChurnRisk(position: BondPosition): boolean {
  return position.yieldGuardFlags?.includes('lowest_bond') ?? false;
}

function readStoredSnapshot(address: string): Map<string, BondPosition> | null {
  const storageKey = getAlertPositionSnapshotStorageKey(address);
  if (!storageKey) return null;

  try {
    const stored = readLocalStorageValue(storageKey);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed?.positions)) return null;

    const positions = parsed.positions.filter((position: Partial<BondPosition>) => (
      typeof position.nodeAddress === 'string' &&
      typeof position.status === 'string' &&
      typeof position.slashPoints === 'number' &&
      typeof position.isJailed === 'boolean'
    )) as BondPosition[];

    return positions.length > 0
      ? new Map(positions.map((position) => [position.nodeAddress, position]))
      : null;
  } catch {
    return null;
  }
}

function writeStoredSnapshot(address: string, positions: BondPosition[]): void {
  const storageKey = getAlertPositionSnapshotStorageKey(address);
  if (!storageKey) return;

  try {
    writeLocalStorageValue(storageKey, JSON.stringify({
      updatedAt: Date.now(),
      positions,
    }));
  } catch {
    // Snapshot persistence should never block live alert checks.
  }
}

export function useBondPositionAlerts(
  address: string | null,
  checks: BondPositionAlertChecks
) {
  const { positions, isLoading, error } = useBondPositions(address);
  const previousPositionsRef = useRef<Map<string, BondPosition> | null>(null);
  const previousAddressRef = useRef<string | null>(null);

  useEffect(() => {
    if (!address) {
      previousAddressRef.current = null;
      previousPositionsRef.current = null;
      return;
    }

    if (isLoading || error) return;

    const currentPositions = new Map(positions.map((position) => [position.nodeAddress, position]));
    let previousPositions = previousPositionsRef.current;

    if (previousAddressRef.current !== address) {
      previousAddressRef.current = address;
      previousPositions = readStoredSnapshot(address);
    }

    if (!previousPositions) {
      previousPositionsRef.current = currentPositions;
      writeStoredSnapshot(address, positions);
      return;
    }

    for (const position of positions) {
      const previous = previousPositions.get(position.nodeAddress) ?? null;
      if (!previous) continue;

      checks.checkSlash(position.slashPoints, previous.slashPoints, position.nodeAddress);
      checks.checkJail(position, previous, position.nodeAddress);
      checks.checkStatusChange(position.status, previous.status, position.nodeAddress);

      if (hasChurnRisk(position) && !hasChurnRisk(previous)) {
        checks.triggerAlert(
          'CHURN_RISK',
          position.nodeAddress,
          `Node ${position.nodeAddress.slice(0, 12)}... entered the low-bond churn risk set`
        );
      }
    }

    previousPositionsRef.current = currentPositions;
    writeStoredSnapshot(address, positions);
  }, [address, checks, error, isLoading, positions]);
}
