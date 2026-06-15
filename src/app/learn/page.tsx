import Link from 'next/link';
import { ArrowRight, BookOpen, Gauge, Route, ShieldAlert, WalletCards } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { articles } from './articles';
import { cn } from '@/lib/utils';

const dashboardActions = [
  {
    label: 'Open command center',
    href: '/dashboard',
    detail: 'Start with diagnosis, source health, and ranked actions.',
    icon: <Gauge className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: 'Review provider risk',
    href: '/dashboard/risk',
    detail: 'Inspect slash exposure, jail, churn, and unbond context.',
    icon: <ShieldAlert className="h-4 w-4" aria-hidden="true" />,
  },
  {
    label: 'Prepare transaction',
    href: '/dashboard/transactions',
    detail: 'Use wallet-confirmed BOND and UNBOND previews.',
    icon: <WalletCards className="h-4 w-4" aria-hidden="true" />,
  },
];

export default function LearnPage() {
  const firstRead = articles.find((article) => article.slug === 'health-score-guide') ?? articles[0];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold uppercase text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <BookOpen className="h-4 w-4 text-amber-500" aria-hidden="true" />
          Learn
        </div>
        <h1 className="text-3xl font-bold leading-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
          Provider playbook
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400 sm:text-base">
          Read only what helps you interpret the dashboard, explain a status, or choose the next safe inspection path.
        </p>
      </header>

      <section
        aria-label="Learning triage"
        className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/20 sm:p-5"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase text-amber-700 dark:text-amber-300">Start here</p>
            <h2 className="mt-1 text-xl font-bold text-zinc-950 dark:text-zinc-50">
              Start with provider exposure scoring
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              Use this when {firstRead.useCase}
            </p>
          </div>
          <Link
            href={`/learn/${firstRead.slug}`}
            className={cn(buttonVariants({ variant: 'primary' }), 'w-full gap-2 sm:w-auto')}
          >
            Open Provider Exposure Guide
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section aria-label="Dashboard actions after learning" className="grid gap-3 md:grid-cols-3">
        {dashboardActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            aria-label={action.label}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:bg-amber-50/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-900/60 dark:hover:bg-amber-950/20"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              {action.icon}
              {action.label}
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              {action.detail}
            </p>
          </Link>
        ))}
      </section>

      <section aria-label="Operational guides" className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Operational guides</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Each guide maps to a dashboard decision path instead of a generic reading list.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/learn/${article.slug}`}
            className="group rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/70"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] font-semibold uppercase text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    {article.priority}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">{article.readTime}</span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-zinc-950 group-hover:text-amber-700 dark:text-zinc-50 dark:group-hover:text-amber-300">
                  {article.title}
                </h3>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-1 group-hover:text-amber-600 dark:group-hover:text-amber-300" aria-hidden="true" />
            </div>
            <p className="mt-2 text-sm leading-5 text-zinc-500 dark:text-zinc-400">
              {article.description}
            </p>
            <div className="mt-4 space-y-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              <p>
                <span className="font-semibold uppercase text-zinc-700 dark:text-zinc-200">Use when</span>{' '}
                {article.useCase}
              </p>
              <p>
                <span className="font-semibold uppercase text-zinc-700 dark:text-zinc-200">Relevant dashboard</span>{' '}
                {article.dashboard.label}
              </p>
            </div>
          </Link>
        ))}
        </div>
      </section>
    </div>
  );
}
