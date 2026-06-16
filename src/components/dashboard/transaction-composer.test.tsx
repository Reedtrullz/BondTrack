import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TransactionComposer } from './transaction-composer';
import type { BondPosition } from '@/lib/types/node';
import type { TransactionSourceSafety } from '@/lib/dashboard/transaction-preflight';

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  wallet: {
    address: 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4' as string | null,
    walletType: 'keplr' as 'keplr' | 'xdefi' | 'vultisig' | null,
    chainId: 'thorchain-1',
    isConnected: true,
    isConnecting: false,
    error: null,
    networkMismatch: {
      hasMismatch: false,
      expected: 'thorchain-1',
      actual: 'thorchain-1',
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

const NODE_ADDRESS = 'thor1qyqszqgpqyqszqgpqyqszqgpqyqszqgp55c9cr';
const PROVIDER_ADDRESS = 'thor158qequwhhnggm4ch4psv55yqpxsugf67n62dy2';
const WALLET_ADDRESS = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4';
const degradedSourceSafety: TransactionSourceSafety = {
  canCopyBondMemo: false,
  canCopyUnbondMemo: false,
  canPreview: false,
  detail: 'THORNode source confidence is degraded. Do not copy, preview, or broadcast until source confidence is fresh.',
  itemSeverity: 'warning',
  status: 'Source confidence degraded',
  value: 'THORNode degraded',
};

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => mocks.searchParams.get(key),
  }),
}));

