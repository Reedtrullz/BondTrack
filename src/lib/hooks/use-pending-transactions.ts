'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PendingTransaction {
  txHash: string;
  type: 'BOND' | 'UNBOND';
  nodeAddress: string;
  amount: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

const STORAGE_KEY = 'thornode-watcher-pending-txs';
const TIMEOUT_MS = 10 * 60 * 1000;

// Lazy initializer for pending transactions from localStorage
function getInitialPendingTxs(): PendingTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as PendingTransaction[];
      return parsed.filter(tx => {
        const age = Date.now() - tx.timestamp;
        return age < TIMEOUT_MS && tx.status === 'pending';
      });
    }
  } catch (error) {
    console.error('Storage error while loading pending transactions:', error);
  }
  return [];
}

function savePendingTxs(pendingTxs: PendingTransaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingTxs));
  } catch (error) {
    console.error('Storage error while saving pending transactions:', error);
  }
}

export function usePendingTransactions() {
  const [pendingTxs, setPendingTxs] = useState<PendingTransaction[]>(getInitialPendingTxs);
  const [isLoaded] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    const interval = setInterval(() => {
      setPendingTxs(current => {
        const validTxs = current.filter(tx => {
          const age = Date.now() - tx.timestamp;
          return age < TIMEOUT_MS;
        });
        if (validTxs.length !== current.length) {
          savePendingTxs(validTxs);
        }
        return validTxs;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded && pendingTxs.length > 0) {
      savePendingTxs(pendingTxs);
    }
  }, [pendingTxs, isLoaded]);

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
      );
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

  const hasPendingTx = useCallback(() => pendingTxs.length > 0, [pendingTxs]);

  return {
    pendingTxs,
    isLoaded,
    addPendingTx,
    updateTxStatus,
    removePendingTx,
    hasPendingTx,
  };
}
