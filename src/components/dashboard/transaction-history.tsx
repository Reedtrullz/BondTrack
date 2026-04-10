'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { getActions, type ActionRaw } from '@/lib/api/midgard';
import { formatRuneAmount } from '@/lib/utils/formatters';

interface Transaction {
  type: 'BOND' | 'UNBOND';
  amount: number;
  nodeAddress: string;
  timestamp: Date;
  txHash: string;
  status: string;
}

function parseActions(actions: ActionRaw[]): Transaction[] {
  return actions
    .filter((action) => action.type === 'bond' || action.type === 'unstake' || action.type === 'addLiquidity')
    .map((action): Transaction => {
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
      
      const type = action.type === 'bond' || action.type === 'addLiquidity' ? 'BOND' : 'UNBOND';
      const nodeAddress = action.metadata?.bond?.nodeAddress || action.in?.[0]?.address || action.tx?.address || '';
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

  const { data, error, isLoading } = useSWR(
    selectedAddress ? ['actions', selectedAddress] : null,
    async () => {
      const result = await getActions(selectedAddress, 50, 'bond');
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
            <div key={tx.txHash} className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
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
                <div className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  {tx.txHash.length > 20
                    ? `${tx.txHash.slice(0, 12)}...${tx.txHash.slice(-8)}`
                    : tx.txHash}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
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
                <tr key={tx.txHash} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
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
                    {tx.txHash.length > 20
                      ? `${tx.txHash.slice(0, 12)}...${tx.txHash.slice(-8)}`
                      : tx.txHash}
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