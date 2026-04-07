import { useState } from 'react';
import type { BondPosition } from '@/lib/types/node';
import { ChevronDown, Users } from 'lucide-react';

interface PooledNodeDetailsProps {
  position: BondPosition;
}

export function PooledNodeDetails({ position }: PooledNodeDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const pooledData = position.pooledNodeData;
  if (!pooledData || !pooledData.isPooled) return null;

  const totalProviders = pooledData.totalProviders;
  const otherProviders = pooledData.otherProviders;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-zinc-500" />
          <span className="text-zinc-700 dark:text-zinc-300 font-medium">
            Pooled Node
          </span>
          <span className="text-xs text-zinc-500">
            {totalProviders} provider{totalProviders !== 1 ? 's' : ''}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-zinc-500">Total Providers</div>
                <div className="font-mono text-zinc-900 dark:text-zinc-100">
                  {totalProviders}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Your Share</div>
                <div className="font-mono text-zinc-900 dark:text-zinc-100">
                  {pooledData.yourSharePercent.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Total Bond</div>
                <div className="font-mono text-zinc-900 dark:text-zinc-100">
                  {position.totalBond.toLocaleString(undefined, { maximumFractionDigits: 0 })} RUNE
                </div>
              </div>
            </div>

            {/* Other providers list */}
            {otherProviders.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Other Providers
                </div>
                <div className="space-y-1.5">
                  {otherProviders.map((provider, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-3 py-2 rounded-md bg-zinc-50 dark:bg-zinc-800/50 text-sm"
                    >
                      <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {provider.address}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-xs text-zinc-500">
                          {provider.sharePercent.toFixed(2)}%
                        </span>
                        <span className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
                          {provider.bond.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          RUNE
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {otherProviders.length === 0 && (
              <div className="text-center py-4 text-sm text-zinc-500">
                No other providers to display.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
