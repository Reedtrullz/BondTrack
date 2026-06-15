'use client';

import { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { BondPosition } from '@/lib/types/node';
import { Activity } from 'lucide-react';
import { formatRuneFromNumber } from '@/lib/utils/formatters';
import { ChartDataTable } from '@/components/shared/chart-data-table';

interface RiskRadarProps {
  positions: BondPosition[];
}

function isUsableRadarNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function normalizeRadarScore(value: number): { value: number; displayValue: string } {
  if (!Number.isFinite(value)) {
    return { value: 0, displayValue: '-- / 100' };
  }

  const normalized = Math.min(Math.max(value, 0), 100);
  return { value: normalized, displayValue: `${normalized.toFixed(0)} / 100` };
}

function formatRadarRune(value: number): string {
  return isUsableRadarNumber(value) ? formatRuneFromNumber(value) : '--';
}

export function RiskRadar({ positions }: RiskRadarProps) {
  const [selectedPositionIndex, setSelectedPositionIndex] = useState(0);
  const position = positions[selectedPositionIndex];
  const uptimeScore = normalizeRadarScore(
    isUsableRadarNumber(position.slashPoints) ? 100 - (position.slashPoints / 10) : Number.NaN
  );
  const bondShareScore = normalizeRadarScore(
    isUsableRadarNumber(position.bondSharePercent) ? position.bondSharePercent * 10 : Number.NaN
  );
  const yieldScore = normalizeRadarScore(
    isUsableRadarNumber(position.netAPY) ? position.netAPY * 5 : Number.NaN
  );

  // Normalize metrics for radar chart (0-100)
  const data = [
    {
      subject: 'Uptime',
      ...uptimeScore,
      fullMark: 100,
    },
    {
      subject: 'Security',
      value: position.isJailed ? 0 : 100,
      displayValue: `${position.isJailed ? 0 : 100} / 100`,
      fullMark: 100,
    },
    {
      subject: 'Bond Share',
      ...bondShareScore,
      fullMark: 100,
    },
    {
      subject: 'Yield',
      ...yieldScore,
      fullMark: 100,
    },
    {
      subject: 'Version',
      value: position.version ? 100 : 50,
      displayValue: `${position.version ? 100 : 50} / 100`,
      fullMark: 100,
    },
  ];

  return (
    <div className="w-full min-w-0 min-h-[280px] relative group">
      <div className="absolute top-0 right-0 p-2 z-10">
        <Activity className="w-4 h-4 text-zinc-400 group-hover:text-amber-500 transition-colors" />
      </div>

      {positions.length > 1 && (
        <div className="px-2 pt-2 pb-1">
          <select
            aria-label="Select node for risk radar"
            value={selectedPositionIndex}
            onChange={(e) => setSelectedPositionIndex(Number(e.target.value))}
            className="w-full px-2 py-1.5 text-xs font-mono rounded border bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            {positions.map((pos, idx) => (
              <option key={pos.nodeAddress} value={idx}>
                {pos.nodeAddress.slice(0, 8)}...{pos.nodeAddress.slice(-4)} — {formatRadarRune(pos.bondAmount)} ({pos.status})
              </option>
            ))}
          </select>
        </div>
      )}

      <ResponsiveContainer width="100%" height={260} minWidth={1} minHeight={1}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#3f3f46" strokeDasharray="3 3" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600 }} 
          />
          <Radar
            name="Node Performance"
            dataKey="value"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.3}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
            itemStyle={{ color: '#f59e0b', fontSize: '12px' }}
          />
        </RadarChart>
      </ResponsiveContainer>
      <ChartDataTable
        caption={`Risk radar metrics for ${position.nodeAddress}`}
        columns={['Metric', 'Score']}
        rows={data.map((point) => [point.subject, point.displayValue])}
      />
      
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-600">
          Shield Strength Radar
        </span>
      </div>
    </div>
  );
}
