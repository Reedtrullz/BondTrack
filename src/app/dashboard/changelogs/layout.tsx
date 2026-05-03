'use client';

import { Suspense } from 'react';
import { ScrollText } from 'lucide-react';
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

function ChangelogsError() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
      <div className="text-center py-12">
        <ScrollText className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-500 dark:text-zinc-400">Failed to load changelogs</p>
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