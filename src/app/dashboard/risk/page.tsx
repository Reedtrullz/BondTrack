'use client';

import { useSearchParams } from 'next/navigation';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';
import { AlertTriangle, Shield, Gauge, Clock, UserMinus, TrendingDown, DollarSign, Hourglass, ChevronDown, ChevronRight, Activity, Users, Zap, Lock } from 'lucide-react';
import { SlashMonitor } from '@/components/dashboard/slash-monitor';
import { ChurnOutRisk } from '@/components/dashboard/churn-out-risk';
import { NetworkSecurityMetrics } from '@/components/dashboard/network-security-metrics';
import { UnbondWindowTracker } from '@/components/dashboard/unbond-window-tracker';
import type { YieldGuardFlag, BondPosition } from '@/lib/types/node';
import { useState, useMemo } from 'react';
import { generatePortfolioAlerts } from '@/lib/utils/portfolio-alerts';
import { cn } from '@/lib/utils';

function formatRune(num: number): string {
  return num.toLocaleString();
}

// Compact accordion component
function AccordionSection({
  title,
  icon,
  isOpen,
  onToggle,
  defaultExpanded = false,
  children,
  badge,
  badgeColor = 'bg-zinc-100 dark:bg-zinc-800',
}: {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  badge?: React.ReactNode;
  badgeColor?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-zinc-400">{icon}</div>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</span>
          {badge && <span className={cn("px-2 py-0.5 rounded text-xs font-medium", badgeColor)}>{badge}</span>}
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        )}
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen || defaultExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4 pt-0 border-t border-zinc-100 dark:border-zinc-800">
          {children}
        </div>
      </div>
    </div>
  );
}

// Quick health pills - compact version
function QuickHealthCheck({ positions }: { positions: BondPosition[] }) {
  const activeCount = positions.filter(p => p.status === 'Active').length;
  const standbyCount = positions.filter(p => p.status === 'Standby').length;
  const jailedCount = positions.filter(p => p.isJailed).length;
  const totalBonded = positions.reduce((sum, p) => sum + p.bondAmount, 0);

  if (positions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{activeCount} active</span>
      </div>
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
        <div className="w-2 h-2 rounded-full bg-amber-500" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">{standbyCount} standby</span>
      </div>
      {jailedCount > 0 ? (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-medium text-red-700 dark:text-red-400">{jailedCount} jailed</span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{formatRune(totalBonded)} RUNE</span>
        </div>
      )}
    </div>
  );
}

const YIELD_GUARD_CONFIG: Record<YieldGuardFlag, { icon: React.ReactNode; color: string; label: string }> = {
  overbonded: { icon: <Gauge className="w-3 h-3" />, color: 'text-orange-500', label: 'Overbonded' },
  highest_slash: { icon: <AlertTriangle className="w-3 h-3" />, color: 'text-red-500', label: 'High Slash' },
  lowest_bond: { icon: <TrendingDown className="w-3 h-3" />, color: 'text-yellow-500', label: 'Lowest Bond' },
  oldest: { icon: <Clock className="w-3 h-3" />, color: 'text-purple-500', label: 'Oldest' },
  leaving: { icon: <UserMinus className="w-3 h-3" />, color: 'text-zinc-500', label: 'Leaving' },
};

