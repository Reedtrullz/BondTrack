import useSWR from 'swr';
import {
  getBondDetails,
  getActions,
  type BondDetailsRaw,
  type ActionRaw,
} from '@/lib/api/midgard';
import { runeToNumber } from '@/lib/utils/formatters';
import { NETWORK } from '@/lib/config';

const BOND_HISTORY_ACTION_TYPES = 'bond,unbond,leave';
const BOND_HISTORY_QUERY_PARAM = 'txType';
const BOND_HISTORY_ACTION_CAP = 1000;

export interface BondHistory {
  initialBond: number;
  currentBond: number;
  bondGrowth: number;
  firstBondAmount: number;
  firstBondDate: Date | null;
  lastBondDate: Date | null;
  actionLimit: number;
  loadedActionCount: number;
  totalActionCount: number | null;
  isPartial: boolean;
  isLocalActionCapReached: boolean;
}

interface BondActionsResponse {
  actions: ActionRaw[];
  actionLimit: number;
  loadedActionCount: number;
  totalActionCount: number | null;
  isPartial: boolean;
  isLocalActionCapReached: boolean;
}

interface BondAction {
  type: 'BOND' | 'UNBOND';
  amount: number;
  date: Date;
}

async function getPaginatedBondActions(address: string): Promise<BondActionsResponse> {
  const pageSize = NETWORK.MAX_ACTIONS_LIMIT;
  const actionLimit = BOND_HISTORY_ACTION_CAP;
  const actions: ActionRaw[] = [];
  let totalActionCount: number | null = null;
  let reachedEnd = false;

  for (let offset = 0; offset < actionLimit; offset += pageSize) {
    const page = await getActions(
      address,
      pageSize,
      BOND_HISTORY_ACTION_TYPES,
      BOND_HISTORY_QUERY_PARAM,
      offset
    );
    const pageActions = page.actions ?? [];

    if (totalActionCount === null) {
      const parsedCount = Number(page.count);
      totalActionCount = Number.isFinite(parsedCount) && parsedCount >= 0 ? parsedCount : null;
    }

    actions.push(...pageActions.slice(0, Math.max(0, actionLimit - actions.length)));

    if (
      pageActions.length < pageSize ||
      pageActions.length === 0 ||
      (totalActionCount !== null && actions.length >= totalActionCount)
    ) {
      reachedEnd = true;
      break;
    }
  }

  const loadedActionCount = actions.length;
  const isPartial = totalActionCount !== null
    ? loadedActionCount < totalActionCount
    : !reachedEnd;
  const isLocalActionCapReached = isPartial && loadedActionCount >= actionLimit;

  return {
    actions,
    actionLimit,
    loadedActionCount,
    totalActionCount,
    isPartial,
    isLocalActionCapReached,
  };
}

export function useBondHistory(address: string | null) {
  const { data: bondDetails, isLoading: isLoadingDetails, error: detailsError } = useSWR<BondDetailsRaw>(
    address ? ['bond-details', address] : null,
    () => getBondDetails(address!),
    { refreshInterval: 60_000 }
  );

  const { data: actions, isLoading: isLoadingActions, error: actionsError } = useSWR<BondActionsResponse>(
    address ? ['actions-bond-v2', address] : null,
    () => getPaginatedBondActions(address!),
    { refreshInterval: 60_000 }
  );

  const isLoading = isLoadingDetails || isLoadingActions;
  const error = detailsError || actionsError;

  const bondActions: BondAction[] = actions?.actions
    ?.map((action) => {
      const inCoin = action.in?.[0]?.coins?.find((c) => c.asset === 'THOR.RUNE' || c.asset === 'THOR');
      const txCoin = action.tx?.coins?.find((c) => c.asset === 'THOR.RUNE' || c.asset === 'THOR');
      const outCoin = action.out?.find((o) => o.address === address)?.coins?.find((c) => c.asset === 'THOR.RUNE' || c.asset === 'THOR');

      const amount = inCoin
        ? runeToNumber(inCoin.amount)
        : outCoin
          ? runeToNumber(outCoin.amount)
          : txCoin
            ? runeToNumber(txCoin.amount)
            : 0;

      const metadataTxType = action.metadata?.refund?.txType;
      const memo = action.metadata?.bond?.memo || action.metadata?.refund?.memo || action.memo || '';

      const isBondAction =
        metadataTxType === 'bond' ||
        action.type === 'bond' ||
        action.type === 'addLiquidity' ||
        action.metadata?.bond != null ||
        memo.startsWith('BOND:');

      const isUnbondAction =
        metadataTxType === 'unbond' ||
        metadataTxType === 'leave' ||
        action.type === 'unbond' ||
        action.type === 'leave' ||
        memo.startsWith('UNBOND:') ||
        memo.startsWith('LEAVE:');

      // Only classify as BOND or UNBOND if explicitly recognized.
      // This prevents swaps/sends/tcy_stake from being counted as unbonds.
      if (!isBondAction && !isUnbondAction) {
        return null;
      }

      const type: 'BOND' | 'UNBOND' = isBondAction ? 'BOND' : 'UNBOND';

      const rawDate = action.date || '0';
      const date = new Date(Number(BigInt(rawDate) / BigInt(1000000))); // ms precision

      return {
        type,
        amount,
        date,
      };
    })
    .filter((a): a is BondAction => a !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime()) || [];

  const actionLimit = actions?.actionLimit ?? BOND_HISTORY_ACTION_CAP;
  const loadedActionCount = actions?.actions?.length ?? 0;
  const totalActionCount = actions?.totalActionCount ?? null;
  const isPartial = actions?.isPartial ?? false;
  const isLocalActionCapReached = actions?.isLocalActionCapReached ?? false;

  const history: BondHistory | null = address && !error
    ? (() => {
        const initialBond = bondActions.reduce((sum, a) => {
          return a.type === 'BOND' ? sum + a.amount : sum - a.amount;
        }, 0);
        const currentBond = bondDetails ? runeToNumber(bondDetails.totalBonded) : 0;
        const bondGrowth = currentBond - initialBond;

        const bondActionsList = bondActions.filter((a) => a.type === 'BOND');
        return {
          initialBond,
          currentBond,
          bondGrowth,
          firstBondAmount: bondActionsList.length > 0 ? bondActionsList[0].amount : 0,
          firstBondDate: bondActions.length > 0 ? bondActions[0].date : null,
          lastBondDate: bondActions.length > 0 ? bondActions[bondActions.length - 1].date : null,
          actionLimit,
          loadedActionCount,
          totalActionCount,
          isPartial,
          isLocalActionCapReached,
        };
      })()
    : null;

  return {
    history,
    isLoading,
    error,
    bondActions,
  };
}
