import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TransactionComposer } from './transaction-composer';
import type { BondPosition } from '@/lib/types/node';

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  wallet: {
    address: 'thor1walletaddress000000000000000000000000000',
    walletType: 'keplr' as 'keplr' | 'xdefi' | 'vultisig',
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

const transactionMocks = vi.hoisted(() => ({
  executeBondTransaction: vi.fn(),
  executeUnbondTransaction: vi.fn(),
}));

const NODE_ADDRESS = 'thor16xxh3km6dxka636qg6q7e3us5vlgvhrhjgw245';
const PROVIDER_ADDRESS = 'thor158qequwhhnggm4ch4psv55yqpxsugf67n62dy2';
const WALLET_ADDRESS = 'thor1walletaddress000000000000000000000000000';

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mocks.searchParams.get(key),
  }),
}));

vi.mock('@/lib/hooks/use-wallet', () => ({
  useWallet: () => mocks.wallet,
}));

vi.mock('@/lib/transactions/bond', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/transactions/bond')>();
  return {
    ...actual,
    executeBondTransaction: transactionMocks.executeBondTransaction,
    executeUnbondTransaction: transactionMocks.executeUnbondTransaction,
  };
});

const standbyPosition: BondPosition = {
  nodeAddress: NODE_ADDRESS,
  nodeOperatorAddress: 'thor1operator00000000000000000000000000000000',
  bondAmount: 25,
  bondSharePercent: 100,
  status: 'Standby',
  operatorFee: 0,
  operatorFeeFormatted: '0 bps',
  netAPY: 0,
  totalBond: 25,
  slashPoints: 0,
  isJailed: false,
  jailReleaseHeight: 0,
  version: '2.3.0',
  requestedToLeave: false,
};

beforeEach(() => {
  mocks.searchParams = new URLSearchParams();
  mocks.wallet.address = WALLET_ADDRESS;
  mocks.wallet.walletType = 'keplr';
  mocks.wallet.isConnected = true;
  mocks.wallet.isNetworkMismatch = false;
  transactionMocks.executeBondTransaction.mockReset();
  transactionMocks.executeUnbondTransaction.mockReset();
  transactionMocks.executeBondTransaction.mockResolvedValue({ success: true, txHash: 'bond-hash' });
  transactionMocks.executeUnbondTransaction.mockResolvedValue({ success: true, txHash: 'unbond-hash' });
});

describe('TransactionComposer BOND advanced validation', () => {
  it('blocks signing and surfaces validation when operator fee is entered without provider', async () => {
    const user = userEvent.setup();

    render(<TransactionComposer positions={[]} />);

    await user.clear(screen.getByLabelText('Node Address'));
    await user.type(screen.getByLabelText('Node Address'), NODE_ADDRESS);
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
    await user.type(screen.getByLabelText('Node Address'), NODE_ADDRESS);
    await user.type(screen.getByLabelText('Bond Amount'), '2');
    await user.click(screen.getByRole('button', { name: 'Advanced: provider address / operator fee' }));
    await user.type(screen.getByLabelText('Provider Address (optional)'), PROVIDER_ADDRESS);
    await user.type(screen.getByLabelText('Operator Fee BPS (optional)'), '12.5');

    expect(screen.getByLabelText('Operator Fee BPS (optional)')).toHaveValue('12.5');
    expect(screen.getByRole('button', { name: 'Sign & Broadcast' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Operator fee must be a whole number between 0 and 10000 basis points');
  });

  it('submits a connected Keplr BOND payload after preview confirmation', async () => {
    const user = userEvent.setup();

    render(<TransactionComposer positions={[]} />);

    await user.clear(screen.getByLabelText('Node Address'));
    await user.type(screen.getByLabelText('Node Address'), NODE_ADDRESS);
    await user.type(screen.getByLabelText('Bond Amount'), '2');
    await user.click(screen.getByRole('button', { name: 'Sign & Broadcast' }));
    await user.click(screen.getByRole('button', { name: 'Confirm & Sign' }));

    expect(transactionMocks.executeBondTransaction).toHaveBeenCalledWith({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '2',
      memo: `BOND:${NODE_ADDRESS}`,
      walletType: 'keplr',
    }, WALLET_ADDRESS);
    expect(await screen.findByText('bond-hash')).toBeInTheDocument();
  });

  it('submits a connected XDEFI advanced BOND payload after preview confirmation', async () => {
    const user = userEvent.setup();
    mocks.wallet.walletType = 'xdefi';

    render(<TransactionComposer positions={[]} />);

    await user.clear(screen.getByLabelText('Node Address'));
    await user.type(screen.getByLabelText('Node Address'), NODE_ADDRESS);
    await user.type(screen.getByLabelText('Bond Amount'), '3.25');
    await user.click(screen.getByRole('button', { name: 'Advanced: provider address / operator fee' }));
    await user.type(screen.getByLabelText('Provider Address (optional)'), PROVIDER_ADDRESS);
    await user.type(screen.getByLabelText('Operator Fee BPS (optional)'), '1000');
    await user.click(screen.getByRole('button', { name: 'Sign & Broadcast' }));
    await user.click(screen.getByRole('button', { name: 'Confirm & Sign' }));

    expect(transactionMocks.executeBondTransaction).toHaveBeenCalledWith({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '3.25',
      memo: `BOND:${NODE_ADDRESS}:${PROVIDER_ADDRESS}:1000`,
      walletType: 'xdefi',
    }, WALLET_ADDRESS);
  });

  it('submits a connected Vultisig UNBOND payload with memo amount semantics after preview confirmation', async () => {
    const user = userEvent.setup();
    mocks.wallet.walletType = 'vultisig';

    render(<TransactionComposer positions={[standbyPosition]} />);

    await user.click(screen.getByRole('button', { name: 'UNBOND' }));
    await user.clear(screen.getByLabelText('Amount to Unbond'));
    await user.type(screen.getByLabelText('Amount to Unbond'), '10');
    await user.click(screen.getByRole('button', { name: 'Sign & Broadcast' }));
    expect(screen.getAllByText(`UNBOND:${NODE_ADDRESS}:1000000000`)).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Confirm & Sign' }));

    expect(transactionMocks.executeUnbondTransaction).toHaveBeenCalledWith({
      type: 'UNBOND',
      nodeAddress: NODE_ADDRESS,
      amount: '10',
      memo: `UNBOND:${NODE_ADDRESS}:1000000000`,
      walletType: 'vultisig',
    }, WALLET_ADDRESS);
  });
});
