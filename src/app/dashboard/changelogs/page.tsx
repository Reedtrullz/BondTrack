'use client';

import { useChangelogs, getTypeColor, getTypeLabel, ChangelogItem } from '@/lib/hooks/use-changelogs';
import { ScrollText, ExternalLink, GitCommit } from 'lucide-react';

export default function ChangelogsPage() {
  const { changelogs, isLoading } = useChangelogs();

  if (isLoading) {
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <ScrollText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">THORChain Changelogs</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Monthly protocol updates and changes</p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-zinc-200 dark:bg-zinc-800" />
        
        <div className="space-y-8">
          {changelogs.map((item, index) => (
            <ChangelogSection key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>

      <div className="mt-12 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Data sourced from{' '}
          <a 
            href="https://tcupdates.medium.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            TCC Cross-Chain Updates <ExternalLink className="w-3 h-3" />
          </a>
          {' '}&bull; THORChain community Medium publication
        </p>
      </div>
    </div>
  );
}

function ChangelogSection({ item, index }: { item: ChangelogItem; index: number }) {
  return (
    <div className="relative pl-10">
      <div className={`
        absolute left-0 top-2 w-8 h-8 rounded-full flex items-center justify-center
        ${index === 0 ? 'bg-blue-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}
      `}>
        {index === 0 ? (
          <GitCommit className="w-4 h-4" />
        ) : (
          <span className="text-xs font-bold">{index + 1}</span>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{item.title}</h2>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.date}</span>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {item.content.map((entry, entryIndex) => (
            <div 
              key={entryIndex} 
              className="relative pl-4 border-l-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex flex-wrap items-start gap-2 mb-2">
                <span className={`
                  inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
                  ${getTypeColor(entry.type)}
                `}>
                  {getTypeLabel(entry.type)}
                </span>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{entry.title}</h3>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {entry.description}
              </p>
              {entry.links && entry.links.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {entry.links.map((link, linkIndex) => (
                    <a
                      key={linkIndex}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {link.text} <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}