'use client';

import { useEffect, useState, useCallback } from 'react';
import { readLocalStorageValue, STORAGE_KEYS, writeLocalStorageValue } from '@/lib/storage/keys';
import { isValidTHORChainAddress } from '@/lib/utils/address-validation';

const STORAGE_KEY = STORAGE_KEYS.watchlist;

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
    const stored = readLocalStorageValue(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return sanitizeAddresses(parsed);
    }
  } catch {
    // Corrupt or unavailable storage should not block the in-memory watchlist.
  }
  return [];
}

export function useWatchlist() {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setAddresses(getInitialAddresses());
    setIsLoaded(true);
  }, []);

  const saveToStorage = useCallback((newAddresses: string[]) => {
    try {
      writeLocalStorageValue(STORAGE_KEY, JSON.stringify(newAddresses));
    } catch {
      // Corrupt or unavailable storage should not block the in-memory watchlist.
    }
  }, []);

  const addAddress = useCallback((address: string) => {
    if (!isValidTHORChainAddress(address)) return;
    setAddresses((prev) => {
      const newAddresses = [...prev.filter((savedAddress) => savedAddress !== address), address];
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

  const clearAddresses = useCallback(() => {
    setAddresses([]);
    saveToStorage([]);
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
    clearAddresses,
    getAddresses,
    isAddressSaved,
  };
}
