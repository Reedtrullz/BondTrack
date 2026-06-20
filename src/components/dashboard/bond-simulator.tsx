'use client';

import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, Coins, BarChart3, ShieldCheck, AlertTriangle, Info } from 'lucide-react';
import { NETWORK } from '@/lib/config';
import { buildBondSimulatorInsight } from '@/lib/dashboard/bond-simulator-context';
import { formatRuneFromNumber, formatCompactNumber } from '@/lib/utils/formatters';
import { InsightHeader } from './insight-header';
import { MetricStrip } from './metric-strip';
import type { BondPosition } from '@/lib/types/node';

interface SimulationResult {
  dailyReward: number;
  perChurnReward: number;
  totalReward: number;
  totalAfterLock: number;
  apy: number;
  churns: number;
  lockDays: number;
}

type PresetType = 'conservative' | 'balanced' | 'agressive';

interface Preset {
  name: string;
  description: string;
  bondAmount: number;
  lockDays: number;
  networkApy: number;
  operatorFeeBps: number;
  icon: React.ReactNode;
}

const PRESETS: Record<PresetType, Preset> = {
  conservative: {
    name: 'Conservative inputs',
    description: '50% manual APY, 10% operator fee, 90-day window',
    bondAmount: 50000,
    lockDays: 90,
    networkApy: 50,
    operatorFeeBps: 1000,
    icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
  },
  balanced: {
    name: 'Balanced inputs',
    description: '65% manual APY, 15% operator fee, 180-day window',
    bondAmount: 100000,
    lockDays: 180,
    networkApy: 65,
    operatorFeeBps: 1500,
    icon: <BarChart3 className="w-4 h-4 text-blue-500" />,
  },
  agressive: {
    name: 'Stress inputs',
    description: '80% manual APY, 20% operator fee, 365-day window',
    bondAmount: 150000,
    lockDays: 365,
    networkApy: 80,
    operatorFeeBps: 2000,
    icon: <AlertTriangle className="w-4 h-4 text-orange-500" />,
  },
};

function simulateBond(
  bondAmount: number,
  lockDays: number,
  networkApy: number,
  operatorFeeBps: number
): SimulationResult | null {
  if (bondAmount <= 0 || lockDays <= 0) return null;

  const churns = Math.floor(lockDays / 2.5);
  const apyDecimal = networkApy / 100;
  const feeDecimal = operatorFeeBps / 10000;
  const effectiveApy = apyDecimal * (1 - feeDecimal);

  // Bond rewards accrue as simple daily APY projections; compounding is modeled separately.
  const dailyReward = (bondAmount * effectiveApy) / 365;
  const totalReward = dailyReward * lockDays;
  const totalAfterLock = bondAmount + totalReward;
  const perChurnReward = dailyReward * 2.5;

  return {
    dailyReward,
    perChurnReward,
    totalReward,
    totalAfterLock,
    apy: effectiveApy * 100,
    churns,
    lockDays,
  };
}

function formatReward(value: number): string {
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(6);
}

interface BondSimulatorProps {
  currentPositions?: BondPosition[];
}

