'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <main
          id="main"
          className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center"
        >
          <h1 className="text-2xl font-semibold">Heimdall hit a fatal error</h1>
          {error.digest && (
            <p className="font-mono text-xs text-zinc-500">digest: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
