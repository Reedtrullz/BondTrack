import { NextRequest, NextResponse } from 'next/server';
import { getBondDetails, getActions } from '@/lib/api/midgard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    
    if (!address) {
      return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
    }

    const [bondDetails, actions] = await Promise.all([
      getBondDetails(address),
      getActions(address, 50)
    ]);

    const bondActions = actions.actions.filter(action => {
      const memo = action.memo?.toUpperCase() || '';
      return memo.startsWith('BOND:') || memo.startsWith('UNBOND:');
    });

    const parsedActions = bondActions.map(action => {
      const memo = action.memo?.toUpperCase() || '';
      const type: 'BOND' | 'UNBOND' = memo.startsWith('BOND:') ? 'BOND' : 'UNBOND';
      
      const runeCoin = action.tx?.coins?.find(c => c.asset === 'THOR.RUNE');
      const amount = runeCoin ? parseFloat(runeCoin.amount) : 0;
      const parts = memo.split(':');
      const nodeAddress = parts[1] || action.tx?.address || '';

      return {
        type,
        amount,
        nodeAddress,
        timestamp: new Date(action.date),
        txHash: action.tx?.txID || '',
        status: action.status || 'unknown',
        pools: action.pools || []
      };
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return NextResponse.json({
      address,
      bondDetails,
      actions: parsedActions,
      totalBond: bondDetails.totalBonded,
      nodeCount: bondDetails.nodes.length
    });
  } catch (error) {
    console.error('Error fetching address data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}