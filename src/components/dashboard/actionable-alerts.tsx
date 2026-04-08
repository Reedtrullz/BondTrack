'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { generatePortfolioAlerts, type PortfolioAlert } from '@/lib/utils/portfolio-alerts';
import { BondPosition } from '@/lib/types/node';

interface ActionableAlertsProps {
  positions: BondPosition[];
}

export function ActionableAlerts({ positions }: ActionableAlertsProps) {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const [alerts, setAlerts] = useState<PortfolioAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAlerts(generatePortfolioAlerts(positions));
  }, [positions]);

  const activeAlerts = alerts.filter(a => !dismissed.has(a.id));

  if (activeAlerts.length === 0) return null;

  const severityColors: Record<string, string> = {
    critical: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400',
    warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400',
  };

  return (
    <div className="space-y-3 mb-6">
      {activeAlerts.map((alert) => {
        // Append address to link if it exists
        const finalLink = alert.actionLink 
          ? `${alert.actionLink}?address=${encodeURIComponent(address || '')}` 
          : '#';

        return (
          <div 
            key={alert.id} 
            className={`flex items-start gap-3 p-4 rounded-lg border ${severityColors[alert.severity]} transition-all animate-in fade-in slide-in-from-top-2`}
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {alert.message}
              </p>
              {alert.actionLink && (
                <Link 
                  href={finalLink} 
                  className="inline-flex items-center gap-1 mt-2 text-xs font-bold uppercase tracking-wider opacity-80 hover:opacity-100 transition-opacity"
                >
                  {alert.actionLabel} <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
            <button 
              onClick={() => setDismissed(prev => new Set([...prev, alert.id]))}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4 opacity-50" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
