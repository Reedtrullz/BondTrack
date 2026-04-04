import { BondPosition } from '@/lib/types/node'


export function bondPositionsToCsv(positions: BondPosition[]): string {
  if (!positions || positions.length === 0) {
    return ''
  }

  
  const header = 'Node Address,Status,Bond (RUNE),Bond Share %,Operator Fee,Est. APY,Slash Points,Jailed,Version'
  const rows = positions.map(position => {
    return [
      position.nodeAddress,
      position.status,
      position.bondAmount.toFixed(6), 
      position.bondSharePercent.toFixed(2), 
      position.operatorFeeFormatted,
      position.netAPY.toFixed(2), 
      position.slashPoints.toFixed(2), 
      position.isJailed ? 'Yes' : 'No',
      position.version
    ].join(',')
  })

  return [header, ...rows].join('\n');
}