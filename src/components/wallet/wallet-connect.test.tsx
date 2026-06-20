import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WalletConnect } from './wallet-connect';

const STALE_SIGNER_REFRESH_ERROR =
  'Keplr account changed, but Heimdall could not refresh the signer. Reconnect wallet before preview or broadcast.';

const walletMocks = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  state: {
    address: null as string | null,
    availableWallets: null as 'keplr' | 'xdefi' | 'vultisig' | null,
    chainId: null as string | null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    error: null as string | null,
    isConnected: false,
    isConnecting: false,
    isNetworkMismatch: false,
    networkMismatch: {
      actual: null as string | null,
      expected: 'thorchain-1',
      hasMismatch: false,
    },
    walletType: null as 'keplr' | 'xdefi' | 'vultisig' | null,
  },
}));

vi.mock('@/lib/hooks/use-wallet', () => ({
  useWalletContext: () => walletMocks.state,
}));

describe('WalletConnect', () => {
  beforeEach(() => {
    walletMocks.connect.mockReset();
    walletMocks.disconnect.mockReset();
    Object.assign(walletMocks.state, {
      address: null,
      availableWallets: null,
      chainId: null,
      connect: walletMocks.connect,
      disconnect: walletMocks.disconnect,
      error: null,
      isConnected: false,
      isConnecting: false,
      isNetworkMismatch: false,
      networkMismatch: {
        actual: null,
        expected: 'thorchain-1',
        hasMismatch: false,
      },
      walletType: null,
    });
  });

  it('keeps wallet choices visible but disabled when no provider is detected', async () => {
    const user = userEvent.setup();
    render(<WalletConnect />);

    const trigger = screen.getByTestId('wallet-connect-button');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Wallet connection options' })).toBeVisible();
    expect(screen.getByText(/No wallet provider was detected in this browser/)).toBeVisible();

    const providerHelp = 'No wallet provider was detected in this browser. Install or unlock Keplr, XDEFI, or Vultisig to enable connection.';
    const keplr = screen.getByRole('menuitem', { name: 'Keplr Wallet' });
    const xdefi = screen.getByRole('menuitem', { name: 'XDEFI Wallet' });
    const vultisig = screen.getByRole('menuitem', { name: 'Vultisig Wallet' });

    expect(keplr).toBeDisabled();
    expect(xdefi).toBeDisabled();
    expect(vultisig).toBeDisabled();
    expect(keplr).toHaveAccessibleDescription(providerHelp);

    await user.click(keplr);
    expect(walletMocks.connect).not.toHaveBeenCalled();
  });

  it('enables the detected wallet option without no-provider guidance', async () => {
    walletMocks.state.availableWallets = 'keplr';
    const user = userEvent.setup();
    render(<WalletConnect />);

    await user.click(screen.getByTestId('wallet-connect-button'));

    const keplr = screen.getByRole('menuitem', { name: 'Keplr Wallet' });
    expect(keplr).toBeEnabled();
    expect(keplr).not.toHaveAccessibleDescription(/No wallet provider was detected/);
    expect(screen.queryByRole('menuitem', { name: 'XDEFI Wallet' })).not.toBeInTheDocument();

    await user.click(keplr);
    expect(walletMocks.connect).toHaveBeenCalledWith('keplr');
  });

  it('surfaces disconnected wallet errors before opening the menu', () => {
    walletMocks.state.availableWallets = 'keplr';
    walletMocks.state.error = STALE_SIGNER_REFRESH_ERROR;

    render(<WalletConnect />);

    const trigger = screen.getByTestId('wallet-connect-button');
    expect(trigger).toHaveAccessibleDescription(STALE_SIGNER_REFRESH_ERROR);
    expect(screen.getByRole('status')).toHaveTextContent(STALE_SIGNER_REFRESH_ERROR);
    expect(screen.queryByRole('menu', { name: 'Wallet connection options' })).not.toBeInTheDocument();
  });

  it('makes wallet network mismatch actionable', async () => {
    walletMocks.state.address = 'thor1qgpqyqszqgpqyqszqgpqyqszqgpqyqsz9s7qn4';
    walletMocks.state.availableWallets = 'keplr';
    walletMocks.state.chainId = 'cosmoshub-4';
    walletMocks.state.error = 'Network mismatch: Expected thorchain-1, got cosmoshub-4';
    walletMocks.state.isConnected = false;
    walletMocks.state.isNetworkMismatch = true;
    walletMocks.state.networkMismatch = {
      actual: 'cosmoshub-4',
      expected: 'thorchain-1',
      hasMismatch: true,
    };
    walletMocks.state.walletType = 'keplr';
    const user = userEvent.setup();

    render(<WalletConnect />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Wallet network mismatch');
    expect(alert).toHaveTextContent('Wallet reports cosmoshub-4; THORChain mainnet expects thorchain-1.');
    expect(alert).toHaveTextContent('Switch to THORChain mainnet before preview or broadcast.');
    expect(screen.queryByText('Network mismatch')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reconnect wallet' }));
    expect(walletMocks.connect).toHaveBeenCalledWith('keplr');

    await user.click(screen.getByRole('button', { name: 'Clear wallet state' }));
    expect(walletMocks.disconnect).toHaveBeenCalled();
  });

  it('closes the wallet menu with Escape and returns focus to the trigger', async () => {
    walletMocks.state.availableWallets = 'keplr';
    const user = userEvent.setup();
    render(<WalletConnect />);

    const trigger = screen.getByTestId('wallet-connect-button');
    await user.click(trigger);
    expect(screen.getByRole('menu', { name: 'Wallet connection options' })).toBeVisible();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu', { name: 'Wallet connection options' })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });
});
