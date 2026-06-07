import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TransactionComposer } from './transaction-composer';

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  wallet: {
    address: 'thor1walletaddress000000000000000000000000000',
    walletType: 'keplr' as const,
    chainId: 'thorchain-mainnet-v1',
    isConnected: true,
    isConnecting: false,
    error: null,
    networkMismatch: {
      hasMismatch: false,
      expected: 'thorchain-mainnet-v1',
      actual: 'thorchain-mainnet-v1',
    },
    availableWallets: 'keplr' as const,
    connect: vi.fn(),
    disconnect: vi.fn(),
    isNetworkMismatch: false,
  },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mocks.searchParams.get(key),
  }),
}));

vi.mock('@/lib/hooks/use-wallet', () => ({
  useWallet: () => mocks.wallet,
}));

describe('TransactionComposer BOND advanced validation', () => {
  it('blocks signing and surfaces validation when operator fee is entered without provider', async () => {
    const user = userEvent.setup();

    render(<TransactionComposer positions={[]} />);

    await user.clear(screen.getByLabelText('Node Address'));
    await user.type(screen.getByLabelText('Node Address'), 'thor16xxh3km6dxka636qg6q7e3us5vlgvhrhjgw245');
    await user.type(screen.getByLabelText('Bond Amount'), '2');
    await user.click(screen.getByRole('button', { name: 'Advanced: provider address / operator fee' }));
    await user.type(screen.getByLabelText('Operator Fee BPS (optional)'), '1000');

    expect(screen.getByRole('button', { name: 'Sign & Broadcast' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Provider address is required when operator fee is set');
  });

  it('preserves malformed operator fee input so validation can reject it', async () => {
    const user = userEvent.setup();

    render(<TransactionComposer positions={[]} />);

    await user.clear(screen.getByLabelText('Node Address'));
    await user.type(screen.getByLabelText('Node Address'), 'thor16xxh3km6dxka636qg6q7e3us5vlgvhrhjgw245');
    await user.type(screen.getByLabelText('Bond Amount'), '2');
    await user.click(screen.getByRole('button', { name: 'Advanced: provider address / operator fee' }));
    await user.type(screen.getByLabelText('Provider Address (optional)'), 'thor158qequwhhnggm4ch4psv55yqpxsugf67n62dy2');
    await user.type(screen.getByLabelText('Operator Fee BPS (optional)'), '12.5');

    expect(screen.getByLabelText('Operator Fee BPS (optional)')).toHaveValue('12.5');
    expect(screen.getByRole('button', { name: 'Sign & Broadcast' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Operator fee must be a whole number between 0 and 10000 basis points');
  });
});
