'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Heimdall client error:', error);
  }, [error]);

  return (
    <main
      id="main"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-4 text-center"
    >
      <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Something went wrong
        </h2>
        <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          Heimdall hit an unexpected error rendering this page. Other dashboard
          views use separate source checks; try again or reload.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-zinc-400">digest: {error.digest}</p>
        )}
      </div>
      <Button onClick={() => reset()}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </main>
  );
}
