'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddressInput } from '@/components/shared/address-input';
import { Shield, Activity, BarChart3 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  const handleAddressSubmit = (address: string) => {
    router.push(`/dashboard?address=${encodeURIComponent(address)}`);
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black font-sans">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-4 sm:px-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            THORNode Watcher
          </h1>
          <p className="text-zinc-500 max-w-md">
            Monitor your bond provider positions, track rewards, and stay informed about node health across the THORChain network.
          </p>
        </div>

        <AddressInput onAddressSubmit={handleAddressSubmit} />

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full">
          <FeatureCard
            icon={<Activity className="w-5 h-5" />}
            title="Real-time Monitoring"
            description="Track node status, slash points, and jail events"
          />
          <FeatureCard
            icon={<BarChart3 className="w-5 h-5" />}
            title="Rewards Tracking"
            description="View earnings history, APY, and PnL breakdown"
          />
          <FeatureCard
            icon={<Shield className="w-5 h-5" />}
            title="Risk Alerts"
            description="Get notified about churn-out risk and unbond windows"
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
      <div className="text-blue-600 mb-2">{icon}</div>
      <h3 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{title}</h3>
      <p className="text-xs text-zinc-500 mt-1">{description}</p>
    </div>
  );
}