vi.mock('@/lib/hooks/use-wallet', () => ({
  useWalletContext: () => mocks.wallet,
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

function changeInput(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeEach(() => {
  mocks.searchParams = new URLSearchParams();
  mocks.wallet.address = WALLET_ADDRESS;
  mocks.wallet.walletType = 'keplr';
  mocks.wallet.isConnected = true;
  mocks.wallet.isNetworkMismatch = false;
  mocks.wallet.networkMismatch = {
    hasMismatch: false,
    expected: 'thorchain-1',
    actual: 'thorchain-1',
  };
  transactionMocks.executeBondTransaction.mockReset();
  transactionMocks.executeUnbondTransaction.mockReset();
  transactionMocks.executeBondTransaction.mockResolvedValue({ success: true, txHash: 'bond-hash' });
  transactionMocks.executeUnbondTransaction.mockResolvedValue({ success: true, txHash: 'unbond-hash' });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('TransactionComposer BOND advanced validation', () => {
  it('does not show validation errors before the operator edits the composer', () => {
    render(<TransactionComposer positions={[]} />);

    expect(screen.getByLabelText('Node Address')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByLabelText('Bond Amount')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps incomplete BOND memos out of the copy path', () => {
    render(<TransactionComposer positions={[]} />);

    expect(screen.getByText('Enter a valid node address before copying a BOND memo.')).toBeInTheDocument();
    expect(screen.getByText('Bond payload minimum:')).toBeInTheDocument();
    expect(screen.getByText('1 RUNE')).toBeInTheDocument();
    expect(screen.getByText('Network fees are dynamic and confirmed by the wallet before broadcast.')).toBeInTheDocument();
    expect(screen.queryByText('Minimum bond transaction reserve:')).not.toBeInTheDocument();
    expect(screen.queryByText('1.02 RUNE')).not.toBeInTheDocument();
    expect(screen.queryByText('BOND:')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy Memo' })).toBeDisabled();
  });

  it('describes UNBOND as a zero-transfer deposit payload with memo amount semantics', async () => {
    const user = userEvent.setup();

    render(<TransactionComposer positions={[standbyPosition]} />);

    await user.click(screen.getByRole('button', { name: 'UNBOND' }));

    expect(screen.getByText('UNBOND uses a zero-RUNE deposit payload.')).toBeInTheDocument();
    expect(screen.getByText('The requested amount is encoded in the memo in 1e8 base units; wallet/network fees are confirmed before broadcast.')).toBeInTheDocument();
    expect(screen.queryByText('Minimum bond transaction reserve:')).not.toBeInTheDocument();
    expect(screen.queryByText('1.02 RUNE')).not.toBeInTheDocument();
  });

  it('prefills a BOND deep link before operator interaction', () => {
    mocks.searchParams = new URLSearchParams(`action=bond&node=${NODE_ADDRESS}&amount=2`);

    render(<TransactionComposer positions={[]} />);

    expect(screen.getByRole('button', { name: 'BOND' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Node Address')).toHaveValue(NODE_ADDRESS);
    expect(screen.getByLabelText('Bond Amount')).toHaveValue('2');
    expect(screen.getByText(`BOND:${NODE_ADDRESS}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review Transaction' })).toBeEnabled();
  });

  it('prefills an UNBOND deep link with memo amount semantics before operator interaction', () => {
    mocks.searchParams = new URLSearchParams(`action=unbond&node=${NODE_ADDRESS}&amount=10`);

    render(<TransactionComposer positions={[standbyPosition]} />);

    expect(screen.getByRole('button', { name: 'UNBOND' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Node Address')).toHaveValue(NODE_ADDRESS);
    expect(screen.getByLabelText('Amount to Unbond')).toHaveValue('10');
    expect(screen.getByText(`UNBOND:${NODE_ADDRESS}:1000000000`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review Transaction' })).toBeEnabled();
  });

  it('enables memo copy only after the BOND memo itself is valid', async () => {
    render(<TransactionComposer positions={[]} />);

    changeInput('Node Address', NODE_ADDRESS);

    expect(screen.getByText(`BOND:${NODE_ADDRESS}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Copy Memo' })).toBeEnabled();
  });

  it('shows primary copy success feedback after copying a valid BOND memo', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText },
    });

    render(<TransactionComposer positions={[]} />);

    changeInput('Node Address', NODE_ADDRESS);
    await user.click(screen.getByRole('button', { name: 'Copy Memo' }));

    expect(writeText).toHaveBeenCalledWith(`BOND:${NODE_ADDRESS}`);
    expect(screen.getByRole('button', { name: 'Memo copied' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Success!');
    expect(screen.getByRole('status')).toHaveTextContent('Memo copied to your clipboard.');
  });

  it('shows copy failure feedback without logging handled clipboard errors', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('clipboard unavailable')),
      },
    });

    render(<TransactionComposer positions={[]} />);

    changeInput('Node Address', NODE_ADDRESS);
    await user.click(screen.getByRole('button', { name: 'Copy Memo' }));

    expect(screen.getByRole('status')).toHaveTextContent('Copy Failed');
    expect(screen.getByRole('status')).toHaveTextContent('Copy failed. Select the memo above and copy it manually.');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('does not show untouched bond amount errors after only the node address changes', async () => {
    render(<TransactionComposer positions={[]} />);

    changeInput('Node Address', NODE_ADDRESS);

    expect(screen.getByLabelText('Bond Amount')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('Amount must be a positive RUNE value with up to 8 decimals')).not.toBeInTheDocument();
  });

  it('shows field validation after the operator edits invalid values', async () => {
    const user = userEvent.setup();

    render(<TransactionComposer positions={[]} />);

    await user.type(screen.getByLabelText('Node Address'), 'bad-node');
    await user.type(screen.getByLabelText('Bond Amount'), '0');

    expect(screen.getAllByText('Node address must be a valid THORChain address').length).toBeGreaterThan(0);
    expect(screen.getByText('Amount must be a positive RUNE value with up to 8 decimals')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Node address must be a valid THORChain address');
  });

  it('blocks signing and surfaces validation when operator fee is entered without provider', async () => {
    const user = userEvent.setup();

    render(<TransactionComposer positions={[]} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');
    await user.click(screen.getByRole('button', { name: 'Advanced: provider address / operator fee' }));
    changeInput('Operator Fee BPS (optional)', '1000');

    expect(screen.getByRole('button', { name: 'Review Transaction' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy Memo' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Provider address is required when operator fee is set');
  });

  it('preserves malformed operator fee input so validation can reject it', async () => {
    const user = userEvent.setup();

    render(<TransactionComposer positions={[]} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');
    await user.click(screen.getByRole('button', { name: 'Advanced: provider address / operator fee' }));
    changeInput('Provider Address (optional)', PROVIDER_ADDRESS);
    changeInput('Operator Fee BPS (optional)', '12.5');

    expect(screen.getByLabelText('Operator Fee BPS (optional)')).toHaveValue('12.5');
    expect(screen.getByRole('button', { name: 'Review Transaction' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Operator fee must be a whole number between 0 and 10000 basis points');
  });

  it('submits a connected Keplr BOND payload after preview confirmation', async () => {
    const user = userEvent.setup();

    render(<TransactionComposer positions={[]} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');
    await user.click(screen.getByRole('button', { name: 'Review Transaction' }));
    const dialog = screen.getByRole('dialog', { name: 'Confirm Transaction' });
    expect(within(dialog).getByText('Target node')).toBeInTheDocument();
    expect(within(dialog).getByText(NODE_ADDRESS)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm & Broadcast' }));

    expect(transactionMocks.executeBondTransaction).toHaveBeenCalledWith({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '2',
      memo: `BOND:${NODE_ADDRESS}`,
      walletType: 'keplr',
    }, WALLET_ADDRESS);
    expect(await screen.findByText('bond-hash')).toBeInTheDocument();
  });

  it('keeps disconnected wallet guidance local while allowing memo preparation', () => {
    mocks.wallet.address = null;
    mocks.wallet.walletType = null;
    mocks.wallet.isConnected = false;

    render(<TransactionComposer positions={[]} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');

    expect(screen.getByRole('button', { name: 'Copy Memo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Wallet required' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Wallet required' })).toHaveAccessibleDescription(
      'Connect a wallet when you are ready to preview and broadcast. Memo copy is available without a wallet.'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Connect a wallet when you are ready to preview and broadcast. Memo copy is available without a wallet.'
    );
    expect(transactionMocks.executeBondTransaction).not.toHaveBeenCalled();
  });

  it('explains a wrong-network wallet state and keeps preview disabled', () => {
    mocks.wallet.isNetworkMismatch = true;
    mocks.wallet.networkMismatch = {
      hasMismatch: true,
      expected: 'thorchain-1',
      actual: 'cosmoshub-4',
    };

    render(<TransactionComposer positions={[]} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');

    expect(screen.getByRole('button', { name: 'Review Transaction' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Wallet is connected to the wrong network. Switch to THORChain mainnet before preview or broadcast.'
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(transactionMocks.executeBondTransaction).not.toHaveBeenCalled();
  });

  it('explains a wrong-network state even when the wallet connection is not usable', () => {
    mocks.wallet.isConnected = false;
    mocks.wallet.isNetworkMismatch = true;
    mocks.wallet.networkMismatch = {
      hasMismatch: true,
      expected: 'thorchain-1',
      actual: 'cosmoshub-4',
    };

    render(<TransactionComposer positions={[]} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');

    expect(screen.getByRole('button', { name: 'Wallet required' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Wallet required' })).toHaveAccessibleDescription(
      'Wallet is connected to the wrong network. Switch to THORChain mainnet before preview or broadcast.'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Wallet is connected to the wrong network. Switch to THORChain mainnet before preview or broadcast.'
    );
    expect(transactionMocks.executeBondTransaction).not.toHaveBeenCalled();
  });

  it('does not broadcast when wallet network drifts after preview opens', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TransactionComposer positions={[]} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');
    await user.click(screen.getByRole('button', { name: 'Review Transaction' }));

    expect(screen.getByRole('dialog', { name: 'Confirm Transaction' })).toBeInTheDocument();

    mocks.wallet.isNetworkMismatch = true;
    mocks.wallet.networkMismatch = {
      hasMismatch: true,
      expected: 'thorchain-1',
      actual: 'cosmoshub-4',
    };
    rerender(<TransactionComposer positions={[]} />);

    expect(screen.getByRole('button', { name: 'Confirm & Broadcast' })).toBeDisabled();
    expect(transactionMocks.executeBondTransaction).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Confirm Transaction' })).toHaveTextContent(
      'Wallet is connected to the wrong network. Switch to THORChain mainnet before preview or broadcast.'
    );
  });

  it('blocks BOND memo copy and preview when source confidence is degraded', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText },
    });

    render(<TransactionComposer positions={[]} sourceSafety={degradedSourceSafety} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');

    expect(screen.getByText('THORNode source confidence must be fresh before copying a BOND memo.')).toBeInTheDocument();
    expect(screen.getByText('BOND copy stays disabled until THORNode source confidence is fresh.')).toBeInTheDocument();
    expect(screen.queryByText(`BOND:${NODE_ADDRESS}`)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Memo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Review Transaction' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'THORNode source confidence is degraded. Do not copy, preview, or broadcast until source confidence is fresh.'
    );

    await user.click(screen.getByRole('button', { name: 'Copy Memo' }));

    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(transactionMocks.executeBondTransaction).not.toHaveBeenCalled();
  });

  it('blocks UNBOND memo copy when source confidence cannot prove standby eligibility', () => {
    mocks.searchParams = new URLSearchParams(`action=unbond&node=${NODE_ADDRESS}&amount=10`);

    render(<TransactionComposer positions={[standbyPosition]} sourceSafety={degradedSourceSafety} />);

    expect(screen.getByRole('button', { name: 'UNBOND' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('THORNode source confidence must be fresh before copying an UNBOND memo.')).toBeInTheDocument();
    expect(screen.getByText('UNBOND copy stays disabled until THORNode can prove standby eligibility.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Memo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Review Transaction' })).toBeDisabled();
    expect(transactionMocks.executeUnbondTransaction).not.toHaveBeenCalled();
  });

  it('submits a connected XDEFI advanced BOND payload after preview confirmation', async () => {
    const user = userEvent.setup();
    mocks.wallet.walletType = 'xdefi';

    render(<TransactionComposer positions={[]} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '3.25');
    await user.click(screen.getByRole('button', { name: 'Advanced: provider address / operator fee' }));
    changeInput('Provider Address (optional)', PROVIDER_ADDRESS);
    changeInput('Operator Fee BPS (optional)', '1000');
    await user.click(screen.getByRole('button', { name: 'Review Transaction' }));
    await user.click(screen.getByRole('button', { name: 'Confirm & Broadcast' }));

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
    changeInput('Amount to Unbond', '10');
    await user.click(screen.getByRole('button', { name: 'Review Transaction' }));
    expect(screen.getAllByText(`UNBOND:${NODE_ADDRESS}:1000000000`)).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Confirm & Broadcast' }));

    expect(transactionMocks.executeUnbondTransaction).toHaveBeenCalledWith({
      type: 'UNBOND',
      nodeAddress: NODE_ADDRESS,
      amount: '10',
      memo: `UNBOND:${NODE_ADDRESS}:1000000000`,
      walletType: 'vultisig',
    }, WALLET_ADDRESS);
  });
});
