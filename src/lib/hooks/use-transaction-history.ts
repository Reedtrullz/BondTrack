import { useCallback, useEffect, useMemo, useState } from 'react';
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
  query: TransactionHistoryQuery;
}

interface TransactionHistoryQuery {
  actionTypes?: string;
  typeParam?: string;
}

interface AdditionalPageSet {
  windowKey: string | null;
  pages: ActionsResponseRaw[];
}

export const TRANSACTION_HISTORY_LIMIT = 50;
export const TRANSACTION_HISTORY_ACTION_CAP = 250;
const TRANSACTION_HISTORY_ACTION_TYPES = 'bond,unbond';
const TRANSACTION_HISTORY_TXTYPE_QUERY = 'txType';
const TRANSACTION_HISTORY_TYPE_QUERY = 'type';

function parseTotalActionCount(rawCount: string | undefined): number | null {
  if (rawCount === undefined) return null;
  const parsed = Number(rawCount);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function getActionTxId(action: ActionRaw | undefined): string {
  if (!action) return '';
  return action.in?.[0]?.txID || action.tx?.txID || action.out?.[0]?.txID || '';
}

function getActionWindowBoundary(action: ActionRaw | undefined): string {
  if (!action) return 'empty';

  return [
    getActionTxId(action),
    action.type ?? '',
    action.date ?? '',
    action.height ?? '',
    action.memo ?? action.metadata?.bond?.memo ?? action.metadata?.refund?.memo ?? '',
  ].join('|');
}

function getActionWindowKey(response: ActionsResponseRaw, query: TransactionHistoryQuery): string {
  const actions = response.actions ?? [];

  return [
    query.typeParam ?? 'unfiltered',
    query.actionTypes ?? 'all',
    response.count ?? 'unknown',
    String(actions.length),
    getActionWindowBoundary(actions[0]),
    getActionWindowBoundary(actions.at(-1)),
  ].join('::');
}

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

async function fetchActionsWithFallback(address: string): Promise<TransactionHistoryResponse> {
  // 1. Try txType=bond,unbond (removed 'leave' as it can cause 500s on some nodes)
  try {
    const result = await getActions(
      address,
      TRANSACTION_HISTORY_LIMIT,
      TRANSACTION_HISTORY_ACTION_TYPES,
      TRANSACTION_HISTORY_TXTYPE_QUERY
    );
    if (result.actions && result.actions.length > 0) {
      return {
        response: result,
        loadedAt: new Date(),
        query: {
          actionTypes: TRANSACTION_HISTORY_ACTION_TYPES,
          typeParam: TRANSACTION_HISTORY_TXTYPE_QUERY,
        },
      };
    }
  } catch {
    // Fall through to the broader action filter.
  }

  // 2. Fallback: try type=bond,unbond (more standard high-level types)
  try {
    const result = await getActions(
      address,
      TRANSACTION_HISTORY_LIMIT,
      TRANSACTION_HISTORY_ACTION_TYPES,
      TRANSACTION_HISTORY_TYPE_QUERY
    );
    if (result.actions && result.actions.length > 0) {
      return {
        response: result,
        loadedAt: new Date(),
        query: {
          actionTypes: TRANSACTION_HISTORY_ACTION_TYPES,
          typeParam: TRANSACTION_HISTORY_TYPE_QUERY,
        },
      };
    }
  } catch {
    // Fall through to unfiltered actions and filter locally.
  }

  // 3. Last resort: fetch recent actions and filter locally
  return {
    response: await getActions(address, TRANSACTION_HISTORY_LIMIT),
    loadedAt: new Date(),
    query: {},
  };
}

async function fetchTransactionHistory(address: string): Promise<TransactionHistoryResponse> {
  return fetchActionsWithFallback(address);
}

export function useTransactionHistory(address: string | null) {
  const [additionalPageSet, setAdditionalPageSet] = useState<AdditionalPageSet>({ windowKey: null, pages: [] });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<unknown>(null);
  const [stalePageResetCount, setStalePageResetCount] = useState(0);

  useEffect(() => {
    setAdditionalPageSet({ windowKey: null, pages: [] });
    setIsLoadingMore(false);
    setLoadMoreError(null);
    setStalePageResetCount(0);
  }, [address]);

  const { data, error, isLoading } = useSWR<TransactionHistoryResponse>(
    address ? ['transaction-history', address] : null,
    () => fetchTransactionHistory(address!),
    {
      refreshInterval: 60_000,
      shouldRetryOnError: false, // We handle retries/fallbacks manually in the fetcher
    }
  );

  const firstPageWindowKey = useMemo(() => {
    return data ? getActionWindowKey(data.response, data.query) : null;
  }, [data]);
  const activeAdditionalPages = useMemo(() => {
    if (!firstPageWindowKey || additionalPageSet.windowKey !== firstPageWindowKey) {
      return [];
    }

    return additionalPageSet.pages;
  }, [additionalPageSet.pages, additionalPageSet.windowKey, firstPageWindowKey]);

  useEffect(() => {
    if (!firstPageWindowKey || additionalPageSet.pages.length === 0) {
      return;
    }

    if (additionalPageSet.windowKey === firstPageWindowKey) {
      return;
    }

    setStalePageResetCount(additionalPageSet.pages.length);
    setAdditionalPageSet({ windowKey: firstPageWindowKey, pages: [] });
    setLoadMoreError(null);
  }, [additionalPageSet.pages.length, additionalPageSet.windowKey, firstPageWindowKey]);

  const rawActions = useMemo(() => {
    return [
      ...(data?.response.actions ?? []),
      ...activeAdditionalPages.flatMap((page) => page.actions ?? []),
    ];
  }, [activeAdditionalPages, data?.response.actions]);
  const latestPage = activeAdditionalPages.at(-1) ?? data?.response ?? null;
  const transactions = rawActions.length > 0 ? parseActions(rawActions) : [];
  const loadedActionCount = rawActions.length;
  const totalActionCount = parseTotalActionCount(latestPage?.count ?? data?.response.count);
  const latestPageActionCount = latestPage?.actions?.length ?? 0;
  const reachedUnknownTotalEnd = data
    ? totalActionCount === null && latestPageActionCount < TRANSACTION_HISTORY_LIMIT
    : false;
  const isPartial = totalActionCount !== null
    ? loadedActionCount < totalActionCount
    : Boolean(data && loadedActionCount >= TRANSACTION_HISTORY_LIMIT && !reachedUnknownTotalEnd);
  const isLocalActionCapReached = Boolean(
    data &&
    isPartial &&
    loadedActionCount >= TRANSACTION_HISTORY_ACTION_CAP
  );
  const canLoadMore = Boolean(data && isPartial && !isLoadingMore && !isLocalActionCapReached);

  const loadOlderActions = useCallback(async () => {
    if (!address || !data || !firstPageWindowKey || !canLoadMore) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError(null);
    setStalePageResetCount(0);

    try {
      const nextPage = await getActions(
        address,
        TRANSACTION_HISTORY_LIMIT,
        data.query.actionTypes,
        data.query.typeParam,
        loadedActionCount
      );

      setAdditionalPageSet((pageSet) => {
        const pages = pageSet.windowKey === firstPageWindowKey ? pageSet.pages : [];
        return {
          windowKey: firstPageWindowKey,
          pages: [...pages, nextPage],
        };
      });
    } catch (loadError) {
      setLoadMoreError(loadError);
    } finally {
      setIsLoadingMore(false);
    }
  }, [address, canLoadMore, data, firstPageWindowKey, loadedActionCount]);

  return {
    transactions,
    isLoading,
    error,
    loadedAt: data?.loadedAt ?? null,
    historyLimit: TRANSACTION_HISTORY_LIMIT,
    historyActionCap: TRANSACTION_HISTORY_ACTION_CAP,
    loadedActionCount,
    totalActionCount,
    isPartial,
    isLocalActionCapReached,
    canLoadMore,
    isLoadingMore,
    loadMoreError,
    stalePageResetCount,
    loadOlderActions,
  };
}
