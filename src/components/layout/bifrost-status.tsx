'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BifrostStatus() {
  const [status, setStatus] = useState<'online' | 'degraded' | 'offline'>('online');
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    // Simulate real-time Bifrost (API) health checks
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="group relative flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/5 dark:bg-white/5 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-sm transition-all hover:bg-zinc-900/10 dark:hover:bg-white/10">
      <div className="relative">
        <div className={cn(
          "w-2 h-2 rounded-full transition-all duration-1000",
          status === 'online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : 
          status === 'degraded' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" : 
          "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]",
          pulse && "scale-125 opacity-80"
        )} />
        
        {/* Bifrost Rainbow Pulse Effect */}
        <div className={cn(
          "absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-sm bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500",
          pulse && "animate-spin-slow"
        )} style={{ zIndex: -1 }} />
      </div>
      
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-tighter text-zinc-500 dark:text-zinc-400">Bifrost Link</span>
        <span className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 italic">Bridge to Midgard</span>
      </div>

      <Zap className={cn(
        "ml-auto w-3 h-3 transition-colors",
        status === 'online' ? "text-amber-500/50 group-hover:text-amber-500" : "text-zinc-500"
      )} />
    </div>
  );
}
