import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SWRConfig, useSWRConfig } from 'swr';
import React from 'react';
import { TransactionHistory } from '../transaction-history';
import * as midgard from '@/lib/api/midgard';

vi.mock('@/lib/api/midgard');

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(SWRConfig, { value: { provider: () => new Map(), dedupingInterval: 0 } }, children);

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

function TransactionHistoryWithRefresh({ address }: { address: string }) {
  const { mutate } = useSWRConfig();

  return (
    <>
      <button
        type="button"
        onClick={() => void mutate(['transaction-history', address])}
      >
        Force Midgard refresh
      </button>
      <TransactionHistory address={address} />
    </>
  );
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

  it('warns when Midgard history is a partial recent-action window', async () => {
    vi.mocked(midgard.getActions).mockResolvedValue({
      actions: Array.from({ length: 50 }, (_, index) => mockBondAction({
        date: String(1711860190834567113n + BigInt(index)),
        in: [
          {
            address: HISTORY_ADDRESS,
            coins: [{ asset: 'THOR.RUNE', amount: '10000000000' }],
            txID: `PARTIAL${index}`,
          },
        ],
      })),
      count: '76',
    } as unknown as midgard.ActionsResponseRaw);

    render(<TransactionHistory address={HISTORY_ADDRESS} />, { wrapper });

    const source = await screen.findByLabelText('Transaction history source');
    expect(source).toHaveTextContent('Partial Midgard window');
    expect(source).toHaveTextContent('Loaded 50 of 76 recent Midgard actions before filtering to BOND/UNBOND.');
    expect(source).toHaveTextContent('50 matching BOND/UNBOND actions rendered from the recent window.');
    expect(source).not.toHaveTextContent('50 matching BOND/UNBOND actions rendered.');
  });

  it('loads older Midgard actions when a partial recent-action window is available', async () => {
    vi.mocked(midgard.getActions).mockImplementation(async (_address, _limit, _actionTypes, _typeParam, offset) => ({
      actions: offset === 50
        ? Array.from({ length: 26 }, (_, index) => mockBondAction({
          date: String(1711860190834567113n - BigInt(index + 50)),
          in: [
            {
              address: HISTORY_ADDRESS,
              coins: [{ asset: 'THOR.RUNE', amount: '10000000000' }],
              txID: `OLDER${index}`,
            },
          ],
        }))
        : Array.from({ length: 50 }, (_, index) => mockBondAction({
          date: String(1711860190834567113n + BigInt(index)),
          in: [
            {
              address: HISTORY_ADDRESS,
              coins: [{ asset: 'THOR.RUNE', amount: '10000000000' }],
              txID: `PARTIAL${index}`,
            },
          ],
        })),
      count: '76',
    }) as unknown as midgard.ActionsResponseRaw);

    render(<TransactionHistory address={HISTORY_ADDRESS} />, { wrapper });

    expect(await screen.findByText('Partial Midgard window')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load older Midgard actions' }));

    await waitFor(() => {
      expect(midgard.getActions).toHaveBeenCalledWith(HISTORY_ADDRESS, 50, 'bond,unbond', 'txType', 50);
    });

    const source = await screen.findByLabelText('Transaction history source');
    expect(source).toHaveTextContent('Loaded all 76 reported Midgard actions before filtering to BOND/UNBOND.');
    expect(source).toHaveTextContent('76 matching BOND/UNBOND actions rendered.');
    expect(screen.queryByRole('button', { name: 'Load older Midgard actions' })).not.toBeInTheDocument();
  });

  it('drops loaded older pages when Midgard refreshes the recent action window', async () => {
    let firstPagePrefix = 'PARTIAL';
    let firstPageCount = '76';

    vi.mocked(midgard.getActions).mockImplementation(async (_address, _limit, _actionTypes, _typeParam, offset) => ({
      actions: offset === 50
        ? Array.from({ length: 26 }, (_, index) => mockBondAction({
          date: String(1711860190834567113n - BigInt(index + 50)),
          in: [
            {
              address: HISTORY_ADDRESS,
              coins: [{ asset: 'THOR.RUNE', amount: '10000000000' }],
              txID: `OLDER${index}`,
            },
          ],
        }))
        : Array.from({ length: 50 }, (_, index) => mockBondAction({
          date: String(1711860190834567113n + BigInt(index)),
          in: [
            {
              address: HISTORY_ADDRESS,
              coins: [{ asset: 'THOR.RUNE', amount: '10000000000' }],
              txID: `${firstPagePrefix}${index}`,
            },
          ],
        })),
      count: offset === 50 ? '76' : firstPageCount,
    }) as unknown as midgard.ActionsResponseRaw);

    render(<TransactionHistoryWithRefresh address={HISTORY_ADDRESS} />, { wrapper });

    expect(await screen.findByText('Partial Midgard window')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load older Midgard actions' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Transaction history source')).toHaveTextContent(
        'Loaded all 76 reported Midgard actions before filtering to BOND/UNBOND.'
      );
    });
    expect(screen.getAllByText('OLDER0').length).toBeGreaterThan(0);

    firstPagePrefix = 'REFRESHED';
    firstPageCount = '77';
    fireEvent.click(screen.getByRole('button', { name: 'Force Midgard refresh' }));

    const source = await screen.findByLabelText('Transaction history source');
    await waitFor(() => {
      expect(source).toHaveTextContent('Loaded 50 of 77 recent Midgard actions before filtering to BOND/UNBOND.');
    });
    expect(source).toHaveTextContent('Midgard refreshed its recent action window');
    expect(source).toHaveTextContent('Load older actions again before treating history as complete.');
    expect(screen.queryAllByText('OLDER0')).toHaveLength(0);
    expect(screen.getAllByText('REFRESHED0').length).toBeGreaterThan(0);
  });

  it('stops loading older actions at the local history cap with explicit partial-history copy', async () => {
    vi.mocked(midgard.getActions).mockImplementation(async (_address, _limit, _actionTypes, _typeParam, offset = 0) => ({
      actions: Array.from({ length: 50 }, (_, index) => mockBondAction({
        date: String(1711860190834567113n - BigInt(offset + index)),
        in: [
          {
            address: HISTORY_ADDRESS,
            coins: [{ asset: 'THOR.RUNE', amount: '10000000000' }],
            txID: `PAGE${offset + index}`,
          },
        ],
      })),
      count: '300',
    }) as unknown as midgard.ActionsResponseRaw);

    render(<TransactionHistory address={HISTORY_ADDRESS} />, { wrapper });

    const source = await screen.findByLabelText('Transaction history source');
    expect(source).toHaveTextContent('Loaded 50 of 300 recent Midgard actions before filtering to BOND/UNBOND.');

    for (const expectedLoadedCount of [100, 150, 200, 250]) {
      fireEvent.click(screen.getByRole('button', { name: 'Load older Midgard actions' }));

      await waitFor(() => {
        expect(source).toHaveTextContent(
          `Loaded ${expectedLoadedCount} of 300 recent Midgard actions before filtering to BOND/UNBOND.`
        );
      });
    }

    expect(midgard.getActions).toHaveBeenCalledWith(HISTORY_ADDRESS, 50, 'bond,unbond', 'txType', 200);
    expect(midgard.getActions).not.toHaveBeenCalledWith(HISTORY_ADDRESS, 50, 'bond,unbond', 'txType', 250);
    expect(source).toHaveTextContent('Local history cap reached');
    expect(source).toHaveTextContent('Heimdall keeps the latest 250 Midgard actions loaded locally for responsiveness.');
    expect(source).toHaveTextContent('Use this as recent context, not complete history.');
    expect(screen.queryByRole('button', { name: 'Load older Midgard actions' })).not.toBeInTheDocument();
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
