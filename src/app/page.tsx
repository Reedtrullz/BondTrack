'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AddressInput } from '@/components/shared/address-input';
import { RecentAddresses } from '@/components/shared/recent-addresses';
import { Eye, Activity, BarChart3, TrendingUp, Zap, Globe, Lock, Wallet, Bell, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const LAST_ADDRESS_KEY = 'thornode-watcher-last-address';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastAddress = localStorage.getItem(LAST_ADDRESS_KEY);
      if (lastAddress && lastAddress.startsWith('thor1')) {
        router.replace(`/dashboard?address=${encodeURIComponent(lastAddress)}`);
      }
    }
  }, [router]);

  const handleAddressSubmit = (address: string) => {
    localStorage.setItem(LAST_ADDRESS_KEY, address);
    router.push(`/dashboard?address=${encodeURIComponent(address)}`);
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(6,182,212,0.03)_100%)]" />
      
      <main className="relative z-10 flex flex-1 w-full max-w-4xl flex-col items-center justify-center py-20 px-4 sm:px-8">
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/80 to-amber-600/80 mb-6 shadow-xl shadow-amber-500/20 border border-amber-500/20">
            <Eye className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-3 tracking-tight font-serif italic uppercase">
            Heimdall
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
            The all-seeing guardian of THORChain nodes. Real-time health monitoring, rewards tracking, and risk analysis for the decentralized web.
          </p>
        </div>

        <div className="w-full max-w-lg mb-8 animate-fade-in-up stagger-1">
          <AddressInput onAddressSubmit={handleAddressSubmit} />
        </div>

        <div className="w-full max-w-lg mb-12 animate-fade-in-up stagger-2">
          <RecentAddresses />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl w-full animate-fade-in-up stagger-3">
          <FeatureCard
            icon={<Activity className="w-5 h-5 text-emerald-500" />}
            title="Node Health"
            description="Slash points, jail status, real-time monitoring"
            color="emerald"
          />
          <FeatureCard
            icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
            title="Earnings"
            description="APY tracking, yield projections"
            color="amber"
          />
          <FeatureCard
            icon={<Zap className="w-5 h-5 text-cyan-500" />}
            title="Risk Alerts"
            description="Churn-out, unbond windows"
            color="cyan"
          />
          <FeatureCard
            icon={<Wallet className="w-5 h-5 text-purple-500" />}
            title="Transactions"
            description="Bond, unbond, track history"
            color="purple"
          />
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500 animate-fade-in-up stagger-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Network Data</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-3 h-3" />
            <span>Non-custodial</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-3 h-3" />
            <span>THORChain Mainnet</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'emerald' | 'amber' | 'cyan' | 'purple';
}) {
  const colors = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50',
    amber: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50',
    cyan: 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800/50',
    purple: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/50',
  };
  
  return (
    <div className={`p-4 rounded-xl border ${colors[color]} bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer group`}>
      <div className="mb-2">{icon}</div>
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{title}</h3>
      <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
    </div>
  );
}
