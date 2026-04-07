'use client';

import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, Clock, Coins } from 'lucide-react';
import { NETWORK } from '@/lib/config';
import { formatRuneAmount, formatCompactNumber } from '@/lib/utils/formatters';

interface SimulationResult {
  dailyReward: number;
  perChurnReward: number;
  totalReward: number;
  totalAfterLock: number;
  apy: number;
  churns: number;
  lockDays: number;
}

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

  const annualReward = bondAmount * effectiveApy;
  const dailyReward = annualReward / 365;
  const perChurnReward = dailyReward * 2.5;
  const totalReward = dailyReward * lockDays;

  return {
    dailyReward,
    perChurnReward,
    totalReward,
    totalAfterLock: bondAmount + totalReward,
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

export function BondSimulator() {
  const [bondInput, setBondInput] = useState('10000');
  const [lockDays, setLockDays] = useState('30');
  const [networkApy, setNetworkApy] = useState('12');
  const [operatorFee, setOperatorFee] = useState('300');

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

  const minBond = NETWORK.MINIMUM_BOND_RUNE / 1e8;
  const isBelowMin = bondAmount > 0 && bondAmount < minBond;

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-zinc-500" />
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Bond Simulator
        </h3>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">
            Bond Amount (RUNE)
          </label>
          <input
            type="number"
            value={bondInput}
            onChange={(e) => setBondInput(e.target.value)}
            min="0"
            step="1000"
            className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="10000"
          />
          {isBelowMin && (
            <p className="mt-1 text-xs text-yellow-500">
              Minimum bond is {formatCompactNumber(minBond)} RUNE
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">
            Lock Period (days)
          </label>
          <input
            type="number"
            value={lockDays}
            onChange={(e) => setLockDays(e.target.value)}
            min="1"
            step="1"
            className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="30"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">
            Est. Network APY (%)
          </label>
          <input
            type="number"
            value={networkApy}
            onChange={(e) => setNetworkApy(e.target.value)}
            min="0"
            max="100"
            step="0.1"
            className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="12"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">
            Operator Fee (bps)
          </label>
          <input
            type="number"
            value={operatorFee}
            onChange={(e) => setOperatorFee(e.target.value)}
            min="0"
            max="10000"
            step="50"
            className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="300"
          />
        </div>
      </div>

      {/* Results */}
      {result ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultCard
              icon={<Coins className="w-4 h-4" />}
              label="Daily Reward"
              value={`${formatReward(result.dailyReward)} RUNE`}
            />
            <ResultCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Per Churn"
              value={`${formatReward(result.perChurnReward)} RUNE`}
            />
            <ResultCard
              icon={<Clock className="w-4 h-4" />}
              label="Total Reward"
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
              <span className="text-zinc-500">After {result.lockDays} days ({result.churns} churns)</span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                {formatReward(result.totalAfterLock)} RUNE
              </span>
            </div>
          </div>

          {/* Projection table */}
          <div className="block md:hidden space-y-2">
            <ProjectionRowMobile days={7} result={result} bondAmount={bondAmount} />
            <ProjectionRowMobile days={30} result={result} bondAmount={bondAmount} />
            <ProjectionRowMobile days={90} result={result} bondAmount={bondAmount} />
            <ProjectionRowMobile days={180} result={result} bondAmount={bondAmount} />
            <ProjectionRowMobile days={365} result={result} bondAmount={bondAmount} />
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left py-2 font-medium">Period</th>
                  <th className="text-right py-2 font-medium">Rewards</th>
                  <th className="text-right py-2 font-medium">Total</th>
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
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
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
      <td className="py-1.5 text-zinc-600 dark:text-zinc-400 font-sans">{days}d</td>
      <td className="py-1.5 text-right">{formatReward(rewards)}</td>
      <td className="py-1.5 text-right">{formatReward(total)}</td>
    </tr>
  );
}

function ProjectionRowMobile({
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
    <div className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-800/50">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{days}d</span>
      <span className="font-mono text-sm text-zinc-900 dark:text-zinc-100">{formatReward(rewards)}</span>
      <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatReward(total)}</span>
    </div>
  );
}
