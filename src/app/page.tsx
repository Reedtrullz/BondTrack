'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AddressInput } from '@/components/shared/address-input';
import { RecentAddresses } from '@/components/shared/recent-addresses';
import { Shield, Activity, BarChart3 } from 'lucide-react';

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
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black font-sans">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-4 sm:px-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            BondTrack
          </h1>
          <p className="text-zinc-500 max-w-md">
            Track your bonded RUNE, rewards, and node health from your pooled nodes.
          </p>
        </div>

        <AddressInput onAddressSubmit={handleAddressSubmit} />

        <div className="mt-6 w-full max-w-md">
          <RecentAddresses />
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full">
          <FeatureCard
            icon={<Activity className="w-5 h-5" />}
            title="Node Health"
            description="Monitor your nodes' status, slash points, and jail events in real-time"
          />
          <FeatureCard
            icon={<BarChart3 className="w-5 h-5" />}
            title="Earnings"
            description="Track your rewards, view APY projections, and analyze yield performance"
          />
          <FeatureCard
            icon={<Shield className="w-5 h-5" />}
            title="Risk Alerts"
            description="Get notified about churn-out risk, unbond windows, and position alerts"
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
