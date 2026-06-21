import { vi } from 'vitest';
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { SWRConfig } from 'swr';

function renderWithProviders(
  ui: ReactElement,
  renderOptions?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
  }
  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export function createMockKeplr() {
  return {
    enable: vi.fn().mockResolvedValue(['thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4']),
    getKey: vi.fn().mockResolvedValue({
      bech32Address: 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4',
    }),
    getAddresses: vi.fn().mockResolvedValue(['thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4']),
  };
}

export function createMockXdefi() {
  return {
    thorchain: {
      request: vi.fn().mockResolvedValue('thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4'),
    },
  };
}

export function createMockVultisig(address = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4') {
  return {
    thorchain: {
      request: vi.fn(async ({ method }: { method: string }) => {
        if (method === 'request_accounts') return [address];
        if (method === 'connect') return address;
        if (method === 'deposit_transaction') return 'vultisig-mock-tx';
        throw new Error(`Unexpected Vultisig method: ${method}`);
      }),
    },
  };
}

export function createMockLedgerConnection(address = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4') {
  return {
    address,
    appVersion: '2.0.0',
    compressedPublicKey: new Uint8Array(33),
  };
}

export function mockLocalStorage(data: Record<string, string> = {}) {
  Object.entries(data).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
