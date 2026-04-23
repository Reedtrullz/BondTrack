import useSWR from 'swr';
import { getBondDetails, getActions, type BondDetailsRaw, type ActionsResponseRaw } from '@/lib/api/midgard';
import { runeToNumber } from '@/lib/utils/formatters';

export interface BondHistory {
  initialBond: number;
  currentBond: number;
  bondGrowth: number;
  firstBondAmount: number;
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

  const { data: actions, isLoading: isLoadingActions, error: actionsError } = useSWR<ActionsResponseRaw>(
    address ? ['actions-bond-v2', address] : null,
    async () => {
      // Fetch bond and unbond actions separately to avoid 502s from combined queries
      try {
        const [bondActions, unbondActions] = await Promise.all([
          getActions(address!, 100, 'bond', 'type'),
          getActions(address!, 100, 'unbond', 'type')
        ]);
        
        return {
          actions: [...(bondActions.actions || []), ...(unbondActions.actions || [])],
          count: String((Number(bondActions.count) || 0) + (Number(unbondActions.count) || 0))
        };
      } catch (err) {
        // Fallback to a smaller limit if 100 is too much for Midgard right now
        const [bondActions, unbondActions] = await Promise.all([
          getActions(address!, 50, 'bond', 'type'),
          getActions(address!, 50, 'unbond', 'type')
        ]);
        
        return {
          actions: [...(bondActions.actions || []), ...(unbondActions.actions || [])],
          count: String((Number(bondActions.count) || 0) + (Number(unbondActions.count) || 0))
        };
      }
    },
    { refreshInterval: 60_000 }
  );

  const isLoading = isLoadingDetails || isLoadingActions;

  const bondActions: BondAction[] = actions?.actions
    ?.map((action) => {
      const inCoin = action.in?.[0]?.coins?.find((c) => c.asset === 'THOR.RUNE' || c.asset === 'THOR');
      const txCoin = action.tx?.coins?.find((c) => c.asset === 'THOR.RUNE' || c.asset === 'THOR');
      const outCoin = action.out?.find((o) => o.address === address)?.coins?.find((c) => c.asset === 'THOR.RUNE' || c.asset === 'THOR');
      
      const amount = inCoin 
        ? parseFloat(inCoin.amount) / 1e8 
        : outCoin
          ? parseFloat(outCoin.amount) / 1e8
          : txCoin 
            ? parseFloat(txCoin.amount) / 1e8 
            : 0;
      
      const isBondAction = action.type === 'bond' || action.type === 'addLiquidity';
      const type: 'BOND' | 'UNBOND' = isBondAction ? 'BOND' : 'UNBOND';
      
      const rawDate = action.date || '0';
      const date = new Date(Number(BigInt(rawDate) / BigInt(1000000))); // ms precision
      
      return {
        type,
        amount,
        date,
      };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime()) || [];

  const history: BondHistory | null = address
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
        };
      })()
    : null;

  return {
    history,
    isLoading,
    bondActions,
  };
}