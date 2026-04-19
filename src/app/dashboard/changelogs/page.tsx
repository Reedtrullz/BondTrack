'use client';

import { useChangelogs, getTypeLabel, getTypeIcon, getTypeBadgeStyle, ChangelogItem, ChangelogEntry } from '@/lib/hooks/use-changelogs';
import { Search, ChevronDown, X, SearchX, Zap, FileText, Link, Rocket, Wrench } from 'lucide-react';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type FilterType = 'all' | ChangelogEntry['type'];

const FILTER_OPTIONS: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Zap className="w-3 h-3" /> },
  { value: 'update', label: 'Update', icon: <Zap className="w-3 h-3" /> },
  { value: 'adr', label: 'ADR', icon: <FileText className="w-3 h-3" /> },
  { value: 'chain', label: 'Chain', icon: <Link className="w-3 h-3" /> },
  { value: 'feature', label: 'Feature', icon: <Rocket className="w-3 h-3" /> },
  { value: 'bug', label: 'Bug', icon: <Wrench className="w-3 h-3" /> },
];

const STORAGE_KEY = 'changelogs-expanded';

function buildChangelogQuery(searchQuery: string, typeFilter: FilterType): string {
  const params = new URLSearchParams();

  if (searchQuery.trim()) {
    params.set('q', searchQuery);
  }

  if (typeFilter !== 'all') {
    params.set('type', typeFilter);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '?' ;
}

function parseTypeFilter(value: string | null): FilterType {
  return FILTER_OPTIONS.some(option => option.value === value) ? (value as FilterType) : 'all';
}

// THORChain brand colors
const TC = {
  blue: '#00CCFF',
  orange: '#F3BA2F',
  green: '#33FF99',
  red: '#FF4954',
  turquoise: '#23DDC8',
  dark: '#1a1d23',
  border: '#3d4149',
  muted: '#6b7280',
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
            className="bg-[#F3BA2F]/30 text-white rounded px-0.5 font-semibold"
            style={{ backgroundColor: 'rgba(243, 186, 47, 0.3)' }}
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

function StatsBanner({ totalEntries, totalMonths }: { totalEntries: number; totalMonths: number }) {
  return (
    <div 
      className="relative overflow-hidden rounded-xl p-4 mb-6"
      style={{ backgroundColor: 'rgba(0, 204, 255, 0.1)', border: '1px solid rgba(0, 204, 255, 0.2)' }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00CCFF]/5 to-transparent" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: TC.blue }}
          >
            <Zap className="w-5 h-5 text-black" />
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Protocol Updates</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-white" style={{ fontFamily: 'Exo 2, sans-serif' }}>
              {totalEntries} changes across {totalMonths} months
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-right">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wide">Latest</p>
            <p className="text-sm font-semibold text-[#00CCFF]">v3.16</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wide">Since</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Aug 2022</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChangelogsPage() {
  const { changelogs, isLoading } = useChangelogs();
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const yearRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const urlSearchQuery = searchParams.get('q') || '';
  const urlTypeFilter = parseTypeFilter(searchParams.get('type'));

  const [searchQuery, setSearchQuery] = useState(urlSearchQuery);
  const [typeFilter, setTypeFilter] = useState<FilterType>(urlTypeFilter);
  const [hasResolvedExpandedPreference, setHasResolvedExpandedPreference] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) !== null;
    }

    return false;
  });
  const lastSyncedUrlRef = useRef(buildChangelogQuery(urlSearchQuery, urlTypeFilter));

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
  const [expandedEntryIds, setExpandedEntryIds] = useState<Record<string, Set<string>>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_KEY}-entries`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return {};
        }
      }
    }
    return {};
  });

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

      if (typeof window !== 'undefined' && hasResolvedExpandedPreference) {
        localStorage.setItem(`${STORAGE_KEY}-entries`, JSON.stringify(next));
      }

      return next;
    });
  }, [hasResolvedExpandedPreference]);

  useEffect(() => {
    const nextUrl = buildChangelogQuery(urlSearchQuery, urlTypeFilter);

    if (nextUrl === lastSyncedUrlRef.current) {
      return;
    }

    lastSyncedUrlRef.current = nextUrl;

    if (searchQuery !== urlSearchQuery) {
      setSearchQuery(urlSearchQuery);
    }

    if (typeFilter !== urlTypeFilter) {
      setTypeFilter(urlTypeFilter);
    }
  }, [searchQuery, typeFilter, urlSearchQuery, urlTypeFilter]);

  useEffect(() => {
    if (typeof window !== 'undefined' && hasResolvedExpandedPreference) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedIds]));
    }
  }, [expandedIds, hasResolvedExpandedPreference]);

  useEffect(() => {
    if (hasResolvedExpandedPreference || changelogs.length === 0) {
      return;
    }

    setExpandedIds(new Set(changelogs.map(c => c.id)));
    setHasResolvedExpandedPreference(true);
  }, [changelogs, hasResolvedExpandedPreference]);

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
    const nextSearchQuery = '';
    const nextTypeFilter: FilterType = 'all';
    const nextUrl = buildChangelogQuery(nextSearchQuery, nextTypeFilter);

    setSearchQuery(nextSearchQuery);
    setTypeFilter(nextTypeFilter);
    router.replace(nextUrl, { scroll: false });
  }, [router]);

  const updateSearchQuery = useCallback((nextSearchQuery: string) => {
    const nextUrl = buildChangelogQuery(nextSearchQuery, typeFilter);

    setSearchQuery(nextSearchQuery);
    router.replace(nextUrl, { scroll: false });
  }, [router, typeFilter]);

  const updateTypeFilter = useCallback((nextTypeFilter: FilterType) => {
    const nextUrl = buildChangelogQuery(searchQuery, nextTypeFilter);

    setTypeFilter(nextTypeFilter);
    router.replace(nextUrl, { scroll: false });
  }, [router, searchQuery]);

  useEffect(() => {
    const handleUrlChange = () => {
      const currentUrl = buildChangelogQuery(searchQuery, typeFilter);
      if (currentUrl !== lastSyncedUrlRef.current) {
        lastSyncedUrlRef.current = currentUrl;
        router.replace(currentUrl, { scroll: false });
      }
    };

    handleUrlChange();
  }, [searchQuery, typeFilter, router]);

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
          const nextSearchQuery = '';
          const nextTypeFilter: FilterType = 'all';
          const nextUrl = buildChangelogQuery(nextSearchQuery, nextTypeFilter);

          setSearchQuery(nextSearchQuery);
          setTypeFilter(nextTypeFilter);
          router.replace(nextUrl, { scroll: false });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, searchQuery, typeFilter]);
  
  const hasActiveFilters = searchQuery.trim() || typeFilter !== 'all';

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-6 dark:bg-[#0a0a0a]">
        <div className="h-24 rounded-xl animate-pulse bg-zinc-100 dark:bg-[#282c34]" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl animate-pulse bg-zinc-100 dark:bg-[#282c34]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-6 dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: TC.blue }}
        >
          <Zap className="w-6 h-6 text-black" />
        </div>
        <div>
          <h1 
            className="text-2xl font-bold text-white"
            style={{ fontFamily: 'Exo 2, sans-serif' }}
          >
            THORChain Changelogs
          </h1>
          <p className="text-sm text-zinc-500">Protocol updates and changes</p>
        </div>
      </div>

      {/* Stats Banner */}
      <StatsBanner totalEntries={changelogs.reduce((a, c) => a + c.content.length, 0)} totalMonths={totalMonths} />

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: TC.blue }} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search changelogs... (press /)"
            value={searchQuery}
            onChange={(e) => updateSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-lg text-white dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:outline-none transition-all bg-white dark:bg-[#1a1d23] border border-zinc-200 dark:border-[#3d4149]"
          />
          {searchQuery && (
            <button
              onClick={() => updateSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => {
            const isActive = typeFilter === option.value;
            const hasCount = option.value !== 'all' && typeBreakdown[option.value] > 0;
            
            return (
              <button
                key={option.value}
                onClick={() => updateTypeFilter(option.value)}
                className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-all ${
                  isActive
                    ? 'text-black'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white'
                }`}
                style={{
                  backgroundColor: isActive ? TC.blue : 'transparent',
                  border: isActive ? 'none' : '1px solid #e2e8f0',
                }}
              >
                {option.icon}
                {option.label}
                {hasCount && (
                  <span 
                    className="px-1.5 py-0.5 text-xs rounded-full"
                    style={{ 
                      backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : '#1a1d23',
                    }}
                  >
                    {typeBreakdown[option.value]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">
              Showing {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'} of {changelogs.reduce((a, c) => a + c.content.length, 0)} total
            </span>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 hover:text-white transition-colors"
              style={{ color: TC.blue }}
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Year Quick Nav */}
      {years.length > 1 && (
        <div 
          className="sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(26, 29, 35, 0.9)', borderBottom: '1px solid #3d4149' }}
        >
          <div className="flex flex-wrap gap-2">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => scrollToYear(String(year))}
                className="px-4 py-1.5 text-sm font-semibold rounded-lg transition-all hover:text-black"
                style={{
                  backgroundColor: '#1a1d23',
                  border: '1px solid #3d4149',
                  color: '#6b7280',
                }}
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
              className="text-center py-16 rounded-xl"
              style={{ backgroundColor: '#1a1d23', border: '1px solid #3d4149' }}
            >
              <SearchX className="w-16 h-16 mx-auto mb-4" style={{ color: '#3d4149' }} />
              <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'Exo 2, sans-serif' }}>
                No results found
              </h3>
              <p className="text-zinc-500 mb-4">
                {searchQuery 
                  ? `No entries matching "${searchQuery}"`
                  : 'No entries match your current filters'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="hover:underline"
                  style={{ color: TC.blue }}
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
                    className="rounded-xl overflow-hidden transition-all duration-300 hover:translate-y-[-2px]"
                    style={{ 
                      backgroundColor: '#1a1d23', 
                      border: '1px solid #3d4149',
                      boxShadow: isExpanded ? `0 0 20px rgba(0, 204, 255, 0.1)` : 'none',
                    }}
                  >
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="w-full px-6 py-4 flex items-center justify-between transition-colors hover:bg-white/5"
                      style={{ borderBottom: isExpanded ? 'none' : '1px solid #3d4149' }}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <h2 
                          className="text-lg font-bold text-white"
                          style={{ fontFamily: 'Exo 2, sans-serif' }}
                        >
                          <HighlightText text={item.title} highlight={searchQuery} />
                        </h2>
                        <span className="text-sm" style={{ color: '#6b7280' }}>{item.date}</span>
                      </div>
                      <ChevronDown 
                        className={`w-5 h-5 transition-transform duration-300 ${
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
                        {item.content.map((entry, entryIndex) => (
                          <div 
                            key={entryIndex} 
                            className="relative pl-4 transition-colors hover:bg-white/5 rounded-lg p-3"
                            style={{ borderLeft: `2px solid ${getTypeBadgeStyle(entry.type).text}` }}
                          >
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border"
                                style={{ 
                                  backgroundColor: getTypeBadgeStyle(entry.type).bg,
                                  borderColor: getTypeBadgeStyle(entry.type).border,
                                  color: getTypeBadgeStyle(entry.type).text,
                                }}
                              >
                                {getTypeIcon(entry.type)} {getTypeLabel(entry.type)}
                              </span>
                              <h3 
                                className="font-semibold text-white"
                                style={{ fontFamily: 'Exo 2, sans-serif' }}
                              >
                                <HighlightText text={entry.title} highlight={searchQuery} />
                              </h3>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
                              <HighlightText text={entry.description} highlight={searchQuery} />
                            </p>
                            {entry.links && entry.links.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-3">
                                {entry.links.map((link, linkIndex) => (
                                  <a
                                    key={linkIndex}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs hover:underline transition-colors"
                                    style={{ color: TC.blue }}
                                  >
                                    {link.text} <Link className="w-3 h-3" />
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

      {/* Footer */}
      <div 
        className="mt-12 p-4 rounded-lg"
        style={{ backgroundColor: '#1a1d23', border: '1px solid #3d4149' }}
      >
        <p className="text-sm" style={{ color: '#6b7280' }}>
          Data sourced from{' '}
          <a 
            href="https://tcupdates.medium.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline inline-flex items-center gap-1 transition-colors"
            style={{ color: TC.blue }}
          >
            TCC Cross-Chain Updates <Link className="w-3 h-3" />
          </a>
          {' '}— THORChain community Medium publication
        </p>
      </div>
    </div>
  );
}
