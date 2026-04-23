'use client';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { BondPosition } from '@/lib/types/node';
import { Shield, Zap, AlertTriangle, Activity } from 'lucide-react';

interface RiskRadarProps {
  position: BondPosition;
}

export function RiskRadar({ position }: RiskRadarProps) {
  // Normalize metrics for radar chart (0-100)
  const data = [
    {
      subject: 'Uptime',
      value: Math.max(0, 100 - (position.slashPoints / 10)), // Heuristic: 1000 pts = 0% uptime, clamped at 0
      fullMark: 100,
    },
    {
      subject: 'Security',
      value: position.isJailed ? 0 : 100,
      fullMark: 100,
    },
    {
      subject: 'Bond Share',
      value: Math.min(position.bondSharePercent * 10, 100), // Scale share to 0-100
      fullMark: 100,
    },
    {
      subject: 'Yield',
      value: Math.min(position.netAPY * 5, 100), // Scale APY to 0-100
      fullMark: 100,
    },
    {
      subject: 'Version',
      value: position.version ? 100 : 50,
      fullMark: 100,
    },
  ];

  return (
    <div className="w-full h-[240px] relative group">
      <div className="absolute top-0 right-0 p-2 z-10">
        <Activity className="w-4 h-4 text-zinc-400 group-hover:text-amber-500 transition-colors" />
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
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
      
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-600">
          Shield Strength Radar
        </span>
      </div>
    </div>
  );
}
