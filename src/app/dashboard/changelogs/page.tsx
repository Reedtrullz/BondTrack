'use client';

import { useChangelogs, getTypeLabel, getTypeIcon, getTypeBadgeStyle, ChangelogItem, ChangelogEntry } from '@/lib/hooks/use-changelogs';
import { Search, ChevronDown, X, SearchX, Zap, FileText, Link as LinkIcon, Rocket, Wrench, ScrollText, Eye } from 'lucide-react';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

type FilterType = 'all' | ChangelogEntry['type'];

const FILTER_OPTIONS: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Zap className="w-3 h-3" /> },
  { value: 'update', label: 'Update', icon: <Zap className="w-3 h-3" /> },
  { value: 'adr', label: 'ADR', icon: <FileText className="w-3 h-3" /> },
  { value: 'chain', label: 'Chain', icon: <LinkIcon className="w-3 h-3" /> },
  { value: 'feature', label: 'Feature', icon: <Rocket className="w-3 h-3" /> },
  { value: 'bug', label: 'Bug', icon: <Wrench className="w-3 h-3" /> },
];

const STORAGE_KEY = 'changelogs-expanded';

function buildChangelogQuery(currentParams: URLSearchParams, searchQuery: string, typeFilter: FilterType): string {
  const params = new URLSearchParams(currentParams.toString());

  if (searchQuery.trim()) {
    params.set('q', searchQuery);
  } else {
    params.delete('q');
  }

  if (typeFilter !== 'all') {
    params.set('type', typeFilter);
  } else {
    params.delete('type');
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

function parseTypeFilter(value: string | null): FilterType {
  const normalizedValue = value?.toLowerCase();
  return FILTER_OPTIONS.some(option => option.value === normalizedValue) ? (normalizedValue as FilterType) : 'all';
}

const TC = {
  blue: '#00CCFF',
  orange: '#F3BA2F',
  green: '#33FF99',
  red: '#FF4954',
  turquoise: '#23DDC8',
};

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
          <mark
            key={i}
            className="rounded px-0.5 font-semibold bg-amber-200/80 text-zinc-900 dark:bg-amber-400/30 dark:text-white"
          >
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
  const pathname = usePathname();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const yearRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const urlSearchQuery = searchParams.get('q') || '';
  const urlTypeFilter = parseTypeFilter(searchParams.get('type'));

  const [searchBuffer, setSearchBuffer] = useState(urlSearchQuery);
  const [hasResolvedExpandedPreference, setHasResolvedExpandedPreference] = useState(false);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [expandedEntryIds, setExpandedEntryIds] = useState<Record<string, Set<string>>>({});

  // Sync search buffer with URL when URL changes externally (e.g., back navigation)
  useEffect(() => {
    setSearchBuffer(urlSearchQuery);
  }, [urlSearchQuery]);

  // Handle local state initialization on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedExp = localStorage.getItem(STORAGE_KEY);
      if (savedExp) {
        try {
          setExpandedIds(new Set(JSON.parse(savedExp)));
        } catch {}
      }
      const savedEntries = localStorage.getItem(`${STORAGE_KEY}-entries`);
      if (savedEntries) {
        try {
          setExpandedEntryIds(JSON.parse(savedEntries));
        } catch {}
      }
    }
  }, []);

  const toggleEntryExpand = useCallback((changelogId: string, entryIndex: number) => {
    setExpandedEntryIds(prev => {
      const changelogEntries = prev[changelogId] || new Set();
      const nextEntries = new Set(changelogEntries);

      if (nextEntries.has(String(entryIndex))) {
        nextEntries.delete(String(entryIndex));
      } else {
        nextEntries.add(String(entryIndex));
      }

      const next = { ...prev, [changelogId]: nextEntries };
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${STORAGE_KEY}-entries`, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && expandedIds.size > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedIds]));
    }
  }, [expandedIds]);

  useEffect(() => {
    if (hasResolvedExpandedPreference || changelogs.length === 0) {
      return;
    }
    setExpandedIds(new Set(changelogs.map(c => c.id)));
    setHasResolvedExpandedPreference(true);
  }, [changelogs, hasResolvedExpandedPreference]);

  const years = useMemo(() => extractYears(changelogs), [changelogs]);
  
  const filteredChangelogs = useMemo(() => {
    if (!urlSearchQuery.trim() && urlTypeFilter === 'all') {
      return changelogs;
    }
    
    return changelogs.map(item => ({
      ...item,
      content: item.content.filter(entry => matchesFilter(entry, urlSearchQuery, urlTypeFilter))
    })).filter(item => item.content.length > 0);
  }, [changelogs, urlSearchQuery, urlTypeFilter]);

  const totalEntries = useMemo(() => {
    return filteredChangelogs.reduce((acc, item) => acc + item.content.length, 0);
  }, [filteredChangelogs]);

  const totalMonths = useMemo(() => changelogs.length, [changelogs]);
  
  const typeBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = { update: 0, adr: 0, chain: 0, feature: 0, bug: 0 };
    changelogs.forEach(item => {
      item.content.forEach(entry => {
        if (breakdown[entry.type] !== undefined) {
          breakdown[entry.type]++;
        }
      });
    });
    return breakdown;
  }, [changelogs]);

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
    const currentParams = new URLSearchParams(window.location.search);
    const nextUrl = `${pathname}${buildChangelogQuery(currentParams, '', 'all')}`;
    router.push(nextUrl, { scroll: false });
  }, [router, pathname]);

  const updateSearchQuery = useCallback((nextSearchQuery: string) => {
    setSearchBuffer(nextSearchQuery);
    const currentParams = new URLSearchParams(window.location.search);
    const nextUrl = `${pathname}${buildChangelogQuery(currentParams, nextSearchQuery, urlTypeFilter)}`;
    router.push(nextUrl, { scroll: false });
  }, [router, urlTypeFilter, pathname]);

  const updateTypeFilter = useCallback((nextTypeFilter: FilterType) => {
    const currentParams = new URLSearchParams(window.location.search);
    const nextUrl = `${pathname}${buildChangelogQuery(currentParams, urlSearchQuery, nextTypeFilter)}`;
    router.push(nextUrl, { scroll: false });
  }, [router, urlSearchQuery, pathname]);

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
        if (urlSearchQuery || urlTypeFilter !== 'all') {
          const nextSearchQuery = '';
          const nextTypeFilter: FilterType = 'all';
          const currentParams = new URLSearchParams(window.location.search);
          const nextUrl = `${pathname}${buildChangelogQuery(currentParams, nextSearchQuery, nextTypeFilter)}`;

          router.push(nextUrl, { scroll: false });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, urlSearchQuery, urlTypeFilter]);
  
  const hasActiveFilters = urlSearchQuery.trim() || urlTypeFilter !== 'all';

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-6 bg-white dark:bg-zinc-950">
        <div className="h-24 rounded-xl animate-pulse bg-zinc-200 dark:bg-zinc-800" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl animate-pulse bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 bg-white px-4 py-4 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-500/80 to-amber-600/80 shadow-lg shadow-amber-500/20 border border-amber-500/20"
        >
          <ScrollText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 
            className="text-2xl font-bold text-zinc-900 dark:text-white font-serif italic uppercase"
          >
            Odin's Journal
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">Historical timeline of THORChain protocol evolution</p>
        </div>
      </div>

      {/* Chronicle Wisdom (Stats) */}
      <div
        className="relative mb-6 overflow-hidden rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 dark:border-amber-500/20 dark:bg-amber-500/5 shadow-inner"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-900 dark:bg-zinc-800 text-amber-500">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Protocol Statistics</p>
              <p className="text-lg font-bold text-zinc-900 dark:text-white">
                {changelogs.reduce((a, c) => a + c.content.length, 0)} protocol updates across {totalMonths} months
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-right">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest">Latest Release</p>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-500">v3.16</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-widest">Established</p>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">Aug 2022</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: TC.blue }} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search changelogs... (press /)"
            value={searchBuffer}
            onChange={(e) => updateSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white py-3 pl-10 pr-10 text-zinc-900 placeholder:text-zinc-400 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500"
          />
          {searchBuffer && (
            <button
              onClick={() => updateSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => {
            const isActive = urlTypeFilter === option.value;
            const hasCount = option.value !== 'all' && typeBreakdown[option.value] > 0;
            const href = `${pathname}${buildChangelogQuery(searchParams, urlSearchQuery, option.value)}`;
            
            return (
              <Link
                key={option.value}
                href={href}
                scroll={false}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'text-black'
                    : 'border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
                style={{
                  backgroundColor: isActive ? TC.blue : 'transparent',
                }}
              >
                {option.icon}
                {option.label}
                {hasCount && (
                  <span 
                    className="rounded-full px-1.5 py-0.5 text-xs text-zinc-700 dark:text-zinc-300"
                    style={{ 
                      backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(113,113,122,0.12)',
                    }}
                  >
                    {typeBreakdown[option.value]}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">
              Showing {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'} of {changelogs.reduce((a, c) => a + c.content.length, 0)} total
            </span>
            <Link
              href={`${pathname}${buildChangelogQuery(searchParams, '', 'all')}`}
              scroll={false}
              className="flex items-center gap-1 text-cyan-600 transition-colors hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-white"
            >
              <X className="w-3 h-3" /> Clear filters
            </Link>
          </div>
        )}
      </div>

      {/* Year Quick Nav */}
      {years.length > 1 && (
        <div
          className="sticky top-0 z-10 -mx-4 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90 sm:-mx-6 sm:px-6"
        >
          <div className="flex flex-wrap gap-2">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => scrollToYear(String(year))}
                className="rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-1.5 text-sm font-semibold text-zinc-600 transition-all hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Animated timeline line with pulsing dots */}
        <div className="hidden sm:block absolute left-4 top-0 bottom-0 w-0.5">
          <div 
            className="absolute inset-0"
            style={{ background: `linear-gradient(to bottom, #00CCFF 0%, #00CCFF 20%, transparent 20%)` }}
          />
        </div>
        
        <div className="space-y-6">
          {filteredChangelogs.length === 0 ? (
            <div
              className="rounded-xl border border-zinc-200 bg-zinc-50 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900"
            >
              <SearchX className="mx-auto mb-4 h-16 w-16 text-zinc-300 dark:text-zinc-600" />
              <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white font-serif italic">
                No results found
              </h3>
              <p className="mb-4 text-zinc-500 dark:text-zinc-400">
                {searchBuffer 
                  ? `No entries matching "${searchBuffer}"`
                  : 'No entries match your current filters'}
              </p>
              {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-cyan-600 hover:underline dark:text-cyan-400"
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
                  {/* Pulsing timeline dot */}
                  <div className="hidden sm:block absolute left-0 top-6 w-4 h-4 -translate-x-1/2">
                    <div 
                      className="absolute inset-0 rounded-full animate-ping"
                      style={{ backgroundColor: TC.blue, opacity: 0.75 }}
                    />
                    <div 
                      className="absolute inset-1 rounded-full"
                      style={{ backgroundColor: TC.blue }}
                    />
                  </div>

                  {/* Card */}
                  <div
                    className="overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all duration-300 hover:translate-y-[-2px] dark:border-zinc-800 dark:bg-zinc-900"
                    style={{ 
                      boxShadow: isExpanded ? `0 0 20px rgba(0, 204, 255, 0.1)` : 'none',
                    }}
                  >
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className={`flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                        isExpanded ? '' : 'border-b border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-left">
                        <div className="flex items-center gap-3">
                          <h2 
                            className="text-lg font-bold text-zinc-900 dark:text-white font-serif italic"
                          >
                            <HighlightText text={item.title} highlight={urlSearchQuery} />
                          </h2>
                          <span className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{item.date}</span>
                        </div>
                        
                        {!isExpanded && (
                          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                            {Array.from(new Set(item.content.map(e => e.type))).map(type => {
                              const count = item.content.filter(e => e.type === type).length;
                              return (
                                <span 
                                  key={type}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50"
                                  style={{ color: getTypeBadgeStyle(type).text }}
                                >
                                  {getTypeIcon(type)} {count}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <ChevronDown 
                        className={`w-5 h-5 transition-transform duration-300 flex-shrink-0 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        style={{ color: TC.blue }}
                      />
                    </button>

                    {/* Expandable content */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="p-6 space-y-4">
                        {item.content.map((entry, entryIndex) => {
                          const isEntryExpanded = (expandedEntryIds[item.id] && expandedEntryIds[item.id].has(String(entryIndex))) || urlSearchQuery.length > 0;
                          
                          return (
                            <div 
                              key={entryIndex} 
                              className="relative rounded-lg transition-all duration-200"
                            >
                              <button
                                onClick={() => toggleEntryExpand(item.id, entryIndex)}
                                className={`w-full text-left group flex items-start gap-4 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/30 transition-colors ${
                                  isEntryExpanded ? 'bg-zinc-50 dark:bg-zinc-900/40 shadow-sm border border-zinc-100 dark:border-zinc-800/50' : ''
                                }`}
                                style={{ borderLeft: `3px solid ${getTypeBadgeStyle(entry.type).text}` }}
                              >
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span 
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border border-zinc-200/50 dark:border-zinc-800/50"
                                      style={{ 
                                        backgroundColor: getTypeBadgeStyle(entry.type).bg,
                                        color: getTypeBadgeStyle(entry.type).text,
                                      }}
                                    >
                                      {getTypeIcon(entry.type)} {getTypeLabel(entry.type)}
                                    </span>
                                    <h3 
                                      className="font-bold text-zinc-900 dark:text-white font-serif italic leading-tight"
                                    >
                                      <HighlightText text={entry.title} highlight={urlSearchQuery} />
                                    </h3>
                                  </div>
                                  
                                  {isEntryExpanded ? (
                                    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                                        <HighlightText text={entry.description} highlight={urlSearchQuery} />
                                      </p>
                                      {entry.links && entry.links.length > 0 && (
                                        <div className="flex flex-wrap gap-3 pt-1">
                                          {entry.links.map((link, linkIndex) => (
                                            <a
                                              key={linkIndex}
                                              href={link.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-xs text-cyan-600 transition-colors hover:underline dark:text-cyan-400 font-medium"
                                            >
                                              {link.text} <LinkIcon className="w-3 h-3" />
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="mt-1 text-xs text-zinc-400 line-clamp-1 opacity-70">
                                      {entry.description}
                                    </p>
                                  )}
                                </div>
                                <div className={`flex-shrink-0 transition-transform duration-200 ${isEntryExpanded ? 'rotate-180' : 'opacity-0 group-hover:opacity-100'}`}>
                                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="mt-12 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Data sourced from{' '}
          <a 
            href="https://tcupdates.medium.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-cyan-600 transition-colors hover:underline dark:text-cyan-400"
          >
            TCC Cross-Chain Updates <LinkIcon className="w-3 h-3" />
          </a>
          {' '}— THORChain community Medium publication
        </p>
      </div>
    </div>
  );
}
