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
    enable: vi.fn().mockResolvedValue(['thor1mockaddress123456789']),
    getKey: vi.fn().mockResolvedValue({
      bech32Address: 'thor1mockaddress123456789',
    }),
    getAddresses: vi.fn().mockResolvedValue(['thor1mockaddress123456789']),
  };
}

export function createMockXdefi() {
  return {
    thorchain: {
      request: vi.fn().mockResolvedValue('thor1mockaddress123456789'),
    },
  };
}

export function mockLocalStorage(data: Record<string, string> = {}) {
  Object.entries(data).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
}

export * from '@testing-library/react';
export { renderWithProviders as render };