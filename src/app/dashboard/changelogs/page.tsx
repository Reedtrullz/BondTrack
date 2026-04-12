'use client';

import { useChangelogs, getTypeColor, getTypeLabel, ChangelogItem, ChangelogEntry } from '@/lib/hooks/use-changelogs';
import { ScrollText, ExternalLink, Search, ChevronDown, X, SearchX } from 'lucide-react';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type FilterType = 'all' | ChangelogEntry['type'];

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'update', label: 'Update' },
  { value: 'adr', label: 'ADR' },
  { value: 'chain', label: 'Chain' },
  { value: 'feature', label: 'Feature' },
  { value: 'bug', label: 'Bug' },
];

const STORAGE_KEY = 'changelogs-expanded';

function extractYears(changelogs: ChangelogItem[]): number[] {
  const years = new Set<number>();
  changelogs.forEach(item => {
    if (item.sortDate) {
      const year = parseInt(item.sortDate.split('-')[0], 10);
      if (!isNaN(year)) years.add(year);
    }
  });
  return Array.from(years).sort();
}

export function matchesFilter(entry: ChangelogEntry, searchQuery: string, typeFilter: FilterType): boolean {
  const matchesType = typeFilter === 'all' || entry.type === typeFilter;
  
  if (!searchQuery.trim()) {
    return matchesType;
  }
  
  const query = searchQuery.toLowerCase();
  const matchesSearch = 
    entry.title.toLowerCase().includes(query) || 
    entry.description.toLowerCase().includes(query);
  
  return matchesType && matchesSearch;
}

function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/30 text-zinc-900 dark:text-zinc-100 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function ChangelogsPage() {
  const { changelogs, isLoading } = useChangelogs();
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const yearRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [typeFilter, setTypeFilter] = useState<FilterType>((searchParams.get('type') as FilterType) || 'all');
  
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return new Set(JSON.parse(saved));
        } catch {
          return new Set();
        }
      }
    }
    return new Set();
  });

  // Sync to URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    
    const newUrl = params.toString() 
      ? `?${params.toString()}` 
      : '/dashboard/changelogs';
    
    router.replace(newUrl, { scroll: false });
  }, [searchQuery, typeFilter, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && expandedIds.size > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedIds]));
    }
  }, [expandedIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
        }
        if (searchQuery || typeFilter !== 'all') {
          clearFilters();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, typeFilter]);

  const years = useMemo(() => extractYears(changelogs), [changelogs]);
  
  const filteredChangelogs = useMemo(() => {
    if (!searchQuery.trim() && typeFilter === 'all') {
      return changelogs;
    }
    
    return changelogs.map(item => ({
      ...item,
      content: item.content.filter(entry => matchesFilter(entry, searchQuery, typeFilter))
    })).filter(item => item.content.length > 0);
  }, [changelogs, searchQuery, typeFilter]);
  
  const totalEntries = useMemo(() => {
    return filteredChangelogs.reduce((acc, item) => acc + item.content.length, 0);
  }, [filteredChangelogs]);
  
  useEffect(() => {
    if (changelogs.length > 0 && expandedIds.size === 0) {
      setExpandedIds(new Set(changelogs.map(c => c.id)));
    }
  }, [changelogs, expandedIds]);
  
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  const scrollToYear = useCallback((year: string) => {
    const element = yearRefs.current.get(year);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);
  
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setTypeFilter('all');
  }, []);
  
  const hasActiveFilters = searchQuery.trim() || typeFilter !== 'all';

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <ScrollText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">THORChain Changelogs</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Monthly protocol updates and changes</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search changelogs... (press /)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setTypeFilter(option.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all ${
                typeFilter === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">
              Showing {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'} of {changelogs.length} {changelogs.length === 1 ? 'month' : 'months'}
            </span>
            <button
              onClick={clearFilters}
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          </div>
        )}
      </div>

      {years.length > 1 && (
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-wrap gap-2">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => scrollToYear(String(year))}
                className="px-3 py-1 text-xs font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full hover:bg-blue-600 hover:text-white transition-colors"
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <div className="hidden sm:block absolute left-4 top-0 bottom-0 w-0.5 bg-zinc-200 dark:bg-zinc-800" />
        
        <div className="space-y-8">
          {filteredChangelogs.length === 0 ? (
            <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <SearchX className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No results found</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                {searchQuery 
                  ? `No entries matching "${searchQuery}"`
                  : 'No entries match your current filters'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            filteredChangelogs.map((item, index) => {
              const year = item.sortDate ? item.sortDate.split('-')[0] : '';
              const isExpanded = expandedIds.has(item.id);
              
              return (
                <div 
                  key={item.id} 
                  id={item.id}
                  ref={(el) => {
                    if (year && el) yearRefs.current.set(year, el);
                  }}
                  className="relative pl-0 sm:pl-10"
                >
                  <div className="hidden sm:block absolute left-0 top-2 w-8 h-8 -translate-x-1/2 rounded-full flex items-center justify-center border-4 border-zinc-50 dark:border-zinc-950 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    <span className="text-xs font-bold">{index + 1}</span>
                  </div>

                  <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="w-full px-6 py-4 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <div className="flex items-center gap-3 text-left">
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          <HighlightText text={item.title} highlight={searchQuery} />
                        </h2>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.date}</span>
                      </div>
                      <ChevronDown 
                        className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    <div 
                      className={`overflow-hidden transition-all duration-200 ease-in-out ${
                        isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
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
                              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                                <HighlightText text={entry.title} highlight={searchQuery} />
                              </h3>
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                              <HighlightText text={entry.description} highlight={searchQuery} />
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
                </div>
              );
            })
          )}
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