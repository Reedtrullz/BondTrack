import useSWR from 'swr';
import { getActions, type ActionRaw, type ActionsResponseRaw } from '@/lib/api/midgard';
import { runeToNumber } from '@/lib/utils/formatters';

export interface Transaction {
  type: 'BOND' | 'UNBOND';
  amount: number;
  nodeAddress: string;
  timestamp: Date;
  timestampKnown: boolean;
  txHash: string;
  status: string;
}

interface TransactionHistoryResponse {
  response: ActionsResponseRaw;
  loadedAt: Date;
}

export const TRANSACTION_HISTORY_LIMIT = 50;

function getBondHistoryTxType(action: ActionRaw): 'bond' | 'unbond' | null {
  const metadataTxType = action.metadata?.refund?.txType;

  if (metadataTxType === 'bond' || metadataTxType === 'unbond') {
    return metadataTxType;
  }

  if (action.type === 'bond' || action.type === 'unbond') {
    return action.type;
  }

  const memo = action.metadata?.bond?.memo || action.metadata?.refund?.memo || action.memo || '';

  if (memo.startsWith('BOND:')) return 'bond';
  if (memo.startsWith('UNBOND:')) return 'unbond';

  return null;
}

function getBondHistoryNodeAddress(action: ActionRaw): string {
  const memo = action.metadata?.bond?.memo || action.metadata?.refund?.memo || action.memo || '';
  const memoParts = memo.split(':');
  const memoNodeAddress = memoParts[1] || '';

  return action.metadata?.bond?.nodeAddress || memoNodeAddress || action.in?.[0]?.address || action.tx?.address || '';
}

function parseActionTimestamp(rawDate: string | undefined): { timestamp: Date; timestampKnown: boolean } {
  if (!rawDate) {
    return { timestamp: new Date(0), timestampKnown: false };
  }

  try {
    const timestamp = new Date(Number(BigInt(rawDate) / BigInt(1000000)));
    if (Number.isNaN(timestamp.getTime())) {
      return { timestamp: new Date(0), timestampKnown: false };
    }

    return { timestamp, timestampKnown: true };
  } catch {
    const timestamp = new Date(Number(rawDate) / 1e6);
    if (Number.isNaN(timestamp.getTime())) {
      return { timestamp: new Date(0), timestampKnown: false };
    }

    return { timestamp, timestampKnown: true };
  }
}

function parseActions(actions: ActionRaw[]): Transaction[] {
  if (!actions || !Array.isArray(actions)) return [];

  return actions
    .map((action) => ({ action, txType: getBondHistoryTxType(action) }))
    .filter((entry): entry is { action: ActionRaw; txType: 'bond' | 'unbond' } => entry.txType !== null)
    .map(({ action, txType }): Transaction => {
      let amount = 0;

      // Try to find RUNE amount in 'in', 'tx', or 'out'
      const findRuneAmount = (coins: { asset: string; amount: string }[] | undefined) => {
        if (!coins) return 0;
        const runeCoin = coins.find((c) =>
          c.asset === 'THOR.RUNE' ||
          c.asset === 'THOR' ||
          c.asset.startsWith('THOR.RUNE')
        );
        return runeCoin ? runeToNumber(runeCoin.amount) : 0;
      };

      amount = findRuneAmount(action.in?.[0]?.coins);
      if (amount === 0) amount = findRuneAmount(action.tx?.coins);
      if (amount === 0) {
        // For unbonds, amount might be in 'out'
        action.out?.forEach(out => {
          if (amount === 0) amount = findRuneAmount(out.coins);
        });
      }

      const type = (txType === 'bond') ? 'BOND' : 'UNBOND';
      const nodeAddress = getBondHistoryNodeAddress(action);

      const { timestamp, timestampKnown } = parseActionTimestamp(action.date);

      return {
        type,
        amount,
        nodeAddress,
        timestamp,
        timestampKnown,
        txHash: action.in?.[0]?.txID || action.tx?.txID || action.out?.[0]?.txID || '',
        status: action.status || 'unknown',
      };
    })
    .sort((a, b) => {
      if (a.timestampKnown !== b.timestampKnown) {
        return a.timestampKnown ? -1 : 1;
      }

      return b.timestamp.getTime() - a.timestamp.getTime();
    });
}

async function fetchActionsWithFallback(address: string): Promise<ActionsResponseRaw> {
  // 1. Try txType=bond,unbond (removed 'leave' as it can cause 500s on some nodes)
  try {
    const result = await getActions(address, TRANSACTION_HISTORY_LIMIT, 'bond,unbond', 'txType');
    if (result.actions && result.actions.length > 0) return result;
  } catch {
    // Fall through to the broader action filter.
  }

  // 2. Fallback: try type=bond,unbond (more standard high-level types)
  try {
    const result = await getActions(address, TRANSACTION_HISTORY_LIMIT, 'bond,unbond', 'type');
    if (result.actions && result.actions.length > 0) return result;
  } catch {
    // Fall through to unfiltered actions and filter locally.
  }

  // 3. Last resort: fetch recent actions and filter locally
  return await getActions(address, TRANSACTION_HISTORY_LIMIT);
}

async function fetchTransactionHistory(address: string): Promise<TransactionHistoryResponse> {
  const response = await fetchActionsWithFallback(address);

  return {
    response,
    loadedAt: new Date(),
  };
}

export function useTransactionHistory(address: string | null) {
  const { data, error, isLoading } = useSWR<TransactionHistoryResponse>(
    address ? ['transaction-history', address] : null,
    () => fetchTransactionHistory(address!),
    {
      refreshInterval: 60_000,
      shouldRetryOnError: false, // We handle retries/fallbacks manually in the fetcher
    }
  );

  const transactions = data?.response.actions ? parseActions(data.response.actions) : [];

  return {
    transactions,
    isLoading,
    error,
    loadedAt: data?.loadedAt ?? null,
    historyLimit: TRANSACTION_HISTORY_LIMIT,
  };
}
