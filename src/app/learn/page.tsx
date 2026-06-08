import Link from 'next/link';
import { BookOpen, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { articles } from './articles';

export default function LearnPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
          <BookOpen className="h-8 w-8 text-[var(--color-primary)]" />
        </div>
        <h1 className="font-display text-4xl font-bold text-zinc-900 dark:text-zinc-100">
          Learn
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-lg text-zinc-500 dark:text-zinc-400">
          Educational resources for THORChain bond providers and LP participants
        </p>
      </div>

      {/* Article Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/learn/${article.slug}`}
            className="group"
          >
            <Card className="h-full border-zinc-200 bg-white/80 shadow-md backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-glow dark:border-zinc-800 dark:bg-zinc-900/80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display group-hover:text-[var(--color-primary)]">
                    {article.title}
                  </CardTitle>
                  <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-1 group-hover:text-[var(--color-primary)]" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-500 dark:text-zinc-400">
                  {article.description}
                </p>
                <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
                  {article.readTime}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Empty State for Future Articles */}
      <div className="mt-12 rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
        <p className="text-zinc-500">
          More articles coming soon: Advanced Bonding, Tax Guides, Security Best Practices
        </p>
      </div>
    </div>
  );
}
