'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BondSimulator } from '@/components/dashboard/bond-simulator';
import { useBondPositions } from '@/lib/hooks/use-bond-positions';

export default function SimulatorPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address');

  const { positions } = useBondPositions(address);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={address ? `/dashboard/portfolio?address=${encodeURIComponent(address)}` : '/dashboard/portfolio'}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portfolio
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Bond Simulator
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Test bond strategies and preview the impact on your portfolio
          </p>
        </div>
      </div>

      <BondSimulator currentPositions={positions} />
    </div>
  );
}
