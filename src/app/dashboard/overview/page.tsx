'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function OverviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    router.replace(`/dashboard/portfolio${params ? `?${params}` : ''}`);
  }, [router, searchParams]);

  return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-zinc-500">Redirecting to Portfolio...</p>
    </div>
  );
}
