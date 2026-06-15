'use client';

import { createContext, createElement, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import '@/lib/types/wallet';
import { readLocalStorageValue, removeLocalStorageValue, STORAGE_KEYS, writeLocalStorageValue } from '@/lib/storage/keys';
import { THORCHAIN_MAINNET_CHAIN_ID } from '@/lib/thorchain';

export type WalletType = 'keplr' | 'xdefi' | 'vultisig' | null;

export interface WalletState {
  address: string | null;
  walletType: WalletType;
  chainId: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export interface NetworkMismatch {
  hasMismatch: boolean;
  expected: string;
  actual: string | null;
}

const THORCHAIN_CHAIN_ID = THORCHAIN_MAINNET_CHAIN_ID;

interface VultisigWindow {
  thorchain?: {
    request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  };
}

declare global {
  interface Window {
    vultisig?: VultisigWindow;
  }
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    walletType: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const [networkMismatch, setNetworkMismatch] = useState<NetworkMismatch>({
    hasMismatch: false,
    expected: THORCHAIN_CHAIN_ID,
    actual: null,
  });

  const mountedRef = useRef(false);

  const getExpectedChainId = useCallback(() => {
    return THORCHAIN_CHAIN_ID;
  }, []);

  const checkNetworkMismatch = useCallback((actualChainId: string | null) => {
    const expected = getExpectedChainId();
    const hasMismatch = actualChainId !== null && actualChainId !== expected;
    setNetworkMismatch({ hasMismatch, expected, actual: actualChainId });
    return hasMismatch;
  }, [getExpectedChainId]);

  const detectWallet = useCallback((): WalletType => {
    if (typeof window !== 'undefined') {
      if (window.keplr) return 'keplr';
      if (window.xfi?.thorchain) return 'xdefi';
      if (window.vultisig?.thorchain || window.thorchain) return 'vultisig';
    }
    return null;
  }, []);

  const connectKeplr = useCallback(async (): Promise<{ address: string; chainId: string }> => {
    if (!window.keplr) {
      throw new Error('Keplr wallet not installed');
    }

    await window.keplr.enable(THORCHAIN_CHAIN_ID);
    const chainId = window.keplr.getChainId
      ? await window.keplr.getChainId(THORCHAIN_CHAIN_ID)
      : THORCHAIN_CHAIN_ID;
    
    const key = await window.keplr.getKey(THORCHAIN_CHAIN_ID);
    const address = key.bech32Address;

    return { address, chainId };
  }, []);

  const connectXdefi = useCallback(async (): Promise<{ address: string; chainId: string }> => {
    if (!window.xfi?.thorchain) {
      throw new Error('XDEFI wallet not installed');
    }

    const result = await window.xfi.thorchain.request({
      method: 'connect',
    });

    const address = result as string;
    const chainId = THORCHAIN_CHAIN_ID;

    return { address, chainId };
  }, []);

  const connectVultisig = useCallback(async (): Promise<{ address: string; chainId: string }> => {
    const vultisigProvider = window.vultisig?.thorchain || window.thorchain;
    if (!vultisigProvider) {
      throw new Error('Vultisig wallet not installed');
    }

    const result = await vultisigProvider.request({
      method: 'connect',
    });

    const address = result as string;
    const chainId = THORCHAIN_CHAIN_ID;

    return { address, chainId };
  }, []);

  const connect = useCallback(async (walletType: WalletType) => {
    if (!walletType) {
      setState(prev => ({ ...prev, error: 'No wallet selected' }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      let result: { address: string; chainId: string };

      if (walletType === 'keplr') {
        result = await connectKeplr();
      } else if (walletType === 'xdefi') {
        result = await connectXdefi();
      } else if (walletType === 'vultisig') {
        result = await connectVultisig();
      } else {
        throw new Error('Unsupported wallet type');
      }

      const mismatch = checkNetworkMismatch(result.chainId);
      
      if (mismatch) {
        setState({
          address: result.address,
          walletType,
          chainId: result.chainId,
          isConnected: false,
          isConnecting: false,
          error: `Network mismatch: Expected ${getExpectedChainId()}, got ${result.chainId}`,
        });
        return;
      }

      setState({
        address: result.address,
        walletType,
        chainId: result.chainId,
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: message,
      }));
    }
  }, [connectKeplr, connectXdefi, connectVultisig, checkNetworkMismatch, getExpectedChainId]);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      walletType: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
    setNetworkMismatch({
      hasMismatch: false,
      expected: getExpectedChainId(),
      actual: null,
    });
  }, [getExpectedChainId]);

  const connectRef = useRef(connect);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const wallet = detectWallet();
    if (wallet && !state.isConnected) {
      const stored = readLocalStorageValue(STORAGE_KEYS.walletConnected);
      if (stored === wallet) {
        connectRef.current(wallet);
      }
    }
  }, [detectWallet, state.isConnected]);

  useEffect(() => {
    if (state.isConnected && state.walletType) {
      writeLocalStorageValue(STORAGE_KEYS.walletConnected, state.walletType);
    } else {
      removeLocalStorageValue(STORAGE_KEYS.walletConnected);
    }
  }, [state.isConnected, state.walletType]);

  return {
    ...state,
    networkMismatch,
    availableWallets: detectWallet(),
    connect,
    disconnect,
    isNetworkMismatch: networkMismatch.hasMismatch,
  };
}

type WalletContextValue = ReturnType<typeof useWallet>;

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  return createElement(WalletContext.Provider, { value: wallet }, children);
}

export function useWalletContext(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWalletContext must be used within WalletProvider');
  }
  return context;
}
