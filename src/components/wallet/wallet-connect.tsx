'use client';

import { useState, useRef, useEffect } from 'react';
import { useWalletContext, type SupportedWalletType, type WalletOptionState } from '@/lib/hooks/use-wallet';
import { Button } from '@/components/ui/button';
import { Wallet, ChevronDown, LogOut, AlertTriangle, Usb } from 'lucide-react';

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatWalletName(walletType: string | null): string {
  if (walletType === 'keplr') return 'Keplr';
  if (walletType === 'vultisig') return 'Vultisig';
  if (walletType === 'xdefi') return 'XDEFI';
  if (walletType === 'ledger') return 'Ledger';
  return 'Wallet';
}

function KeplrIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <circle cx="16" cy="16" r="14" fill="#5534D6" />
      <path
        d="M20.5 11.5C19.5 10 17.5 9.5 16 10.5C14.5 9.5 12.5 10 11.5 11.5L8 16L11.5 20.5C12.5 22 14.5 22.5 16 21.5C17.5 22.5 19.5 22 20.5 20.5L24 16L20.5 11.5Z"
        fill="white"
      />
    </svg>
  );
}

function XdefiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <rect width="32" height="32" rx="6" fill="#1F2128" />
      <path
        d="M16 6L8 10V16L16 26L24 22V16L16 6Z"
        fill="#FF5C00"
      />
      <path
        d="M16 6L8 16L16 14L24 16L16 6Z"
        fill="#FF8C5A"
      />
    </svg>
  );
}

function VultisigIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <circle cx="16" cy="16" r="14" fill="#00D4AA" />
      <path
        d="M10 16L14 20L22 12"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LedgerIcon({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-md bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 ${className ?? ''}`}>
      <Usb className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );
}

function getWalletIcon(walletType: SupportedWalletType, className = 'h-5 w-5') {
  if (walletType === 'keplr') return <KeplrIcon className={className} />;
  if (walletType === 'vultisig') return <VultisigIcon className={className} />;
  if (walletType === 'ledger') return <LedgerIcon className={className} />;
  return <XdefiIcon className={className} />;
}

function getWalletOptionName(walletType: SupportedWalletType): string {
  if (walletType === 'ledger') return 'Ledger Hardware Wallet';
  if (walletType === 'vultisig') return 'Vultisig Extension';
  if (walletType === 'keplr') return 'Keplr Wallet';
  return 'XDEFI Wallet';
}

function getWalletOptionDescription(option: WalletOptionState): string {
  if (!option.connectable) {
    return option.unavailableReason ?? 'Wallet provider unavailable.';
  }

  if (option.type === 'ledger') {
    return 'Unlock Ledger, open the THORChain app, and confirm the address on device. Review only; broadcast stays disabled.';
  }

  return 'BOND and UNBOND broadcast support.';
}

function WalletOption({
  name,
  testId,
  icon,
  onClick,
  disabled,
  describedBy,
  description,
  descriptionId,
}: {
  name: string;
  testId: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  describedBy?: string;
  description: string;
  descriptionId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      aria-describedby={describedBy ?? descriptionId}
      role="menuitem"
      className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block font-medium">{name}</span>
        <span id={descriptionId} className="block text-xs leading-snug text-zinc-500 dark:text-zinc-400">
          {description}
        </span>
      </span>
    </button>
  );
}

export function WalletConnect() {
  const {
    address,
    isConnected,
    isConnecting,
    walletType,
    error,
    availableWallets,
    walletOptions,
    connect,
    disconnect,
    networkMismatch,
    isNetworkMismatch,
  } = useWalletContext();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = isConnected ? 'wallet-account-menu' : 'wallet-connect-menu';
  const noWalletMessageId = 'wallet-no-provider-message';
  const walletErrorMessageId = error ? 'wallet-connect-error-message' : undefined;
  const hasConnectableWallet = walletOptions.some((option) => option.connectable);
  void availableWallets;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isConnected) {
      setDropdownOpen(false);
    }
  }, [isConnected]);

  useEffect(() => {
    if (!dropdownOpen) return;

    const firstMenuItem = menuRef.current?.querySelector<HTMLElement>('button:not([disabled])');
    firstMenuItem?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setDropdownOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dropdownOpen]);

  const toggleDropdown = () => {
    setDropdownOpen((open) => !open);
  };

  const closeDropdownAndReturnFocus = () => {
    setDropdownOpen(false);
    triggerRef.current?.focus();
  };

  if (isNetworkMismatch && isConnected === false) {
    const expectedChain = networkMismatch.expected;
    const actualChain = networkMismatch.actual ?? 'unknown';
    const canReconnect = Boolean(walletType);

    return (
      <div className="flex max-w-[min(24rem,calc(100vw-2rem))] flex-col items-end gap-1">
        <div
          role="alert"
          data-testid="wallet-network-mismatch"
          className="flex w-full items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-left text-xs leading-snug text-amber-800 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="space-y-0.5">
            <span className="block font-semibold">Wallet network mismatch</span>
            <span className="block">
              Wallet reports {actualChain}; THORChain mainnet expects {expectedChain}.
            </span>
            <span className="block">Switch to THORChain mainnet before preview or broadcast.</span>
          </span>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {canReconnect && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isConnecting}
              onClick={() => {
                connect(walletType);
              }}
            >
              Reconnect wallet
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Clear wallet state"
            onClick={disconnect}
          >
            Clear
          </Button>
        </div>
      </div>
    );
  }

  if (isConnected && address) {
    return (
      <div className="relative flex items-center" ref={dropdownRef}>
        <button
          ref={triggerRef}
          type="button"
          data-testid="wallet-account-menu-button"
          aria-label={`${formatWalletName(walletType)} wallet ${truncateAddress(address)}`}
          onClick={toggleDropdown}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
          aria-haspopup="menu"
          aria-expanded={dropdownOpen}
          aria-controls={menuId}
        >
          {walletType ? getWalletIcon(walletType, 'h-5 w-5') : <Wallet className="h-5 w-5" />}
          <span className="font-medium">{formatWalletName(walletType)}</span>
          <span className="font-mono">{truncateAddress(address)}</span>
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        </button>
        <button
          type="button"
          onClick={disconnect}
          className="ml-2 inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
        >
          <LogOut className="h-3.5 w-3.5" />
          Disconnect
        </button>

        {dropdownOpen && (
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Connected wallet actions"
            className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-50"
          >
            <div className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">
              Connected with {formatWalletName(walletType)}
            </div>
            <button
              type="button"
              onClick={() => {
                disconnect();
                closeDropdownAndReturnFocus();
              }}
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-zinc-100 dark:text-red-400 dark:hover:bg-zinc-800"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-end gap-1" ref={dropdownRef}>
      <Button
        ref={triggerRef}
        type="button"
        data-testid="wallet-connect-button"
        onClick={toggleDropdown}
        variant="default"
        size="sm"
        disabled={isConnecting}
        aria-haspopup="menu"
        aria-expanded={dropdownOpen}
        aria-controls={menuId}
        aria-describedby={walletErrorMessageId}
      >
        <Wallet className="mr-2 h-4 w-4" />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>

      {error && (
        <div
          id={walletErrorMessageId}
          role="status"
          aria-live="polite"
          data-testid="wallet-connect-error"
          className="flex max-w-[min(22rem,calc(100vw-2rem))] items-start gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-left text-xs leading-snug text-red-700 shadow-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {dropdownOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Wallet connection options"
          className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-zinc-200 bg-white py-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-50"
        >
          <div className="px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Select wallet
          </div>

          {!hasConnectableWallet && (
            <div
              id={noWalletMessageId}
              className="mx-3 mb-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
            >
              No wallet connection path was detected in this browser. Install or unlock Vultisig, Keplr, or XDEFI, or use a Chromium browser with WebHID for Ledger.
            </div>
          )}

          {walletOptions.map((option) => (
            <div key={option.type} className="px-1">
              <WalletOption
                name={getWalletOptionName(option.type)}
                testId={`wallet-option-${option.type}`}
                icon={getWalletIcon(option.type)}
                description={getWalletOptionDescription(option)}
                descriptionId={`wallet-option-${option.type}-description`}
                onClick={() => {
                  connect(option.type);
                }}
                disabled={isConnecting || !option.connectable}
                describedBy={!hasConnectableWallet ? noWalletMessageId : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
