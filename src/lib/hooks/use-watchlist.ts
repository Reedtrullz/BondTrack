'use client';

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'thornode-watcher-watchlist';

// THORChain address validation regex
// Mainnet addresses start with 'thor' and are Base58 encoded (42-62 chars)
function isValidTHORChainAddress(address: string): boolean {
  if (typeof address !== 'string' || address.length < 42 || address.length > 62) {
    return false;
  }
  // Basic THORChain address format: starts with 'thor' followed by Base58 characters
  return /^thor[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

// Sanitize and validate stored data
function sanitizeAddresses(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item): item is string => typeof item === 'string')
    .filter(isValidTHORChainAddress);
}

// Lazy initializer for watchlist addresses from localStorage
function getInitialAddresses(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return sanitizeAddresses(parsed);
    }
  } catch {}
  return [];
}

export function useWatchlist() {
  const [addresses, setAddresses] = useState<string[]>(getInitialAddresses);
  const [isLoaded] = useState(true);

  const saveToStorage = useCallback((newAddresses: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAddresses));
    } catch {}
  }, []);

  const addAddress = useCallback((address: string) => {
    if (!isValidTHORChainAddress(address)) return;
    setAddresses((prev) => {
      if (prev.includes(address)) return prev;
      const newAddresses = [...prev, address];
      saveToStorage(newAddresses);
      return newAddresses;
    });
  }, [saveToStorage]);

  const removeAddress = useCallback((address: string) => {
    if (!isValidTHORChainAddress(address)) return;
    setAddresses((prev) => {
      const newAddresses = prev.filter((a) => a !== address);
      saveToStorage(newAddresses);
      return newAddresses;
    });
  }, [saveToStorage]);

  const getAddresses = useCallback((): string[] => {
    return addresses;
  }, [addresses]);

  const isAddressSaved = useCallback((address: string): boolean => {
    return addresses.includes(address);
  }, [addresses]);

  return {
    addresses,
    isLoaded,
    addAddress,
    removeAddress,
    getAddresses,
    isAddressSaved,
  };
}