'use client';

import { Suspense } from 'react';
import ChangelogsPage from './page';

function ChangelogsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-6">
      <div className="h-12 w-48 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function ChangelogsLayout() {
  return (
    <Suspense fallback={<ChangelogsLoading />}>
      <ChangelogsPage />
    </Suspense>
  );
}