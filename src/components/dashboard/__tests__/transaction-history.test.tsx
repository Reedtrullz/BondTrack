import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SWRConfig } from 'swr';
import React from 'react';
import { TransactionHistory } from '../transaction-history';
import * as midgard from '@/lib/api/midgard';

vi.mock('@/lib/api/midgard');

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

const ADDRESS_ONE = 'thor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4yeyjz';
const ADDRESS_TWO = 'thor1pc8qurswpc8qurswpc8qurswpc8qurswmv23u6';
const HISTORY_ADDRESS = 'thor1xekke0x6qu8w7vyhxy99puzu049d3k0pexpr30';
const HISTORY_NODE = 'thor1zfy2dm8urvwzc6shcmfpewdxamf8v35zq593ev';

function mockBondAction(overrides: Partial<midgard.ActionRaw> = {}): midgard.ActionRaw {
  return {
    type: 'bond',
    date: '1711860190834567113',
    height: '15341504',
    pools: [],
    memo: `BOND:${HISTORY_NODE}`,
    tx: {
      type: 'transfer',
      address: HISTORY_ADDRESS,
      coins: [],
      txID: '',
      chain: 'THOR',
      fromAddress: HISTORY_ADDRESS,
    },
    status: 'success',
    in: [
      {
        address: HISTORY_ADDRESS,
        coins: [{ asset: 'THOR.RUNE', amount: '10000000000' }],
        txID: '26DC514825C9288925A5CE8C98B159278F94865766425DFDAA07FD19E7574F47',
      },
    ],
    out: [],
    metadata: {
      bond: {
        memo: `BOND:${HISTORY_NODE}`,
        nodeAddress: HISTORY_NODE,
      },
    },
    ...overrides,
  };
}

