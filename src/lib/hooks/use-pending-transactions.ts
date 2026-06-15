'use client';

import { useState, useEffect, useCallback } from 'react';
import { readLocalStorageValue, STORAGE_KEYS, writeLocalStorageValue } from '@/lib/storage/keys';

export interface PendingTransaction {
  txHash: string;
  type: 'BOND' | 'UNBOND';
  nodeAddress: string;
  amount: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

const STORAGE_KEY = STORAGE_KEYS.pendingTransactions;
const TIMEOUT_MS = 10 * 60 * 1000;

function isActivePendingTx(tx: PendingTransaction, now = Date.now()): boolean {
  const age = now - tx.timestamp;
  return age < TIMEOUT_MS && tx.status === 'pending';
}

// Lazy initializer for pending transactions from localStorage
function getInitialPendingTxs(): PendingTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = readLocalStorageValue(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as PendingTransaction[];
      return parsed.filter(tx => isActivePendingTx(tx));
    }
  } catch {
    // Corrupt or unavailable storage should not block in-memory transaction tracking.
  }
  return [];
}

function savePendingTxs(pendingTxs: PendingTransaction[]): void {
  try {
    writeLocalStorageValue(STORAGE_KEY, JSON.stringify(pendingTxs));
  } catch {
    // Corrupt or unavailable storage should not block in-memory transaction tracking.
  }
}

export function usePendingTransactions() {
  const [pendingTxs, setPendingTxs] = useState<PendingTransaction[]>(getInitialPendingTxs);

  useEffect(() => {
    const interval = setInterval(() => {
      setPendingTxs(current => {
        const validTxs = current.filter(tx => isActivePendingTx(tx));
        if (validTxs.length !== current.length) {
          savePendingTxs(validTxs);
        }
        return validTxs;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pendingTxs.length > 0) {
      savePendingTxs(pendingTxs);
    }
  }, [pendingTxs]);

  const addPendingTx = useCallback((tx: Omit<PendingTransaction, 'timestamp' | 'status'>) => {
    const newTx: PendingTransaction = {
      ...tx,
      timestamp: Date.now(),
      status: 'pending',
    };
    setPendingTxs(current => {
      const updated = [...current, newTx];
      savePendingTxs(updated);
      return updated;
    });
    return newTx;
  }, []);

  const updateTxStatus = useCallback((txHash: string, status: PendingTransaction['status']) => {
    setPendingTxs(current => {
      const updated = current.map(tx =>
        tx.txHash === txHash ? { ...tx, status } : tx
      ).filter(tx => isActivePendingTx(tx));
      savePendingTxs(updated);
      return updated;
    });
  }, []);

  const removePendingTx = useCallback((txHash: string) => {
    setPendingTxs(current => {
      const updated = current.filter(tx => tx.txHash !== txHash);
      savePendingTxs(updated);
      return updated;
    });
  }, []);

  const hasPendingTx = useCallback(() => pendingTxs.some(tx => isActivePendingTx(tx)), [pendingTxs]);

  return {
    pendingTxs,
    addPendingTx,
    updateTxStatus,
    removePendingTx,
    hasPendingTx,
  };
}
