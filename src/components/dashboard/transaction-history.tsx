'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { getActions, type ActionRaw } from '@/lib/api/midgard';
import { formatRuneAmount } from '@/lib/utils/formatters';
import { ExternalLink } from 'lucide-react';

interface Transaction {
  type: 'BOND' | 'UNBOND';
  amount: number;
  nodeAddress: string;
  timestamp: Date;
  txHash: string;
  status: string;
}

function getBondHistoryTxType(action: ActionRaw): 'bond' | 'unbond' | 'leave' | 'unstake' | null {
  const metadataTxType = action.metadata?.refund?.txType;

  if (metadataTxType === 'bond' || metadataTxType === 'unbond' || metadataTxType === 'leave' || metadataTxType === 'unstake') {
    return metadataTxType;
  }

  if (action.type === 'bond' || action.type === 'unbond' || action.type === 'leave' || action.type === 'unstake') {
    return action.type;
  }

  const memo = action.metadata?.bond?.memo || action.metadata?.refund?.memo || action.memo || '';

  if (memo.startsWith('BOND:')) return 'bond';
  if (memo.startsWith('UNBOND:')) return 'unbond';
  if (memo.startsWith('LEAVE:')) return 'leave';

  return null;
}

function getBondHistoryNodeAddress(action: ActionRaw): string {
  const memo = action.metadata?.bond?.memo || action.metadata?.refund?.memo || action.memo || '';
  const memoParts = memo.split(':');
  const memoNodeAddress = memoParts[1] || '';

  return action.metadata?.bond?.nodeAddress || memoNodeAddress || action.in?.[0]?.address || action.tx?.address || '';
}

function parseActions(actions: ActionRaw[]): Transaction[] {
  return actions
    .map((action) => ({ action, txType: getBondHistoryTxType(action) }))
    .filter((entry): entry is { action: ActionRaw; txType: 'bond' | 'unbond' | 'leave' | 'unstake' } => entry.txType !== null)
    .map(({ action, txType }): Transaction => {
      let amount = 0;
      
      if (action.in?.[0]?.coins) {
        const inCoin = action.in[0].coins.find((c) => c.asset === 'THOR.RUNE' || c.asset === 'THOR');
        if (inCoin) amount = parseFloat(inCoin.amount) / 1e8;
      }
      
      if (amount === 0 && action.tx?.coins) {
        const txCoin = action.tx.coins.find((c) => c.asset === 'THOR.RUNE' || c.asset === 'THOR');
        if (txCoin) amount = parseFloat(txCoin.amount) / 1e8;
      }
      
      if (amount === 0 && action.out?.[0]?.coins) {
        const outCoin = action.out[0].coins.find((c) => c.asset === 'THOR.RUNE' || c.asset === 'THOR');
        if (outCoin) amount = parseFloat(outCoin.amount) / 1e8;
      }
      
      const type = txType === 'bond' ? 'BOND' : 'UNBOND';
      const nodeAddress = getBondHistoryNodeAddress(action);
      const timestamp = action.date ? new Date(Number(action.date) / 1e9 * 1000) : new Date();
      
      return {
        type,
        amount,
        nodeAddress,
        timestamp,
        txHash: action.in?.[0]?.txID || action.tx?.txID || action.out?.[0]?.txID || '',
        status: action.status || 'unknown',
      };
    })
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

interface TransactionHistoryProps {
  address: string | null;
}

export function TransactionHistory({ address }: TransactionHistoryProps) {
  const [selectedAddress, setSelectedAddress] = useState<string>(address || '');
  const [inputAddress, setInputAddress] = useState<string>(address || '');

  // Sync state with prop changes
  useEffect(() => {
    setSelectedAddress(address || '');
    setInputAddress(address || '');
  }, [address]);

  // Use type= (not txType) param - txType is deprecated/unreliable
  const { data, error, isLoading } = useSWR(
    selectedAddress ? ['actions', selectedAddress] : null,
    async () => {
      // Fetch all bond/unbond/leave types - type= works, txType= returns empty
      const result = await getActions(selectedAddress, 50, 'bond,unbond,leave', 'type');
      return result;
    },
    { 
      refreshInterval: 60_000,
      onError: (err) => console.error('Actions API error:', err),
    }
  );

  const transactions = data?.actions ? parseActions(data.actions) : [];

  const handleSearch = () => {
    if (inputAddress.trim()) {
      setSelectedAddress(inputAddress.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter THORChain address"
          className="flex-1 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200"
        >
          Search
        </button>
      </div>

      {!selectedAddress ? (
        <div className="text-center py-8 text-zinc-500">
          Enter a THORChain address to view transaction history
        </div>
      ) : isLoading ? (
        <div className="text-center py-8 text-zinc-500">Loading transactions...</div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">Failed to load transactions</div>
          <div className="text-xs text-zinc-500 font-mono">{String(error)}</div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          No BOND/UNBOND transactions found for this address
        </div>
      ) : (
        <>
          <div className="block md:hidden space-y-3">
          {transactions.map((tx) => (
            <div key={tx.txHash} className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    tx.type === 'BOND'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {tx.type}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    tx.status === 'success'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : tx.status === 'failed'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {tx.status}
                </span>
              </div>
                <div>
                <div className="text-xs text-zinc-500">Amount</div>
                <div className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                  {formatRuneAmount(String(Math.floor(tx.amount * 1e8)))}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Node</div>
                <div className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  {tx.nodeAddress.length > 20
                    ? `${tx.nodeAddress.slice(0, 12)}...${tx.nodeAddress.slice(-8)}`
                    : tx.nodeAddress}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Date</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  {tx.timestamp.toLocaleDateString()} {tx.timestamp.toLocaleTimeString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Tx Hash</div>
                <a
                  href={`https://runescan.io/tx/${tx.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1"
                >
                  {tx.txHash.length > 20
                    ? `${tx.txHash.slice(0, 12)}...${tx.txHash.slice(-8)}`
                    : tx.txHash}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0">
              <tr>
                <th className="px-3 py-3 text-left font-medium text-zinc-500 whitespace-nowrap">Type</th>
                <th className="px-3 py-3 text-right font-medium text-zinc-500 whitespace-nowrap">Amount</th>
                <th className="px-3 py-3 text-left font-medium text-zinc-500 whitespace-nowrap">Node Address</th>
                <th className="px-3 py-3 text-left font-medium text-zinc-500 whitespace-nowrap">Timestamp</th>
                <th className="px-3 py-3 text-left font-medium text-zinc-500 whitespace-nowrap">Tx Hash</th>
                <th className="px-3 py-3 text-left font-medium text-zinc-500 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {transactions.map((tx) => (
                <tr key={tx.txHash} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        tx.type === 'BOND'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {formatRuneAmount(String(Math.floor(tx.amount * 1e8)))}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {tx.nodeAddress.length > 20
                      ? `${tx.nodeAddress.slice(0, 12)}...${tx.nodeAddress.slice(-8)}`
                      : tx.nodeAddress}
                  </td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {tx.timestamp.toLocaleDateString()} {tx.timestamp.toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    <a
                      href={`https://runescan.io/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1"
                    >
                      {tx.txHash.length > 20
                        ? `${tx.txHash.slice(0, 12)}...${tx.txHash.slice(-8)}`
                        : tx.txHash}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        tx.status === 'success'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : tx.status === 'failed'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
