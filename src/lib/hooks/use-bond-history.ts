import useSWR from 'swr';
import { getBondDetails, getActions, type BondDetailsRaw, type ActionsResponseRaw } from '@/lib/api/midgard';
import { runeToNumber } from '@/lib/utils/formatters';

export interface BondHistory {
  initialBond: number;
  currentBond: number;
  bondGrowth: number;
  firstBondDate: Date | null;
  lastBondDate: Date | null;
}

interface BondAction {
  type: 'BOND' | 'UNBOND';
  amount: number;
  date: Date;
}

export function useBondHistory(address: string | null) {
  const { data: bondDetails, isLoading: isLoadingDetails } = useSWR<BondDetailsRaw>(
    address ? ['bond-details', address] : null,
    () => getBondDetails(address!),
    { refreshInterval: 60_000 }
  );

  const { data: actions, isLoading: isLoadingActions } = useSWR<ActionsResponseRaw>(
    address ? ['actions-bond', address] : null,
    () => getActions(address!, 100, 'bond'),
    { refreshInterval: 60_000 }
  );

  const isLoading = isLoadingDetails || isLoadingActions;

  const bondActions: BondAction[] = actions?.actions
    ?.map((action) => {
      const inCoin = action.in?.[0]?.coins?.find((c) => c.asset === 'THOR.RUNE');
      const amount = inCoin ? parseFloat(inCoin.amount) / 1e8 : 0;
      return {
        type: 'BOND' as const,
        amount,
        date: new Date(Number(action.date) / 1e6),
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime()) || [];

  const history: BondHistory | null = address
    ? (() => {
        const initialBond = bondActions.length > 0 ? bondActions[0].amount : 0;
        const currentBond = bondDetails ? runeToNumber(bondDetails.totalBonded) : 0;
        const bondGrowth = currentBond - initialBond;

        return {
          initialBond,
          currentBond,
          bondGrowth,
          firstBondDate: bondActions.length > 0 ? bondActions[0].date : null,
          lastBondDate: bondActions.length > 0 ? bondActions[bondActions.length - 1].date : null,
        };
      })()
    : null;

  return {
    history,
    isLoading,
    bondActions,
  };
}