import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { articleBySlug, articles, type LearnArticleSection } from '../articles';

function renderInlineMarkdown(text: string): ReactNode[] {
  const tokens = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g).filter(Boolean);

  return tokens.map((token, index) => {
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      if (href.startsWith('/')) {
        return (
          <Link
            key={`${href}-${index}`}
            href={href}
            className="text-cyan-600 underline underline-offset-4 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
          >
            {label}
          </Link>
        );
      }

      return (
        <a
          key={`${href}-${index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-600 underline underline-offset-4 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
        >
          {label}
        </a>
      );
    }

    const strongMatch = /^\*\*([^*]+)\*\*$/.exec(token);
    if (strongMatch) {
      return <strong key={`${strongMatch[1]}-${index}`}>{strongMatch[1]}</strong>;
    }

    return <span key={`${token}-${index}`}>{token}</span>;
  });
}

function stripInlineMarkdown(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1');
}

function ArticleList({ section }: { section: LearnArticleSection }) {
  if (!section.list) return null;

  const ListTag = section.list.kind === 'ordered' ? 'ol' : 'ul';

  return (
    <ListTag
      aria-label={section.list.label}
      className={cn(
        'mt-4 space-y-3 pl-5 text-sm leading-6 text-zinc-600 dark:text-zinc-300',
        section.list.kind === 'ordered' ? 'list-decimal' : 'list-disc'
      )}
    >
      {section.list.items.map((item) => (
        <li key={item} aria-label={stripInlineMarkdown(item)}>
          {renderInlineMarkdown(item)}
        </li>
      ))}
    </ListTag>
  );
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articleBySlug[slug];

  if (!article) {
    notFound();
  }

  const relatedArticles = articles
    .filter((candidate) => candidate.slug !== article.slug)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link href="/learn" className={buttonVariants({ variant: 'ghost', className: 'gap-2' })}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Learn
        </Link>
      </div>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold uppercase text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <BookOpen className="h-4 w-4 text-amber-500" aria-hidden="true" />
            Operator guide
          </span>
          <span>{article.date}</span>
          <span aria-hidden="true">/</span>
          <span>{article.readTime}</span>
        </div>
        <div className="space-y-3">
          <h1 id="learn-article-title" className="text-3xl font-bold leading-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
            {article.title}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            {article.description}
          </p>
        </div>
      </header>

      <section
        aria-label="Learning article decision"
        className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/20 sm:p-5"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase text-amber-700 dark:text-amber-300">Use this when</p>
            <p className="mt-1 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              Use this when {article.useCase}
            </p>
          </div>
          <Link
            href={article.dashboard.href}
            className={cn(buttonVariants({ variant: 'primary' }), 'w-full gap-2 sm:w-auto')}
          >
            Open {article.dashboard.label} dashboard
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <article aria-labelledby="learn-article-title" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div aria-label="Article sections" className="space-y-8">
          {article.sections.map((section) => (
            <section key={section.heading} className="border-b border-zinc-100 pb-8 last:border-b-0 last:pb-0 dark:border-zinc-800">
              <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                {section.heading}
              </h2>
              {section.body?.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  {renderInlineMarkdown(paragraph)}
                </p>
              ))}
              <ArticleList section={section} />
            </section>
          ))}
        </div>
      </article>

      <section aria-label="Next inspection paths" className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Next inspection paths</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {article.nextSteps.map((step) => (
            <Link
              key={`${step.href}-${step.label}`}
              href={step.href}
              className="rounded-xl border border-zinc-200 bg-white p-3 text-sm font-semibold text-zinc-800 transition hover:border-amber-300 hover:bg-amber-50/50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-amber-900/60 dark:hover:bg-amber-950/20"
            >
              {step.label}
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Related Articles" className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Related Articles</h2>
        <div className="flex flex-wrap gap-2">
          {relatedArticles.map((relatedArticle) => (
            <Link
              href={`/learn/${relatedArticle.slug}`}
              key={relatedArticle.slug}
              className={buttonVariants({ variant: 'outline' })}
            >
              {relatedArticle.title}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
