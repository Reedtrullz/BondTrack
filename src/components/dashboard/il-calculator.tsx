'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Info, Calculator } from 'lucide-react';
import { formatUsd } from '@/lib/utils/formatters';

/**
 * IL Calculator: Calculates impermanent loss for LP positions
 * Formula: IL = 1 - (2 * sqrt(priceRatio) / (1 + priceRatio))
 * where priceRatio = currentPrice / entryPrice (for one asset relative to the other)
 */
export default function IlCalculator() {
  // Manual input state
  const [runeEntryPrice, setRuneEntryPrice] = useState<string>('1.85');
  const [assetEntryPrice, setAssetEntryPrice] = useState<string>('65000');
  const [runeCurrentPrice, setRuneCurrentPrice] = useState<string>('2.10');
  const [assetCurrentPrice, setAssetCurrentPrice] = useState<string>('42000');
  const [runeDeposit, setRuneDeposit] = useState<string>('1000');
  const [assetDeposit, setAssetDeposit] = useState<string>('0.5');

  // Calculate IL
  const ilResult = useMemo(() => {
    const runeEntry = parseFloat(runeEntryPrice);
    const assetEntry = parseFloat(assetEntryPrice);
    const runeCurrent = parseFloat(runeCurrentPrice);
    const assetCurrent = parseFloat(assetCurrentPrice);
    const runeDep = parseFloat(runeDeposit);
    const assetDep = parseFloat(assetDeposit);

    if (!runeEntry || !assetEntry || !runeCurrent || !assetCurrent || runeEntry <= 0 || assetEntry <= 0 || runeCurrent <= 0 || assetCurrent <= 0) {
      return null;
    }

    // Calculate price ratio (RUNE relative to Asset)
    const entryRatio = runeEntry / assetEntry;
    const currentRatio = runeCurrent / assetCurrent;
    
    // Impermanent Loss formula
    const priceRatio = currentRatio / entryRatio;
    const ilPercent = (1 - (2 * Math.sqrt(priceRatio) / (1 + priceRatio))) * 100;

    // Calculate position values
    const entryValue = (runeDep * runeEntry) + (assetDep * assetEntry);
    const hodlValue = (runeDep * runeCurrent) + (assetDep * assetCurrent);
    const lpValue = entryValue * (1 - ilPercent / 100);
    const ilUsd = hodlValue - lpValue;

    return {
      ilPercent: ilPercent.toFixed(2),
      entryValue: entryValue.toFixed(2),
      hodlValue: hodlValue.toFixed(2),
      lpValue: lpValue.toFixed(2),
      ilUsd: ilUsd.toFixed(2),
      priceRatio: priceRatio.toFixed(4),
    };
  }, [runeEntryPrice, assetEntryPrice, runeCurrentPrice, assetCurrentPrice, runeDeposit, assetDeposit]);

  const handleReset = () => {
    setRuneEntryPrice('1.85');
    setAssetEntryPrice('65000');
    setRuneCurrentPrice('2.10');
    setAssetCurrentPrice('42000');
    setRuneDeposit('1000');
    setAssetDeposit('0.5');
  };

  return (
    <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <Calculator className="h-5 w-5 text-[var(--color-primary)]" />
          Impermanent Loss Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Entry Prices */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Entry Prices (USD)
            </h3>
            <div className="space-y-2">
              <Label htmlFor="rune-entry">RUNE Entry Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <Input
                  id="rune-entry"
                  type="number"
                  value={runeEntryPrice}
                  onChange={(e) => setRuneEntryPrice(e.target.value)}
                  className="pl-8"
                  placeholder="1.85"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-entry">Asset Entry Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <Input
                  id="asset-entry"
                  type="number"
                  value={assetEntryPrice}
                  onChange={(e) => setAssetEntryPrice(e.target.value)}
                  className="pl-8"
                  placeholder="65000"
                />
              </div>
            </div>
          </div>

          {/* Current Prices */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Current Prices (USD)
            </h3>
            <div className="space-y-2">
              <Label htmlFor="rune-current">RUNE Current Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <Input
                  id="rune-current"
                  type="number"
                  value={runeCurrentPrice}
                  onChange={(e) => setRuneCurrentPrice(e.target.value)}
                  className="pl-8"
                  placeholder="2.10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-current">Asset Current Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <Input
                  id="asset-current"
                  type="number"
                  value={assetCurrentPrice}
                  onChange={(e) => setAssetCurrentPrice(e.target.value)}
                  className="pl-8"
                  placeholder="42000"
                />
              </div>
            </div>
          </div>

          {/* Deposit Amounts */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Deposit Amounts
            </h3>
            <div className="space-y-2">
              <Label htmlFor="rune-deposit">RUNE Deposited</Label>
              <Input
                id="rune-deposit"
                type="number"
                value={runeDeposit}
                onChange={(e) => setRuneDeposit(e.target.value)}
                placeholder="1000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-deposit">Asset Deposited (BTC/ETH/etc)</Label>
              <Input
                id="asset-deposit"
                type="number"
                value={assetDeposit}
                onChange={(e) => setAssetDeposit(e.target.value)}
                placeholder="0.5"
              />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Results
            </h3>
            {ilResult ? (
              <div className="space-y-3 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-500">Impermanent Loss</span>
                  <span className={`text-sm font-bold ${parseFloat(ilResult.ilPercent) >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                    {ilResult.ilPercent}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-500">Entry Value</span>
                  <span className="text-sm font-medium">{formatUsd(parseFloat(ilResult.entryValue))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-500">HODL Value</span>
                  <span className="text-sm font-medium">{formatUsd(parseFloat(ilResult.hodlValue))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-500">LP Value (After IL)</span>
                  <span className="text-sm font-medium">{formatUsd(parseFloat(ilResult.lpValue))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-500">IL (USD)</span>
                  <span className="text-sm font-bold text-[var(--color-danger)]">
                    -{formatUsd(parseFloat(ilResult.ilUsd))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-500">Price Ratio (RUNE/Asset)</span>
                  <span className="text-sm font-medium">{ilResult.priceRatio}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-800/50">
                Enter valid prices to calculate impermanent loss
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button 
            onClick={() => {
              // In a real app, this would save the calculation or link to a position
              alert('Calculation saved to history (mock)');
            }}
          >
            Save Calculation
          </Button>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            Impermanent loss occurs when the price ratio of your LP assets changes. This calculator estimates IL using the standard 50/50 LP formula. Actual IL may vary based on fees earned and pool-specific factors.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
