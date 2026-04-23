import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SWRConfig } from 'swr';
import React from 'react';
import { TransactionHistory } from '../transaction-history';
import * as midgard from '@/lib/api/midgard';

vi.mock('@/lib/api/midgard');

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

describe('TransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resyncs local address state when the prop changes', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({ actions: [] } as any);

    const { rerender } = render(<TransactionHistory address="ADDR_ONE" />, { wrapper });

    expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe('ADDR_ONE');

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith('ADDR_ONE', 50, 'bond,unbond,leave'));

    rerender(<TransactionHistory address="ADDR_TWO" />);

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe('ADDR_TWO');
    });

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith('ADDR_TWO', 50, 'bond,unbond,leave'));
  });

  it('handles null address prop correctly', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({ actions: [] } as any);

    const { rerender } = render(<TransactionHistory address={null} />, { wrapper });

    expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Enter a THORChain address to view transaction history')).toBeTruthy();

    rerender(<TransactionHistory address="ADDR_ONE" />);

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe('ADDR_ONE');
    });

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith('ADDR_ONE', 50, 'bond,unbond,leave'));
  });

  it('updates SWR key when address changes via input', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({ actions: [] } as any);

    render(<TransactionHistory address="ADDR_ONE" />, { wrapper });

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith('ADDR_ONE', 50, 'bond,unbond,leave'));

    const input = screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'ADDR_TWO' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe('ADDR_TWO');
    });

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith('ADDR_TWO', 50, 'bond,unbond,leave'));
  });

  it('handles empty string address prop correctly', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({ actions: [] } as any);

    const { rerender } = render(<TransactionHistory address="" />, { wrapper });

    expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Enter a THORChain address to view transaction history')).toBeTruthy();

    rerender(<TransactionHistory address="ADDR_ONE" />);

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe('ADDR_ONE');
    });

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith('ADDR_ONE', 50, 'bond,unbond,leave'));
  });

  it('renders bond history actions when Midgard returns refund actions with bond txType metadata', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({
      actions: [
        {
          type: 'refund',
          date: '1711860190834567113',
          height: '15341504',
          pools: [],
          memo: '',
          tx: {
            type: 'transfer',
            address: 'thor1xekke0x6qu8w7vyhxy99puzu049d3k0pexpr30',
            coins: [],
            txID: '',
            chain: 'THOR',
            fromAddress: 'thor1xekke0x6qu8w7vyhxy99puzu049d3k0pexpr30',
          },
          status: 'success',
          in: [
            {
              address: 'thor1xekke0x6qu8w7vyhxy99puzu049d3k0pexpr30',
              coins: [{ asset: 'THOR.RUNE', amount: '10000000000' }],
              txID: '26DC514825C9288925A5CE8C98B159278F94865766425DFDAA07FD19E7574F47',
            },
          ],
          out: [
            {
              address: 'thor1xekke0x6qu8w7vyhxy99puzu049d3k0pexpr30',
              coins: [{ asset: 'THOR.RUNE', amount: '9998000000' }],
              txID: '',
            },
          ],
          metadata: {
            refund: {
              memo: 'BOND:thor1zfy2dm8urvwzc6shcmfpewdxamf8v35zq593ev',
              txType: 'bond',
              reason: 'bond address is not valid for node account: unknown request',
            },
          },
        },
      ],
      count: '1',
    } as any);

    render(<TransactionHistory address="thor1xekke0x6qu8w7vyhxy99puzu049d3k0pexpr30" />, { wrapper });

    expect((await screen.findAllByText('BOND')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('100.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/thor1zfy2dm8/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('No BOND/UNBOND transactions found for this address')).toBeNull();
  });
});
