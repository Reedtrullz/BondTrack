'use client';

import { useState } from 'react';
import { AlertTriangle, WifiOff, X } from 'lucide-react';
import { DashboardCard } from '@/components/shared/dashboard-card';
import type { ApiHealthStatus } from '@/lib/hooks/use-api-health';

interface ApiHealthBannerProps {
  midgard: ApiHealthStatus;
  thornode: ApiHealthStatus;
}

function getMessage(service: 'Midgard' | 'THORNode', status: ApiHealthStatus): string | null {
  if (status === 'healthy' || status === 'unknown') return null;
  if (status === 'down') {
    return `${service} API is unreachable — data may be unavailable`;
  }
  return `${service} API is temporarily unavailable — some data may be stale`;
}

function getHighlight(status: ApiHealthStatus): 'amber' | 'red' | undefined {
  if (status === 'degraded') return 'amber';
  if (status === 'down') return 'red';
  return undefined;
}

export function ApiHealthBanner({ midgard, thornode }: ApiHealthBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const midgardMessage = getMessage('Midgard', midgard);
  const thornodeMessage = getMessage('THORNode', thornode);

  if (!midgardMessage && !thornodeMessage) return null;

  const overallStatus = midgard === 'down' || thornode === 'down' ? 'down' : 'degraded';
  const highlight = getHighlight(overallStatus);
  const Icon = overallStatus === 'down' ? WifiOff : AlertTriangle;

  return (
    <DashboardCard
      highlight={highlight}
      className="mb-4 px-4 py-3"
      data-testid="api-health-banner"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-current/10 p-1.5">
          <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              {midgardMessage && (
                <p
                  className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
                  data-testid="api-health-banner-midgard-message"
                >
                  {midgardMessage}
                </p>
              )}
              {thornodeMessage && (
                <p
                  className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
                  data-testid="api-health-banner-thornode-message"
                >
                  {thornodeMessage}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-md p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label="Dismiss API health alert"
              data-testid="api-health-banner-dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
