'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/lib/hooks/use-wallet';
import { Button } from '@/components/ui/button';
import { Wallet, ChevronDown, LogOut, AlertTriangle } from 'lucide-react';

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatWalletName(walletType: string | null): string {
  if (walletType === 'keplr') return 'Keplr';
  if (walletType === 'vultisig') return 'Vultisig';
  return 'XDEFI';
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

function WalletOption({
  name,
  testId,
  icon,
  onClick,
  disabled,
}: {
  name: string;
  testId: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      role="menuitem"
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {icon}
      <span className="font-medium">{name}</span>
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
    connect,
    disconnect,
    isNetworkMismatch,
  } = useWallet();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = isConnected ? 'wallet-account-menu' : 'wallet-connect-menu';

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
    return (
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm">Network mismatch</span>
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
          {walletType === 'keplr' ? (
            <KeplrIcon className="h-5 w-5" />
          ) : walletType === 'vultisig' ? (
            <VultisigIcon className="h-5 w-5" />
          ) : (
            <XdefiIcon className="h-5 w-5" />
          )}
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
    <div className="relative" ref={dropdownRef}>
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
      >
        <Wallet className="mr-2 h-4 w-4" />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>

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

          {error && (
            <div className="mx-3 mb-2 rounded-md bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {availableWallets === 'keplr' || !availableWallets ? (
            <div className="px-1">
              <WalletOption
                name="Keplr Wallet"
                testId="wallet-option-keplr"
                icon={<KeplrIcon className="h-5 w-5" />}
                onClick={() => {
                  connect('keplr');
                  setDropdownOpen(false);
                }}
                disabled={isConnecting}
              />
            </div>
          ) : null}

          {availableWallets === 'xdefi' || !availableWallets ? (
            <div className="px-1">
              <WalletOption
                name="XDEFI Wallet"
                testId="wallet-option-xdefi"
                icon={<XdefiIcon className="h-5 w-5" />}
                onClick={() => {
                  connect('xdefi');
                  setDropdownOpen(false);
                }}
                disabled={isConnecting}
              />
            </div>
          ) : null}

          {availableWallets === 'vultisig' || !availableWallets ? (
            <div className="px-1">
              <WalletOption
                name="Vultisig Wallet"
                testId="wallet-option-vultisig"
                icon={<VultisigIcon className="h-5 w-5" />}
                onClick={() => {
                  connect('vultisig');
                  setDropdownOpen(false);
                }}
                disabled={isConnecting}
              />
            </div>
          ) : null}

          {!availableWallets && (
            <div className="px-3 py-4 text-center text-sm text-zinc-500">
              No wallet detected. Please install Keplr, XDEFI, or Vultisig.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