export function BondSimulator({ currentPositions }: BondSimulatorProps) {
  const [bondInput, setBondInput] = useState('100000');
  const [lockDays, setLockDays] = useState('180');
  const [networkApy, setNetworkApy] = useState('65');
  const [operatorFee, setOperatorFee] = useState('1500');
  const [selectedPreset, setSelectedPreset] = useState<PresetType | null>(null);

  const bondAmount = useMemo(() => {
    const val = parseFloat(bondInput);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [bondInput]);

  const lockDaysNum = useMemo(() => {
    const val = parseInt(lockDays, 10);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [lockDays]);

  const networkApyNum = useMemo(() => {
    const val = parseFloat(networkApy);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [networkApy]);

  const operatorFeeNum = useMemo(() => {
    const val = parseInt(operatorFee, 10);
    return isNaN(val) || val < 0 ? 0 : val;
  }, [operatorFee]);

  const result = useMemo(
    () => simulateBond(bondAmount, lockDaysNum, networkApyNum, operatorFeeNum),
    [bondAmount, lockDaysNum, networkApyNum, operatorFeeNum]
  );

  // Impact Preview: Reward math can shift bond totals, but node-risk scoring remains a separate source check.
  const impactPreview = useMemo(() => {
    if (!currentPositions || bondAmount <= 0) return null;

    const currentTotalBond = currentPositions.reduce((sum, p) => sum + p.bondAmount, 0);
    const newTotalBond = currentTotalBond + bondAmount;
    const currentAPY = currentTotalBond > 0
      ? currentPositions.reduce((sum, p) => sum + p.netAPY * p.bondAmount, 0) / currentTotalBond
      : null;

    return {
      newTotalBond,
      estimatedAPYChange: result && currentAPY !== null ? result.apy - currentAPY : null,
      riskCheckDetail: 'Review slash, jail, and churn before acting',
      riskCheckStatus: 'Not modeled',
    };
  }, [currentPositions, bondAmount, result]);

  const minBond = NETWORK.MINIMUM_BOND_RUNE / 1e8;
  const isBelowMin = bondAmount > 0 && bondAmount < minBond;
  const currentBondRune = useMemo(
    () => currentPositions?.reduce((sum, position) => sum + position.bondAmount, 0) ?? 0,
    [currentPositions]
  );
  const simulatorInsight = useMemo(() => buildBondSimulatorInsight({
    bondAmountRune: bondAmount,
    currentBondRune,
    lockDays: lockDaysNum,
    networkApyPercent: networkApyNum,
    operatorFeeBps: operatorFeeNum,
    hasResult: Boolean(result),
  }), [
    bondAmount,
    currentBondRune,
    lockDaysNum,
    networkApyNum,
    operatorFeeNum,
    result,
  ]);

  const applyPreset = (preset: PresetType) => {
    const p = PRESETS[preset];
    setBondInput(String(p.bondAmount));
    setLockDays(String(p.lockDays));
    setNetworkApy(String(p.networkApy));
    setOperatorFee(String(p.operatorFeeBps));
    setSelectedPreset(preset);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-zinc-500" />
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Bond Simulator
        </h3>
      </div>

      <InsightHeader
        severity={simulatorInsight.severity}
        statusLabel={simulatorInsight.statusLabel}
        diagnosis={simulatorInsight.diagnosis}
        topRisk={simulatorInsight.topRisk}
        headingLevel={2}
        metrics={simulatorInsight.headerMetrics}
        primaryAction={simulatorInsight.primaryAction}
        eyebrow="Simulator scenario"
        compactMobileMetrics
      />

      <div id="simulator-assumptions">
        <MetricStrip metrics={simulatorInsight.assumptionMetrics} title="Simulation assumptions" />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
          <div className="space-y-1">
            <p className="font-semibold">Scenario estimates, not guarantees</p>
            <p className="text-xs leading-5 text-amber-900/80 dark:text-amber-100/80">
              Uses manual APY math from the values below. It does not model slashing, jail,
              churn-out, RUNE price changes, reward volatility, or compounding.
            </p>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(PRESETS) as PresetType[]).map((key) => {
          const preset = PRESETS[key];
          return (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`flex-1 min-w-[200px] p-4 rounded-xl border transition-all duration-200 ${
                selectedPreset === key
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {preset.icon}
                <span className="text-sm font-medium">{preset.name}</span>
              </div>
              <p className="text-xs text-zinc-500">{preset.description}</p>
            </button>
          );
        })}
      </div>

      {/* Inputs */}
      <div id="simulator-inputs" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label htmlFor="simulator-bond-amount" className="block text-xs text-zinc-500 mb-1.5">Bond Amount (RUNE)</label>
          <input
            id="simulator-bond-amount"
            type="number"
            value={bondInput}
            onChange={(e) => { setBondInput(e.target.value); setSelectedPreset(null); }}
            min="0"
            step="1000"
            className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="100000"
          />
          {isBelowMin && (
            <p className="mt-1 text-xs text-yellow-500">
              Minimum bond is {formatCompactNumber(minBond)} RUNE
            </p>
          )}
        </div>

        <div>
          <label htmlFor="simulator-lock-days" className="block text-xs text-zinc-500 mb-1.5">Lock Period (days)</label>
          <input
            id="simulator-lock-days"
            type="number"
            value={lockDays}
            onChange={(e) => { setLockDays(e.target.value); setSelectedPreset(null); }}
            min="1"
            step="1"
            className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="180"
          />
        </div>

        <div>
          <label htmlFor="simulator-network-apy" className="block text-xs text-zinc-500 mb-1.5">Est. Network APY (%)</label>
          <input
            id="simulator-network-apy"
            type="number"
            value={networkApy}
            onChange={(e) => { setNetworkApy(e.target.value); setSelectedPreset(null); }}
            min="0"
            max="100"
            step="0.1"
            className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="65"
          />
        </div>

        <div>
          <label htmlFor="simulator-operator-fee" className="block text-xs text-zinc-500 mb-1.5">Operator Fee (bps)</label>
          <input
            id="simulator-operator-fee"
            type="number"
            value={operatorFee}
            onChange={(e) => { setOperatorFee(e.target.value); setSelectedPreset(null); }}
            min="0"
            max="10000"
            step="50"
            className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1500"
          />
        </div>
      </div>

      {/* Results */}
      {result ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ResultCard
              icon={<Coins className="w-4 h-4" />}
              label="Est. Daily Reward"
              value={`${formatReward(result.dailyReward)} RUNE`}
            />
            <ResultCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Est. Per Churn"
              value={`${formatReward(result.perChurnReward)} RUNE`}
            />
            <ResultCard
              icon={<BarChart3 className="w-4 h-4" />}
              label="Est. Total Reward"
              value={`${formatReward(result.totalReward)} RUNE`}
            />
            <ResultCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Effective APY"
              value={`${result.apy.toFixed(2)}%`}
            />
          </div>

          <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">
                After {result.lockDays} days ({result.churns} churns)
              </span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                {formatReward(result.totalAfterLock)} RUNE
              </span>
            </div>
          </div>

          {/* Projection table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <caption className="sr-only">
                Estimated rewards by period using manual APY math from the current simulator inputs
              </caption>
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left py-2 font-medium">Period</th>
                  <th className="text-right py-2 font-medium">Est. Rewards</th>
                  <th className="text-right py-2 font-medium">Projected Total</th>
                </tr>
              </thead>
              <tbody className="font-mono text-zinc-900 dark:text-zinc-100">
                <ProjectionRow days={7} result={result} bondAmount={bondAmount} />
                <ProjectionRow days={30} result={result} bondAmount={bondAmount} />
                <ProjectionRow days={90} result={result} bondAmount={bondAmount} />
                <ProjectionRow days={180} result={result} bondAmount={bondAmount} />
                <ProjectionRow days={365} result={result} bondAmount={bondAmount} />
              </tbody>
            </table>
          </div>

          {/* Impact Preview */}
          {impactPreview && currentPositions && currentPositions.length > 0 && (
            <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Impact Preview
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-zinc-500">New Total Bonded</p>
                  <p className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatRuneFromNumber(impactPreview.newTotalBond)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Est. APY Change</p>
                  <p className={`font-mono font-semibold ${
                    impactPreview.estimatedAPYChange === null
                      ? 'text-zinc-600 dark:text-zinc-400'
                      : impactPreview.estimatedAPYChange >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}>
                    {impactPreview.estimatedAPYChange === null
                      ? 'First bonded baseline'
                      : `${impactPreview.estimatedAPYChange >= 0 ? '+' : ''}${impactPreview.estimatedAPYChange.toFixed(2)}%`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Risk check</p>
                  <p className="font-semibold text-amber-700 dark:text-amber-300">
                    {impactPreview.riskCheckStatus}
                  </p>
                  <p className="mt-1 text-xs leading-4 text-zinc-500 dark:text-zinc-400">
                    {impactPreview.riskCheckDetail}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="h-[120px] flex items-center justify-center text-zinc-400 text-sm">
          Enter bond amount and lock period to simulate
        </div>
      )}
    </div>
  );
}

function ResultCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-1.5 text-zinc-500 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
        {value}
      </div>
    </div>
  );
}

function ProjectionRow({
  days,
  result,
  bondAmount,
}: {
  days: number;
  result: SimulationResult;
  bondAmount: number;
}) {
  const dailyRate = result.totalReward / result.lockDays;
  const rewards = dailyRate * days;
  const total = bondAmount + rewards;

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800">
      <td className="py-1.5 text-zinc-600 dark:text-zinc-400">{days}d</td>
      <td className="py-1.5 text-right">{formatReward(rewards)}</td>
      <td className="py-1.5 text-right font-semibold">{formatReward(total)}</td>
    </tr>
  );
}
