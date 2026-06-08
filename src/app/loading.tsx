import { Loader2 } from 'lucide-react';

export default function RootLoading() {
  return (
    <main
      id="main"
      role="status"
      aria-label="Loading home"
      className="flex min-h-screen items-center justify-center gap-2 text-zinc-500"
    >
      <Loader2 className="h-5 w-5 motion-safe:animate-spin" />
      <span>Loading…</span>
    </main>
  );
}
