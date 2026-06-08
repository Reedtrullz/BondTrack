import Link from 'next/link';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center"
    >
      <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-900/20">
        <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Page not found
        </h1>
        <p className="max-w-md text-sm text-zinc-500 dark:text-zinc-400">
          The route you requested does not exist on Heimdall. Check the URL or
          return to the home page to enter a THORChain address.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 h-10 px-5 py-2.5 rounded-lg text-sm font-semibold bg-amber-500 text-white shadow-md shadow-amber-500/25 hover:bg-amber-600 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <Home className="h-4 w-4" />
        Go to Home
      </Link>
    </main>
  );
}
