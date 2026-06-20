'use client';

import { useEffect, useRef } from 'react';
import {
  buildPositionAlertEvents,
  toBondPositionAlertSnapshot,
  type BondPositionAlertSnapshot,
} from '@/lib/alerts/position-alerts';
import { getAlertPositionSnapshotStorageKey, readLocalStorageValue, writeLocalStorageValue } from '@/lib/storage/keys';
import { useBondPositions } from './use-bond-positions';
import type { AlertType } from './use-alerts';

interface BondPositionAlertChecks {
  triggerAlert: (type: AlertType, nodeAddress: string, message: string) => void;
}

function readStoredSnapshot(address: string): BondPositionAlertSnapshot[] | null {
  const storageKey = getAlertPositionSnapshotStorageKey(address);
  if (!storageKey) return null;

  try {
    const stored = readLocalStorageValue(storageKey);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed?.positions)) return null;

    const positions = parsed.positions.filter((position: Partial<BondPositionAlertSnapshot>) => (
      typeof position.nodeAddress === 'string' &&
      typeof position.status === 'string' &&
      typeof position.slashPoints === 'number' &&
      typeof position.isJailed === 'boolean'
    )) as BondPositionAlertSnapshot[];

    return positions.length > 0 ? positions : null;
  } catch {
    return null;
  }
}

function writeStoredSnapshot(address: string, positions: BondPositionAlertSnapshot[]): void {
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
  const previousPositionsRef = useRef<BondPositionAlertSnapshot[] | null>(null);
  const previousAddressRef = useRef<string | null>(null);

  useEffect(() => {
    if (!address) {
      previousAddressRef.current = null;
      previousPositionsRef.current = null;
      return;
    }

    if (isLoading || error) return;

    const currentSnapshots = positions.map(toBondPositionAlertSnapshot);
    let previousPositions = previousPositionsRef.current;

    if (previousAddressRef.current !== address) {
      previousAddressRef.current = address;
      previousPositions = readStoredSnapshot(address);
    }

    if (!previousPositions) {
      previousPositionsRef.current = currentSnapshots;
      writeStoredSnapshot(address, currentSnapshots);
      return;
    }

    for (const event of buildPositionAlertEvents(currentSnapshots, previousPositions)) {
      checks.triggerAlert(event.type, event.nodeAddress, event.message);
    }

    previousPositionsRef.current = currentSnapshots;
    writeStoredSnapshot(address, currentSnapshots);
  }, [address, checks, error, isLoading, positions]);
}
