import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TransactionComposer } from './transaction-composer';
import type { BondPosition } from '@/lib/types/node';
import type { TransactionSourceSafety } from '@/lib/dashboard/transaction-preflight';

const mocks = vi.hoisted(() => ({
  wallet: {
    address: 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4' as string | null,
    walletType: 'keplr' as 'keplr' | 'xdefi' | 'vultisig' | 'ledger' | null,
    canBroadcastTransactions: true,
    chainId: 'thorchain-1',
    isConnected: true,
    isConnecting: false,
    error: null as string | null,
    networkMismatch: {
      hasMismatch: false,
      expected: 'thorchain-1',
      actual: 'thorchain-1',
    },
    availableWallets: ['keplr'] as ('keplr' | 'xdefi' | 'vultisig' | 'ledger')[],
    walletBroadcastUnavailableReason: null as string | null,
    walletOptions: [],
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
const STALE_SIGNER_REFRESH_ERROR =
  'Keplr account changed, but Heimdall could not refresh the signer. Reconnect wallet before preview or broadcast.';
const LEDGER_BROADCAST_UNAVAILABLE_MESSAGE =
  'Ledger is connected for THORChain address and balance review only. Heimdall does not broadcast BOND or UNBOND with Ledger until THORChain MsgDeposit signing is hardware-verified.';
const degradedSourceSafety: TransactionSourceSafety = {
  canCopyBondMemo: false,
  canCopyUnbondMemo: false,
  canPreview: false,
  detail: 'THORNode source check is degraded. Do not copy, preview, or broadcast until THORNode positions respond again.',
  itemSeverity: 'warning',
  status: 'Source check degraded',
  value: 'THORNode degraded',
};
const freshSourceSafety: TransactionSourceSafety = {
  canCopyBondMemo: true,
  canCopyUnbondMemo: true,
  canPreview: true,
  detail: 'THORNode positions responded for node status and unbond eligibility. Source availability is not transaction approval; wallet still presents the final payload and fee.',
  itemSeverity: 'checked',
  status: 'Source responding',
  value: 'THORNode responding',
};

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
  mocks.wallet.address = WALLET_ADDRESS;
  mocks.wallet.walletType = 'keplr';
  mocks.wallet.canBroadcastTransactions = true;
  mocks.wallet.walletBroadcastUnavailableReason = null;
  mocks.wallet.isConnected = true;
  mocks.wallet.error = null;
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
  it('fails closed when transaction source safety is not provided', () => {
    render(<TransactionComposer positions={[]} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');

    expect(screen.getByText('THORNode positions must respond before copying a BOND memo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Memo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Review Transaction' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Transaction source check was not provided. Reload the transactions page before copying, previewing, or broadcasting.'
    );
    expect(transactionMocks.executeBondTransaction).not.toHaveBeenCalled();
  });

  it('does not show validation errors before the operator edits the composer', () => {
    render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    expect(screen.getByLabelText('Node Address')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByLabelText('Bond Amount')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps incomplete BOND memos out of the copy path', () => {
    render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    expect(screen.getByText('Enter a valid node address before copying a BOND memo.')).toBeInTheDocument();
    expect(screen.getByText('Bond payload minimum:')).toBeInTheDocument();
    expect(screen.getByText('1 RUNE')).toBeInTheDocument();
    expect(screen.getByText('Network fees are dynamic and shown by the wallet before approval/broadcast.')).toBeInTheDocument();
    expect(screen.queryByText('Network fees are dynamic and confirmed by the wallet before broadcast.')).not.toBeInTheDocument();
    expect(screen.queryByText('Minimum bond transaction reserve:')).not.toBeInTheDocument();
    expect(screen.queryByText('1.02 RUNE')).not.toBeInTheDocument();
    expect(screen.queryByText('BOND:')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy Memo' })).toBeDisabled();
  });

  it('describes UNBOND as a zero-transfer deposit payload with memo amount semantics', async () => {
    const user = userEvent.setup();

    render(<TransactionComposer positions={[standbyPosition]} sourceSafety={freshSourceSafety} />);

    await user.click(screen.getByRole('button', { name: 'UNBOND' }));

    expect(screen.getByText('UNBOND uses a zero-RUNE deposit payload.')).toBeInTheDocument();
    expect(screen.getByText('The requested amount is encoded in the memo in 1e8 base units; the wallet presents any network fee before approval/broadcast.')).toBeInTheDocument();
    expect(screen.queryByText('The requested amount is encoded in the memo in 1e8 base units; wallet/network fees are confirmed before broadcast.')).not.toBeInTheDocument();
    expect(screen.queryByText('Minimum bond transaction reserve:')).not.toBeInTheDocument();
    expect(screen.queryByText('1.02 RUNE')).not.toBeInTheDocument();
  });

  it('prefills a BOND deep link before operator interaction', () => {
    render(
      <TransactionComposer
        positions={[]}
        sourceSafety={freshSourceSafety}
        action="bond"
        nodeParam={NODE_ADDRESS}
        amountParam="2"
      />
    );

    const bondMode = screen.getByRole('button', { name: 'BOND' });
    expect(bondMode).toHaveAttribute('aria-pressed', 'true');
    expect(bondMode).toHaveClass('bg-sky-600');
    expect(bondMode).not.toHaveClass('bg-emerald-600');
    expect(screen.getByLabelText('Node Address')).toHaveValue(NODE_ADDRESS);
    expect(screen.getByLabelText('Bond Amount')).toHaveValue('2');
    expect(screen.getByText(`BOND:${NODE_ADDRESS}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review Transaction' })).toBeEnabled();
  });

  it('prefills an UNBOND deep link with memo amount semantics before operator interaction', () => {
    render(
      <TransactionComposer
        positions={[standbyPosition]}
        sourceSafety={freshSourceSafety}
        action="unbond"
        nodeParam={NODE_ADDRESS}
        amountParam="10"
      />
    );

    expect(screen.getByRole('button', { name: 'UNBOND' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Node Address')).toHaveValue(NODE_ADDRESS);
    expect(screen.getByLabelText('Amount to Unbond')).toHaveValue('10');
    expect(screen.getByText(`UNBOND:${NODE_ADDRESS}:1000000000`)).toBeInTheDocument();
    expect(screen.getByText('UNBOND memo can be copied for wallet review; amount is encoded in 1e8 base units.')).toBeInTheDocument();
    expect(screen.queryByText('UNBOND memo is ready to copy with the amount encoded in 1e8 base units.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review Transaction' })).toBeEnabled();
  });

  it('follows page-owned transaction mode changes so preflight and composer stay aligned', () => {
    const { rerender } = render(
      <TransactionComposer
        positions={[standbyPosition]}
        sourceSafety={freshSourceSafety}
        action="unbond"
        nodeParam={NODE_ADDRESS}
        amountParam="10"
      />
    );

    expect(screen.getByRole('button', { name: 'UNBOND' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Amount to Unbond')).toHaveValue('10');

    rerender(
      <TransactionComposer
        positions={[standbyPosition]}
        sourceSafety={freshSourceSafety}
        action="bond"
        nodeParam={NODE_ADDRESS}
        amountParam="2"
      />
    );

    expect(screen.getByRole('button', { name: 'BOND' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Bond Amount')).toHaveValue('2');
    expect(screen.getByText(`BOND:${NODE_ADDRESS}`)).toBeInTheDocument();
  });

  it('enables memo copy only after the BOND memo itself is valid', async () => {
    render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    changeInput('Node Address', NODE_ADDRESS);

    expect(screen.getByText(`BOND:${NODE_ADDRESS}`)).toBeInTheDocument();
    expect(screen.getByText('Memo can be copied for wallet review. Your wallet will present amount and fees before approval/broadcast.')).toBeInTheDocument();
    expect(screen.queryByText('Memo can be copied for wallet review. Your wallet will confirm amount and fees before broadcast.')).not.toBeInTheDocument();
    expect(screen.queryByText('Memo is ready to copy. Your wallet will confirm amount and fees before broadcast.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Copy Memo' })).toBeEnabled();
  });

  it('allows local BOND memo copy without saying source checks passed when preview is gated', () => {
    render(
      <TransactionComposer
        positions={[]}
        sourceSafety={{
          ...freshSourceSafety,
          canPreview: false,
          detail: 'THORNode positions are still loading. Memo copy stays local until source data responds.',
        }}
      />
    );

    changeInput('Node Address', NODE_ADDRESS);

    expect(screen.getByRole('button', { name: 'Copy Memo' })).toBeEnabled();
    expect(screen.getByText('Memo can be copied for wallet review. Preview and broadcast still wait until THORNode positions are responding.')).toBeInTheDocument();
    expect(screen.queryByText(/source check to pass/i)).not.toBeInTheDocument();
  });

  it('shows primary copy success feedback after copying a valid BOND memo', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText },
    });

    render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    changeInput('Node Address', NODE_ADDRESS);
    await user.click(screen.getByRole('button', { name: 'Copy Memo' }));

    expect(writeText).toHaveBeenCalledWith(`BOND:${NODE_ADDRESS}`);
    expect(screen.getByRole('button', { name: 'Memo copied' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Success!');
    expect(screen.getByRole('status')).toHaveTextContent('Memo copied to your clipboard. Paste it into your wallet only after reviewing amount, memo, and fee.');
    expect(screen.getByRole('status')).not.toHaveTextContent('Paste it into your wallet when you are ready.');
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

    render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    changeInput('Node Address', NODE_ADDRESS);
    await user.click(screen.getByRole('button', { name: 'Copy Memo' }));

    expect(screen.getByRole('status')).toHaveTextContent('Copy Failed');
    expect(screen.getByRole('status')).toHaveTextContent('Copy failed. Select the memo above and copy it manually.');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('does not show untouched bond amount errors after only the node address changes', async () => {
    render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    changeInput('Node Address', NODE_ADDRESS);

    expect(screen.getByLabelText('Bond Amount')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('Amount must be a positive RUNE value with up to 8 decimals')).not.toBeInTheDocument();
  });

  it('shows field validation after the operator edits invalid values', async () => {
    const user = userEvent.setup();

    render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    await user.type(screen.getByLabelText('Node Address'), 'bad-node');
    await user.type(screen.getByLabelText('Bond Amount'), '0');

    expect(screen.getAllByText('Node address must be a valid THORChain address').length).toBeGreaterThan(0);
    expect(screen.getByText('Amount must be a positive RUNE value with up to 8 decimals')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Node address must be a valid THORChain address');
  });

  it('blocks signing and surfaces validation when operator fee is entered without provider', async () => {
    const user = userEvent.setup();

    render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

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

    render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

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

    render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');
    await user.click(screen.getByRole('button', { name: 'Review Transaction' }));
    const dialog = screen.getByRole('dialog', { name: 'Wallet Broadcast Review' });
    const typeLabel = within(dialog).getByText('BOND', { exact: true });
    expect(typeLabel).toHaveClass('text-sky-600');
    expect(typeLabel).not.toHaveClass('text-emerald-600');
    expect(within(dialog).getByText('Connected wallet')).toBeInTheDocument();
    expect(within(dialog).getByText(WALLET_ADDRESS)).toBeInTheDocument();
    expect(within(dialog).getByText('Target node')).toBeInTheDocument();
    expect(within(dialog).getByText(NODE_ADDRESS)).toBeInTheDocument();
    expect(within(dialog).getByText('Wallet transfer amount')).toBeInTheDocument();
    expect(within(dialog).getByText('2 RUNE')).toBeInTheDocument();
    expect(within(dialog).queryByText('Requested Amount')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Request Wallet Broadcast' }));

    expect(transactionMocks.executeBondTransaction).toHaveBeenCalledWith({
      type: 'BOND',
      nodeAddress: NODE_ADDRESS,
      amount: '2',
      memo: `BOND:${NODE_ADDRESS}`,
      walletType: 'keplr',
    }, WALLET_ADDRESS);
    expect(await screen.findByText('bond-hash')).toBeInTheDocument();
  });

  it('warns large BOND reviews without implying Heimdall confirmation is approval', async () => {
    const user = userEvent.setup();

    render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2500');
    await user.click(screen.getByRole('button', { name: 'Review Transaction' }));

    const dialog = screen.getByRole('dialog', { name: 'Wallet Broadcast Review' });
    expect(dialog).toHaveTextContent('Large Transaction');
    expect(dialog).toHaveTextContent(
      'This transaction involves a significant amount of RUNE. Recheck the target node, memo, transfer amount, and wallet-presented fee. Approve only if the wallet payload matches this review.'
    );
    expect(dialog).not.toHaveTextContent('before confirming');
    expect(screen.getByRole('button', { name: 'Request Wallet Broadcast' })).toBeEnabled();
  });

  it('keeps disconnected wallet guidance local while allowing memo copy for wallet review', () => {
    mocks.wallet.address = null;
    mocks.wallet.walletType = null;
    mocks.wallet.isConnected = false;

    render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');

    expect(screen.getByRole('button', { name: 'Copy Memo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Wallet required' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Wallet required' })).toHaveAccessibleDescription(
      'Connect a wallet for preview and broadcast. Memo copy stays local for manual wallet review.'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Connect a wallet for preview and broadcast. Memo copy stays local for manual wallet review.'
    );
    expect(screen.getByRole('status')).not.toHaveTextContent('Memo copy remains available');
    expect(transactionMocks.executeBondTransaction).not.toHaveBeenCalled();
  });

  it('keeps Ledger connected address review copy-only until broadcast signing is verified', () => {
    mocks.wallet.walletType = 'ledger';
    mocks.wallet.canBroadcastTransactions = false;
    mocks.wallet.walletBroadcastUnavailableReason = LEDGER_BROADCAST_UNAVAILABLE_MESSAGE;

    render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');

    expect(screen.getByRole('button', { name: 'Copy Memo' })).toBeEnabled();
    const broadcastUnavailable = screen.getByRole('button', { name: 'Broadcast unavailable' });
    expect(broadcastUnavailable).toBeDisabled();
    expect(broadcastUnavailable).toHaveAccessibleDescription(LEDGER_BROADCAST_UNAVAILABLE_MESSAGE);
    expect(screen.getByRole('status')).toHaveTextContent(LEDGER_BROADCAST_UNAVAILABLE_MESSAGE);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(transactionMocks.executeBondTransaction).not.toHaveBeenCalled();
  });

  it('explains a wrong-network wallet state and keeps preview disabled', () => {
    mocks.wallet.isNetworkMismatch = true;
    mocks.wallet.networkMismatch = {
      hasMismatch: true,
      expected: 'thorchain-1',
      actual: 'cosmoshub-4',
    };

    render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

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

    render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

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
    const { rerender } = render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');
    await user.click(screen.getByRole('button', { name: 'Review Transaction' }));

    expect(screen.getByRole('dialog', { name: 'Wallet Broadcast Review' })).toBeInTheDocument();

    mocks.wallet.isNetworkMismatch = true;
    mocks.wallet.networkMismatch = {
      hasMismatch: true,
      expected: 'thorchain-1',
      actual: 'cosmoshub-4',
    };
    rerender(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    expect(screen.getByRole('button', { name: 'Request Wallet Broadcast' })).toBeDisabled();
    expect(transactionMocks.executeBondTransaction).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Wallet Broadcast Review' })).toHaveTextContent(
      'Wallet is connected to the wrong network. Switch to THORChain mainnet before preview or broadcast.'
    );
  });

  it('does not broadcast when the connected wallet account changes after preview opens', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');
    await user.click(screen.getByRole('button', { name: 'Review Transaction' }));

    expect(screen.getByRole('dialog', { name: 'Wallet Broadcast Review' })).toBeInTheDocument();

    mocks.wallet.address = 'thor1changedwallet000000000000000000000000000';
    rerender(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    expect(screen.getByRole('button', { name: 'Request Wallet Broadcast' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Request Wallet Broadcast' }));
    expect(transactionMocks.executeBondTransaction).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Wallet Broadcast Review' })).toHaveTextContent(
      'Connected wallet changed after preview opened. Close and review the transaction with the current wallet before broadcasting.'
    );
  });

  it('removes wallet-specific authorization copy when the wallet disconnects after preview opens', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');
    await user.click(screen.getByRole('button', { name: 'Review Transaction' }));

    const dialog = screen.getByRole('dialog', { name: 'Wallet Broadcast Review' });
    expect(dialog).toHaveTextContent('opens your Keplr wallet for final review');
    expect(dialog).toHaveTextContent('Approve in the wallet only if the payload, memo, amount, and network fee match.');
    expect(dialog).not.toHaveTextContent('By confirming');
    expect(dialog).not.toHaveTextContent('authorize this THORChain deposit transaction');

    mocks.wallet.address = null;
    mocks.wallet.walletType = null;
    mocks.wallet.isConnected = false;
    rerender(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    expect(screen.getByRole('button', { name: 'Request Wallet Broadcast' })).toBeDisabled();
    expect(dialog).toHaveTextContent(
      'Connect a wallet for preview and broadcast. Memo copy stays local for manual wallet review.'
    );
    expect(dialog).toHaveTextContent(
      'Open wallet review only after your wallet presents the final THORChain deposit payload and network fee.'
    );
    expect(dialog).not.toHaveTextContent('opens your Keplr wallet for final review');
    expect(transactionMocks.executeBondTransaction).not.toHaveBeenCalled();
  });

  it('surfaces a failed Keplr signer refresh as the preview blocker', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');
    await user.click(screen.getByRole('button', { name: 'Review Transaction' }));

    const dialog = screen.getByRole('dialog', { name: 'Wallet Broadcast Review' });
    expect(dialog).toHaveTextContent('opens your Keplr wallet for final review');

    mocks.wallet.address = null;
    mocks.wallet.walletType = null;
    mocks.wallet.isConnected = false;
    mocks.wallet.error = STALE_SIGNER_REFRESH_ERROR;
    rerender(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    expect(screen.getByRole('button', { name: 'Request Wallet Broadcast' })).toBeDisabled();
    expect(dialog).toHaveTextContent(STALE_SIGNER_REFRESH_ERROR);
    expect(dialog).not.toHaveTextContent(
      'Connect a wallet for preview and broadcast. Memo copy stays local for manual wallet review.'
    );
    expect(transactionMocks.executeBondTransaction).not.toHaveBeenCalled();
  });

  it('blocks BOND memo copy and preview when source checks are degraded', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText },
    });

    render(<TransactionComposer positions={[]} sourceSafety={degradedSourceSafety} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '2');

    expect(screen.getByText('THORNode positions must respond before copying a BOND memo.')).toBeInTheDocument();
    expect(screen.getByText('BOND copy stays disabled until THORNode positions respond.')).toBeInTheDocument();
    expect(screen.queryByText(/fresh/i)).not.toBeInTheDocument();
    expect(screen.queryByText(`BOND:${NODE_ADDRESS}`)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Memo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Review Transaction' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'THORNode source check is degraded. Do not copy, preview, or broadcast until THORNode positions respond again.'
    );

    await user.click(screen.getByRole('button', { name: 'Copy Memo' }));

    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(transactionMocks.executeBondTransaction).not.toHaveBeenCalled();
  });

  it('blocks UNBOND memo copy when source checks cannot confirm standby eligibility', () => {
    render(
      <TransactionComposer
        positions={[standbyPosition]}
        sourceSafety={degradedSourceSafety}
        action="unbond"
        nodeParam={NODE_ADDRESS}
        amountParam="10"
      />
    );

    expect(screen.getByRole('button', { name: 'UNBOND' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('THORNode positions must respond before copying an UNBOND memo.')).toBeInTheDocument();
    expect(screen.getByText('UNBOND copy stays disabled until THORNode positions show standby eligibility.')).toBeInTheDocument();
    expect(screen.queryByText(/prove standby eligibility/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/fresh/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy Memo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Review Transaction' })).toBeDisabled();
    expect(transactionMocks.executeUnbondTransaction).not.toHaveBeenCalled();
  });

  it('submits a connected XDEFI advanced BOND payload after preview confirmation', async () => {
    const user = userEvent.setup();
    mocks.wallet.walletType = 'xdefi';

    render(<TransactionComposer positions={[]} sourceSafety={freshSourceSafety} />);

    changeInput('Node Address', NODE_ADDRESS);
    changeInput('Bond Amount', '3.25');
    await user.click(screen.getByRole('button', { name: 'Advanced: provider address / operator fee' }));
    changeInput('Provider Address (optional)', PROVIDER_ADDRESS);
    changeInput('Operator Fee BPS (optional)', '1000');
    await user.click(screen.getByRole('button', { name: 'Review Transaction' }));
    await user.click(screen.getByRole('button', { name: 'Request Wallet Broadcast' }));

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

    render(<TransactionComposer positions={[standbyPosition]} sourceSafety={freshSourceSafety} />);

    await user.click(screen.getByRole('button', { name: 'UNBOND' }));
    changeInput('Amount to Unbond', '10');
    await user.click(screen.getByRole('button', { name: 'Review Transaction' }));
    const dialog = screen.getByRole('dialog', { name: 'Wallet Broadcast Review' });
    expect(within(dialog).getByText('Wallet transfer amount')).toBeInTheDocument();
    expect(within(dialog).getByText('0 RUNE')).toBeInTheDocument();
    expect(within(dialog).getByText('Amount requested in memo')).toBeInTheDocument();
    expect(within(dialog).getByText('10 RUNE')).toBeInTheDocument();
    expect(within(dialog).queryByText('Requested Amount')).not.toBeInTheDocument();
    expect(screen.getAllByText(`UNBOND:${NODE_ADDRESS}:1000000000`)).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Request Wallet Broadcast' }));

    expect(transactionMocks.executeUnbondTransaction).toHaveBeenCalledWith({
      type: 'UNBOND',
      nodeAddress: NODE_ADDRESS,
      amount: '10',
      memo: `UNBOND:${NODE_ADDRESS}:1000000000`,
      walletType: 'vultisig',
    }, WALLET_ADDRESS);
  });
});
