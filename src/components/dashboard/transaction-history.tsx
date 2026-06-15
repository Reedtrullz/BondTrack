'use client';

import { useEffect, useState } from 'react';
import { useTransactionHistory } from '@/lib/hooks/use-transaction-history';
import { formatRuneDisplayNumber } from '@/lib/utils/formatters';
import { isValidTHORChainAddress } from '@/lib/utils/address-validation';
import { Database, ExternalLink } from 'lucide-react';

interface TransactionHistoryProps {
  address: string | null;
}

function formatHistoryRuneAmount(amount: number): string {
  return `${formatRuneDisplayNumber(amount, 2)} RUNE`;
}

function formatTransactionTimestamp(tx: { timestamp: Date; timestampKnown: boolean }): string {
  if (!tx.timestampKnown) {
    return 'Unknown';
  }

  return `${tx.timestamp.toLocaleDateString()} ${tx.timestamp.toLocaleTimeString()}`;
}

function formatLoadedAt(loadedAt: Date | null): string {
  if (!loadedAt) {
    return 'Waiting for source';
  }

  return `Loaded ${loadedAt.toLocaleTimeString()}`;
}

function TransactionHistorySource({
  transactionCount,
  loadedAt,
  historyLimit,
}: {
  transactionCount: number;
  loadedAt: Date | null;
  historyLimit: number;
}) {
  const actionLabel = transactionCount === 1
    ? '1 matching BOND/UNBOND action rendered.'
    : transactionCount > 1
      ? `${transactionCount} matching BOND/UNBOND actions rendered.`
      : 'No matching recent actions returned.';

  return (
    <section
      aria-label="Transaction history source"
      className="rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-3 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-100"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-2">
          <Database className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Midgard actions</p>
            <p className="mt-1 text-xs leading-5 opacity-85">
              Shows up to {historyLimit} recent Midgard actions and filters to BOND/UNBOND. Empty results do not prove older history is absent.
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-current/20 bg-white/70 px-2 py-1 text-xs font-semibold dark:bg-zinc-950/30">
          {formatLoadedAt(loadedAt)}
        </span>
      </div>
      <p className="mt-2 text-xs font-medium opacity-90">{actionLabel}</p>
    </section>
  );
}

const historyAddressInputId = 'transaction-history-address';
const historyAddressHelpId = 'transaction-history-address-help';
const historyAddressErrorId = 'transaction-history-address-error';

export function TransactionHistory({ address }: TransactionHistoryProps) {
  const [selectedAddress, setSelectedAddress] = useState<string>(address || '');
  const [inputAddress, setInputAddress] = useState<string>(address || '');
  const [addressError, setAddressError] = useState<string>('');

  // Sync state with prop changes
  useEffect(() => {
    const nextAddress = address || '';
    setSelectedAddress(nextAddress);
    setInputAddress(nextAddress);
    setAddressError(nextAddress && !isValidTHORChainAddress(nextAddress)
      ? 'Enter a valid THORChain address before loading history.'
      : '');
  }, [address]);

  const selectedAddressIsValid = selectedAddress ? isValidTHORChainAddress(selectedAddress) : false;
  const { transactions, isLoading, error, loadedAt, historyLimit } = useTransactionHistory(selectedAddressIsValid ? selectedAddress : null);
  const showSourceContext = selectedAddressIsValid && !isLoading && !error && loadedAt !== null;

  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    const nextAddress = inputAddress.trim();
    if (!nextAddress) {
      return;
    }

    if (!isValidTHORChainAddress(nextAddress)) {
      setAddressError('Enter a valid THORChain address before loading history.');
      return;
    }

    setAddressError('');
    setSelectedAddress(nextAddress);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label htmlFor={historyAddressInputId} className="sr-only">Transaction history address</label>
          <input
            id={historyAddressInputId}
            type="text"
            value={inputAddress}
            onChange={(e) => {
              setInputAddress(e.target.value);
              if (addressError) {
                setAddressError('');
              }
            }}
            placeholder="Enter THORChain address"
            aria-invalid={Boolean(addressError)}
            aria-describedby={addressError ? `${historyAddressHelpId} ${historyAddressErrorId}` : historyAddressHelpId}
            autoComplete="off"
            className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 ${
              addressError ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'
            }`}
          />
          <p id={historyAddressHelpId} className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Paste the THORChain address whose BOND/UNBOND history you want to inspect.
          </p>
          <p
            id={historyAddressErrorId}
            role={addressError ? 'alert' : undefined}
            aria-live="polite"
            className="mt-1 min-h-5 text-xs text-red-500"
          >
            {addressError}
          </p>
        </div>
        <button
          type="submit"
          disabled={!inputAddress.trim()}
          aria-label="Search transaction history"
          className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-100 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-400 disabled:text-zinc-100 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400"
        >
          Search
        </button>
      </form>

      {showSourceContext ? (
        <TransactionHistorySource
          transactionCount={transactions.length}
          loadedAt={loadedAt}
          historyLimit={historyLimit}
        />
      ) : null}

      {!selectedAddress ? (
        <div className="text-center py-8 text-zinc-500">
          Enter a THORChain address to view transaction history
        </div>
      ) : !selectedAddressIsValid ? (
        <div className="text-center py-8 text-zinc-500">
          Enter a valid THORChain address to load bond and unbond history.
        </div>
      ) : isLoading ? (
        <div className="text-center py-8 text-zinc-500">Loading transactions...</div>
      ) : error ? (
        <div className="text-center py-8 rounded-lg border border-dashed border-amber-200 bg-amber-50/60 px-4 dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="text-amber-700 dark:text-amber-300 mb-2">Transaction history is temporarily unavailable</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Midgard could not return bond actions right now. The transaction composer still works while history is unavailable.
          </div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          No recent BOND/UNBOND actions returned by Midgard for this address
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
                  {formatHistoryRuneAmount(tx.amount)}
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
                  {formatTransactionTimestamp(tx)}
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
                    {formatHistoryRuneAmount(tx.amount)}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {tx.nodeAddress.length > 20
                      ? `${tx.nodeAddress.slice(0, 12)}...${tx.nodeAddress.slice(-8)}`
                      : tx.nodeAddress}
                  </td>
                  <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                    {formatTransactionTimestamp(tx)}
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