describe('TransactionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('labels the address search and prevents blank history lookups', () => {
    vi.mocked(midgard.getActions).mockResolvedValue({ actions: [] } as unknown as midgard.ActionsResponseRaw);

    render(<TransactionHistory address={null} />, { wrapper });

    const input = screen.getByRole('textbox', { name: 'Transaction history address' });
    expect(input).toHaveAccessibleDescription('Paste the THORChain address whose BOND/UNBOND history you want to inspect.');
    expect(screen.getByRole('button', { name: 'Search transaction history' })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(midgard.getActions).not.toHaveBeenCalled();
  });

  it('resyncs local address state when the prop changes', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({ actions: [] } as unknown as midgard.ActionsResponseRaw);

    const { rerender } = render(<TransactionHistory address={ADDRESS_ONE} />, { wrapper });

    expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe(ADDRESS_ONE);

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith(ADDRESS_ONE, 50, 'bond,unbond', 'txType'));

    rerender(<TransactionHistory address={ADDRESS_TWO} />);

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe(ADDRESS_TWO);
    });

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith(ADDRESS_TWO, 50, 'bond,unbond', 'txType'));
  });

  it('handles null address prop correctly', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({ actions: [] } as unknown as midgard.ActionsResponseRaw);

    const { rerender } = render(<TransactionHistory address={null} />, { wrapper });

    expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Enter a THORChain address to view transaction history')).toBeTruthy();

    rerender(<TransactionHistory address={ADDRESS_ONE} />);

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe(ADDRESS_ONE);
    });

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith(ADDRESS_ONE, 50, 'bond,unbond', 'txType'));
  });

  it('updates SWR key when address changes via input', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({ actions: [] } as unknown as midgard.ActionsResponseRaw);

    render(<TransactionHistory address={ADDRESS_ONE} />, { wrapper });

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith(ADDRESS_ONE, 50, 'bond,unbond', 'txType'));

    const input = screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement;
    fireEvent.change(input, { target: { value: ADDRESS_TWO } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe(ADDRESS_TWO);
    });

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith(ADDRESS_TWO, 50, 'bond,unbond', 'txType'));
  });

  it('rejects malformed history lookups before calling Midgard', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({ actions: [] } as unknown as midgard.ActionsResponseRaw);

    render(<TransactionHistory address={null} />, { wrapper });

    const input = screen.getByRole('textbox', { name: 'Transaction history address' });
    fireEvent.change(input, { target: { value: 'not-a-thor-address' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search transaction history' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid THORChain address before loading history.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(midgard.getActions).not.toHaveBeenCalled();
  });

  it('shows Midgard provenance and recent-action scope when history loads', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({
      actions: [mockBondAction()],
      count: '1',
    } as unknown as midgard.ActionsResponseRaw);

    render(<TransactionHistory address={HISTORY_ADDRESS} />, { wrapper });

    const source = await screen.findByLabelText('Transaction history source');
    expect(source).toHaveTextContent('Midgard actions');
    expect(source).toHaveTextContent('Loaded');
    expect(source).toHaveTextContent('Shows up to 50 recent Midgard actions and filters to BOND/UNBOND.');
    expect(source).toHaveTextContent('Empty results do not prove older history is absent.');
    expect(source).toHaveTextContent('1 matching BOND/UNBOND action rendered.');
  });

  it('describes empty history as recent Midgard actions instead of complete absence', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({
      actions: [],
      count: '0',
    } as unknown as midgard.ActionsResponseRaw);

    render(<TransactionHistory address={ADDRESS_ONE} />, { wrapper });

    const source = await screen.findByLabelText('Transaction history source');
    expect(source).toHaveTextContent('No matching recent actions returned.');
    expect(screen.getByText('No recent BOND/UNBOND actions returned by Midgard for this address')).toBeInTheDocument();
    expect(screen.queryByText('No BOND/UNBOND transactions found for this address')).not.toBeInTheDocument();
  });

  it('handles empty string address prop correctly', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({ actions: [] } as unknown as midgard.ActionsResponseRaw);

    const { rerender } = render(<TransactionHistory address="" />, { wrapper });

    expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Enter a THORChain address to view transaction history')).toBeTruthy();

    rerender(<TransactionHistory address={ADDRESS_ONE} />);

    await waitFor(() => {
      expect((screen.getByPlaceholderText('Enter THORChain address') as HTMLInputElement).value).toBe(ADDRESS_ONE);
    });

    await waitFor(() => expect(midgard.getActions).toHaveBeenCalledWith(ADDRESS_ONE, 50, 'bond,unbond', 'txType'));
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
    } as unknown as midgard.ActionsResponseRaw);

    render(<TransactionHistory address="thor1xekke0x6qu8w7vyhxy99puzu049d3k0pexpr30" />, { wrapper });

    expect((await screen.findAllByText('BOND')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('100.00 RUNE').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/thor1zfy2dm8/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('No BOND/UNBOND transactions found for this address')).toBeNull();
  });

  it('labels malformed Midgard timestamps as unknown instead of rendering an invalid date', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({
      actions: [
        {
          type: 'bond',
          date: 'not-a-midgard-timestamp',
          height: '15341504',
          pools: [],
          memo: 'BOND:thor1zfy2dm8urvwzc6shcmfpewdxamf8v35zq593ev',
          status: 'success',
          in: [
            {
              address: 'thor1xekke0x6qu8w7vyhxy99puzu049d3k0pexpr30',
              coins: [{ asset: 'THOR.RUNE', amount: '10000000000' }],
              txID: '26DC514825C9288925A5CE8C98B159278F94865766425DFDAA07FD19E7574F47',
            },
          ],
          metadata: {
            bond: {
              memo: 'BOND:thor1zfy2dm8urvwzc6shcmfpewdxamf8v35zq593ev',
              nodeAddress: 'thor1zfy2dm8urvwzc6shcmfpewdxamf8v35zq593ev',
            },
          },
        },
      ],
      count: '1',
    } as unknown as midgard.ActionsResponseRaw);

    render(<TransactionHistory address="thor1xekke0x6qu8w7vyhxy99puzu049d3k0pexpr30" />, { wrapper });

    expect(await screen.findAllByText('Unknown')).toHaveLength(2);
    expect(screen.queryByText(/Invalid Date/i)).toBeNull();
  });
});
