import useSWR from 'swr';
import { getActions, type ActionRaw, type ActionsResponseRaw } from '@/lib/api/midgard';
import { runeToNumber } from '@/lib/utils/formatters';

export interface Transaction {
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
  if (!actions || !Array.isArray(actions)) return [];

  return actions
    .map((action) => ({ action, txType: getBondHistoryTxType(action) }))
    .filter((entry): entry is { action: ActionRaw; txType: 'bond' | 'unbond' | 'leave' | 'unstake' } => entry.txType !== null)
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

      // Use BigInt for safer timestamp parsing to avoid precision loss
      let timestamp = new Date();
      if (action.date) {
        try {
          timestamp = new Date(Number(BigInt(action.date) / BigInt(1000000)));
        } catch (e) {
          console.error('Error parsing date:', action.date, e);
          // Fallback to less precise parsing
          timestamp = new Date(Number(action.date) / 1e6);
        }
      }

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

async function fetchActionsWithFallback(address: string): Promise<ActionsResponseRaw> {
  // 1. Try txType=bond,unbond (removed 'leave' as it can cause 500s on some nodes)
  try {
    const result = await getActions(address, 50, 'bond,unbond', 'txType');
    if (result.actions && result.actions.length > 0) return result;
  } catch (err) {
    console.warn('Midgard txType query failed, trying type filter...', err);
  }

  // 2. Fallback: try type=bond,unbond (more standard high-level types)
  try {
    const result = await getActions(address, 50, 'bond,unbond', 'type');
    if (result.actions && result.actions.length > 0) return result;
  } catch (err) {
    console.warn('Midgard type query failed, trying unfiltered actions...', err);
  }

  // 3. Last resort: fetch recent actions and filter locally
  return await getActions(address, 50);
}

export function useTransactionHistory(address: string | null) {
  const { data, error, isLoading } = useSWR<ActionsResponseRaw>(
    address ? ['transaction-history', address] : null,
    () => fetchActionsWithFallback(address!),
    {
      refreshInterval: 60_000,
      onError: (err) => console.error('Actions API error:', err),
      shouldRetryOnError: false, // We handle retries/fallbacks manually in the fetcher
    }
  );

  const transactions = data?.actions ? parseActions(data.actions) : [];

  return {
    transactions,
    isLoading,
    error,
  };
}