// Your nodes at risk - the actionable section
function YourNodesAtRisk({ positions }: { positions: BondPosition[] }) {
  const alerts = generatePortfolioAlerts(positions);
  const atRiskPositions = positions.filter(p => p.yieldGuardFlags && p.yieldGuardFlags.length > 0);
  const totalBonded = positions.reduce((sum, p) => sum + p.bondAmount, 0);
  const jailedCount = positions.filter(p => p.isJailed).length;

  if (positions.length === 0) {
    return (
      <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center">
        <Shield className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">No Bond Positions</h3>
        <p className="text-sm text-zinc-500">Enter an address to view risk status.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Your Nodes at Risk</h3>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <span>{positions.length} nodes</span>
            <span className="text-emerald-600 dark:text-emerald-400">{formatRune(totalBonded)} RUNE</span>
            {jailedCount > 0 && <span className="text-red-500">{jailedCount} jailed</span>}
          </div>
        </div>
      </div>

      <div className="p-4">
        {atRiskPositions.length === 0 ? (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <Shield className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">All nodes healthy</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">No Yield Guard warnings</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {atRiskPositions.map(pos => {
              const primaryFlag = pos.yieldGuardFlags?.[0];
              const alert = alerts.find(a => {
                if (primaryFlag === 'highest_slash' && a.type === 'SLASH') return true;
                if (primaryFlag === 'lowest_bond' && a.type === 'CHURN') return true;
                if (pos.isJailed && a.type === 'JAIL') return true;
                return false;
              });

              return (
                <div 
                  key={pos.nodeAddress} 
                  className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="font-mono text-sm text-zinc-700 dark:text-zinc-300 truncate">
                        {pos.nodeAddress.slice(0, 12)}...{pos.nodeAddress.slice(-4)}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {pos.yieldGuardFlags?.map(flag => {
                          const config = YIELD_GUARD_CONFIG[flag];
                          return (
                            <span 
                              key={flag}
                              className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium", config.color, "bg-zinc-100 dark:bg-zinc-700")}
                              title={config.label}
                            >
                              {config.icon}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-sm text-zinc-500 shrink-0 ml-2">
                      {formatRune(pos.bondAmount)} RUNE
                    </div>
                  </div>
                  {alert && (
                    <div className="flex items-start gap-2 p-2 rounded bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800">
                      <div className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0">
                        Action
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">
                        {alert.suggestion}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-500 border-t border-zinc-100 dark:border-zinc-700">
        {atRiskPositions.length > 0 
          ? 'Monitor these nodes - they may churn out or stop earning soon'
          : 'Based on Yield Guard: overbonded, high slash, lowest bond, oldest, leaving'}
      </div>
    </div>
  );
}

export default function RiskPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');
  const { positions, isLoading } = useBondPositions(address);

  // Accordion state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const s = new Set<string>();
    // All collapsed by default
    return s;
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const isExpanded = (section: string) => expandedSections.has(section);

  // Expand/collapse all
  const allExpanded = expandedSections.size === 4;
  const toggleAll = () => {
    if (allExpanded) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(['slash', 'churn', 'unbond', 'network']));
    }
  };

  // Calculate badges
  const slashBadges = useMemo(() => {
    const critical = positions.filter(p => p.slashPoints >= 200).length;
    const warning = positions.filter(p => p.slashPoints >= 50 && p.slashPoints < 200).length;
    const result = [];
    if (critical > 0) result.push({ label: `${critical} critical`, color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' });
    if (warning > 0) result.push({ label: `${warning} warning`, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' });
    return result;
  }, [positions]);

  

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Risk Monitor</h2>
        <button
          onClick={toggleAll}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center gap-1"
        >
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      <YourNodesAtRisk positions={positions} />

      <QuickHealthCheck positions={positions} />

      <div className="space-y-3">
        <AccordionSection
          title="Slash Point Monitor"
          icon={<AlertTriangle className="w-4 h-4" />}
          isOpen={isExpanded('slash')}
          onToggle={() => toggleSection('slash')}
          badge={slashBadges[0]?.label}
          badgeColor={slashBadges[0]?.color}
          defaultExpanded={false}
        >
          <SlashMonitor positions={positions} />
        </AccordionSection>

        <AccordionSection
          title="Churn-Out Risk"
          icon={<TrendingDown className="w-4 h-4" />}
          isOpen={isExpanded('churn')}
          onToggle={() => toggleSection('churn')}
          defaultExpanded={false}
        >
          <ChurnOutRisk positions={positions} />
        </AccordionSection>

        <AccordionSection
          title="Unbond Window"
          icon={<Clock className="w-4 h-4" />}
          isOpen={isExpanded('unbond')}
          onToggle={() => toggleSection('unbond')}
          defaultExpanded={false}
        >
          <UnbondWindowTracker positions={positions} />
        </AccordionSection>

        <AccordionSection
          title="Network Context"
          icon={<Activity className="w-4 h-4" />}
          isOpen={isExpanded('network')}
          onToggle={() => toggleSection('network')}
          defaultExpanded={false}
        >
          <NetworkSecurityMetrics positions={positions} />
        </AccordionSection>
      </div>
    </div>
  );
}