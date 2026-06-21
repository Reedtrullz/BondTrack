'use client';

import { createContext, createElement, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import '@/lib/types/wallet';
import { readLocalStorageValue, removeLocalStorageValue, STORAGE_KEYS, writeLocalStorageValue } from '@/lib/storage/keys';
import { THORCHAIN_MAINNET_CHAIN_ID } from '@/lib/thorchain';
import { normalizeTHORChainMainnetAddress } from '@/lib/utils/address-validation';
import {
  LEDGER_BROADCAST_UNAVAILABLE_MESSAGE,
  connectLedgerThorchainAddress,
  getLedgerBrowserSupport,
} from '@/lib/wallet/ledger-thorchain';

export type WalletType = 'keplr' | 'xdefi' | 'vultisig' | 'ledger' | null;
export type SupportedWalletType = Exclude<WalletType, null>;
export type WalletBroadcastCapability = 'broadcast' | 'address-only';

export interface WalletOptionState {
  type: SupportedWalletType;
  detected: boolean;
  connectable: boolean;
  capability: WalletBroadcastCapability;
  unavailableReason: string | null;
}

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

interface ConnectOptions {
  failClosedOnError?: boolean;
}

const THORCHAIN_CHAIN_ID = THORCHAIN_MAINNET_CHAIN_ID;
const SUPPORTED_WALLET_ORDER: SupportedWalletType[] = ['ledger', 'vultisig', 'keplr', 'xdefi'];
const STALE_SIGNER_REFRESH_ERROR =
  'Keplr account changed, but Heimdall could not refresh the signer. Reconnect wallet before preview or broadcast.';

interface VultisigWindow {
  thorchain?: {
    request(args: { method: string; params?: unknown[] }): Promise<unknown>;
    on?: (event: string, handler: () => void) => void;
    off?: (event: string, handler: () => void) => void;
    removeListener?: (event: string, handler: () => void) => void;
    addEventListener?: (event: string, handler: () => void) => void;
    removeEventListener?: (event: string, handler: () => void) => void;
  };
}

declare global {
  interface Window {
    vultisig?: VultisigWindow;
  }
}

function extractWalletAddress(result: unknown): string {
  if (typeof result === 'string') return result;

  if (Array.isArray(result) && result.length > 0) {
    const [firstAccount] = result;
    if (typeof firstAccount === 'string') return firstAccount;
    if (firstAccount && typeof firstAccount === 'object') {
      const accountRecord = firstAccount as Record<string, unknown>;
      if (typeof accountRecord.address === 'string') return accountRecord.address;
      if (typeof accountRecord.bech32Address === 'string') return accountRecord.bech32Address;
    }
  }

  if (result && typeof result === 'object') {
    const record = result as Record<string, unknown>;
    if (typeof record.address === 'string') return record.address;
    if (typeof record.bech32Address === 'string') return record.bech32Address;

    const accounts = record.accounts;
    if (Array.isArray(accounts) && accounts.length > 0) {
      const [firstAccount] = accounts;
      if (typeof firstAccount === 'string') return firstAccount;
      if (firstAccount && typeof firstAccount === 'object') {
        const accountRecord = firstAccount as Record<string, unknown>;
        if (typeof accountRecord.address === 'string') return accountRecord.address;
        if (typeof accountRecord.bech32Address === 'string') return accountRecord.bech32Address;
      }
    }
  }

  throw new Error('Wallet did not return a THORChain address');
}

function tryExtractWalletAddress(result: unknown): string | null {
  try {
    return extractWalletAddress(result);
  } catch {
    return null;
  }
}

function validateConnectedAddress(address: string, walletType: Exclude<WalletType, null>): string {
  const normalized = normalizeTHORChainMainnetAddress(address);
  if (!normalized) {
    throw new Error(`${walletType.toUpperCase()} returned an invalid THORChain mainnet address`);
  }
  return normalized;
}

export function walletCanBroadcastTransactions(walletType: WalletType): boolean {
  return walletType !== null && walletType !== 'ledger';
}

export function getWalletBroadcastUnavailableReason(walletType: WalletType): string | null {
  if (walletType === 'ledger') return LEDGER_BROADCAST_UNAVAILABLE_MESSAGE;
  return null;
}

function isSupportedWalletType(value: string | null): value is SupportedWalletType {
  return SUPPORTED_WALLET_ORDER.includes(value as SupportedWalletType);
}

function isUnsupportedProviderMethod(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const record = error as Record<string, unknown>;
  if (record.code === 4200) return true;

  const message = typeof record.message === 'string' ? record.message : '';
  return /unsupported|unknown method|not supported|unexpected vultisig method/i.test(message);
}

function getVultisigProvider() {
  return window.vultisig?.thorchain || window.thorchain;
}

function subscribeVultisigProviderEvent(
  eventName: string,
  handler: () => void
): (() => void) | null {
  const provider = getVultisigProvider();
  if (!provider) return null;

  if (typeof provider.on === 'function') {
    provider.on(eventName, handler);
    return () => {
      if (typeof provider.off === 'function') provider.off(eventName, handler);
      else if (typeof provider.removeListener === 'function') provider.removeListener(eventName, handler);
    };
  }

  if (typeof provider.addEventListener === 'function') {
    provider.addEventListener(eventName, handler);
    return () => {
      if (typeof provider.removeEventListener === 'function') provider.removeEventListener(eventName, handler);
    };
  }

  return null;
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
  const stateRef = useRef(state);

  const getExpectedChainId = useCallback(() => {
    return THORCHAIN_CHAIN_ID;
  }, []);

  const checkNetworkMismatch = useCallback((actualChainId: string | null) => {
    const expected = getExpectedChainId();
    const hasMismatch = actualChainId !== null && actualChainId !== expected;
    setNetworkMismatch({ hasMismatch, expected, actual: actualChainId });
    return hasMismatch;
  }, [getExpectedChainId]);

  const detectWallets = useCallback((): SupportedWalletType[] => {
    const detected: SupportedWalletType[] = [];

    if (typeof window !== 'undefined') {
      if (getLedgerBrowserSupport().supported) detected.push('ledger');
      if (window.vultisig?.thorchain || window.thorchain) detected.push('vultisig');
      if (window.keplr) detected.push('keplr');
      if (window.xfi?.thorchain) detected.push('xdefi');
    }

    return detected;
  }, []);

  const getWalletOptions = useCallback((): WalletOptionState[] => {
    const detectedWallets = new Set(detectWallets());
    const ledgerSupport = getLedgerBrowserSupport();

    return SUPPORTED_WALLET_ORDER.map((type) => {
      if (type === 'ledger') {
        return {
          type,
          detected: ledgerSupport.supported,
          connectable: ledgerSupport.supported,
          capability: 'address-only',
          unavailableReason: ledgerSupport.reason,
        };
      }

      const detected = detectedWallets.has(type);
      const walletName = type === 'vultisig'
        ? 'Vultisig'
        : type === 'keplr'
          ? 'Keplr'
          : 'XDEFI';

      return {
        type,
        detected,
        connectable: detected,
        capability: 'broadcast',
        unavailableReason: detected ? null : `Install or unlock ${walletName} to connect.`,
      };
    });
  }, [detectWallets]);

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

    const address = extractWalletAddress(result);
    const chainId = THORCHAIN_CHAIN_ID;

    return { address, chainId };
  }, []);

  const connectVultisig = useCallback(async (): Promise<{ address: string; chainId: string }> => {
    const vultisigProvider = getVultisigProvider();
    if (!vultisigProvider) {
      throw new Error('Vultisig wallet not installed');
    }

    let address: string | null = null;
    try {
      const result = await vultisigProvider.request({
        method: 'request_accounts',
      });
      address = tryExtractWalletAddress(result);
    } catch (error) {
      if (!isUnsupportedProviderMethod(error)) throw error;
      try {
        const result = await vultisigProvider.request({
          method: 'get_accounts',
        });
        address = tryExtractWalletAddress(result);
      } catch (getAccountsError) {
        if (!isUnsupportedProviderMethod(getAccountsError)) throw getAccountsError;
      }
    }

    if (!address) {
      const result = await vultisigProvider.request({
        method: 'connect',
      });
      address = extractWalletAddress(result);
    }

    const chainId = THORCHAIN_CHAIN_ID;

    return { address, chainId };
  }, []);

  const connectLedger = useCallback(async (): Promise<{ address: string; chainId: string }> => {
    const result = await connectLedgerThorchainAddress();

    return {
      address: result.address,
      chainId: THORCHAIN_CHAIN_ID,
    };
  }, []);

  const connect = useCallback(async (walletType: WalletType, options: ConnectOptions = {}) => {
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
      } else if (walletType === 'ledger') {
        result = await connectLedger();
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

      const address = validateConnectedAddress(result.address, walletType);

      setState({
        address,
        walletType,
        chainId: result.chainId,
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      if (options.failClosedOnError) {
        setState({
          address: null,
          walletType: null,
          chainId: null,
          isConnected: false,
          isConnecting: false,
          error: STALE_SIGNER_REFRESH_ERROR,
        });
        setNetworkMismatch({
          hasMismatch: false,
          expected: getExpectedChainId(),
          actual: null,
        });
      } else {
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error: message,
        }));
      }
    }
  }, [connectKeplr, connectXdefi, connectVultisig, connectLedger, checkNetworkMismatch, getExpectedChainId]);

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
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const detectedWallets = detectWallets();
    if (detectedWallets.length > 0 && !state.isConnected) {
      const stored = readLocalStorageValue(STORAGE_KEYS.walletConnected);
      if (stored !== 'ledger' && isSupportedWalletType(stored) && detectedWallets.includes(stored)) {
        connectRef.current(stored);
      }
    }
  }, [detectWallets, state.isConnected]);

  useEffect(() => {
    const handleKeplrKeyStoreChange = () => {
      const current = stateRef.current;
      if (current.isConnected && current.walletType === 'keplr') {
        void connectRef.current('keplr', { failClosedOnError: true });
      }
    };

    window.addEventListener('keplr_keystorechange', handleKeplrKeyStoreChange);
    return () => window.removeEventListener('keplr_keystorechange', handleKeplrKeyStoreChange);
  }, []);

  useEffect(() => {
    if (state.walletType !== 'vultisig') return undefined;

    const handleVultisigDisconnect = () => {
      const current = stateRef.current;
      if (!current.isConnected || current.walletType !== 'vultisig') return;

      setState({
        address: null,
        walletType: null,
        chainId: null,
        isConnected: false,
        isConnecting: false,
        error: 'Vultisig disconnected. Reconnect before preview or broadcast.',
      });
      setNetworkMismatch({
        hasMismatch: false,
        expected: getExpectedChainId(),
        actual: null,
      });
    };

    const unsubscribers = ['DISCONNECT', 'disconnect']
      .map((eventName) => subscribeVultisigProviderEvent(eventName, handleVultisigDisconnect))
      .filter((unsubscribe): unsubscribe is () => void => Boolean(unsubscribe));

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [getExpectedChainId, state.walletType]);

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
    availableWallets: detectWallets(),
    walletOptions: getWalletOptions(),
    canBroadcastTransactions: state.isConnected && walletCanBroadcastTransactions(state.walletType),
    walletBroadcastUnavailableReason: state.isConnected
      ? getWalletBroadcastUnavailableReason(state.walletType)
      : null,
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
