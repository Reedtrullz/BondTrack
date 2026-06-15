'use client';

import { useChangelogs, getTypeLabel, getTypeIcon, getTypeBadgeStyle } from '@/lib/hooks/use-changelogs';
import { AlertTriangle, ChevronDown, Coins, PauseCircle, Search, SearchX, ShieldAlert, X, Link as LinkIcon, ScrollText } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  readLocalStorageValue,
  removeLocalStorageValue,
  STORAGE_KEYS,
  writeLocalStorageValue,
} from '@/lib/storage/keys';
import {
  buildChangelogQuery,
  extractYears,
  FILTER_OPTIONS,
  type FilterType,
  matchesFilter,
  parseTypeFilter,
} from './filters';
import { buildChangelogOperationalSummary } from './summary';

const STORAGE_KEY = STORAGE_KEYS.changelogsExpanded;
const ENTRY_STORAGE_KEY = STORAGE_KEYS.changelogsExpandedEntries;

const TC = {
  blue: '#00CCFF',
  orange: '#F3BA2F',
  green: '#33FF99',
  red: '#FF4954',
  turquoise: '#23DDC8',
};

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

function ImpactCount({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="min-h-20 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        <span>{label}</span>
        <span className={value > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400'}>
          {icon}
        </span>
      </div>
      <div className="mt-2 font-mono text-2xl font-bold leading-none text-zinc-950 dark:text-zinc-50">
        {value}
      </div>
    </div>
  );
}

function parseStoredExpandedIds(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((value) => typeof value === 'string') ? parsed : null;
  } catch {
    return null;
  }
}

function parseStoredExpandedEntries(raw: string | null): Record<string, string[]> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const cleaned: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!Array.isArray(value) || !value.every((entryId) => typeof entryId === 'string')) {
        return null;
      }
      cleaned[key] = value;
    }
    return cleaned;
  } catch {
    return null;
  }
}

export default function ChangelogsPage() {
  const { changelogs, isLoading } = useChangelogs();
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const yearRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const urlSearchQuery = searchParams.get('q') || '';
  const urlTypeFilter = parseTypeFilter(searchParams.get('type'));

  const [searchBuffer, setSearchBuffer] = useState(urlSearchQuery);
  const [typeFilter, setTypeFilter] = useState<FilterType>(urlTypeFilter);
  const [hasResolvedExpandedPreference, setHasResolvedExpandedPreference] = useState(false);
  const [expandedStateError, setExpandedStateError] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [expandedEntryIds, setExpandedEntryIds] = useState<Record<string, string[]>>({});
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Sync search buffer with URL when URL changes externally (e.g., back navigation)
  useEffect(() => {
    setSearchBuffer(urlSearchQuery);
  }, [urlSearchQuery]);

  useEffect(() => {
    setTypeFilter(urlTypeFilter);
  }, [urlTypeFilter]);

  // Handle local state initialization after mount to keep hydration deterministic.
  useEffect(() => {
    if (hasResolvedExpandedPreference || changelogs.length === 0) {
      return;
    }

    const allIds = changelogs.map(c => c.id);

    if (typeof window === 'undefined') {
      setExpandedIds(new Set(allIds));
      setHasResolvedExpandedPreference(true);
      return;
    }

    const savedExp = readLocalStorageValue(STORAGE_KEY);
    const savedEntries = readLocalStorageValue(ENTRY_STORAGE_KEY);
    const parsedExpandedIds = parseStoredExpandedIds(savedExp);
    const parsedExpandedEntries = parseStoredExpandedEntries(savedEntries);
    const hasExpandedStateError = (savedExp !== null && parsedExpandedIds === null)
      || (savedEntries !== null && parsedExpandedEntries === null);

    setExpandedStateError(hasExpandedStateError);
    setExpandedIds(new Set(parsedExpandedIds ?? allIds));
    setExpandedEntryIds(parsedExpandedEntries ?? {});
    setHasResolvedExpandedPreference(true);
  }, [changelogs, hasResolvedExpandedPreference]);

  const toggleEntryExpand = useCallback((changelogId: string, entryIndex: number) => {
    setExpandedEntryIds(prev => {
      const changelogEntries = prev[changelogId] || [];
      const indexStr = String(entryIndex);
      const isExpanded = changelogEntries.includes(indexStr);
      
      const nextEntries = isExpanded 
        ? changelogEntries.filter(id => id !== indexStr)
        : [...changelogEntries, indexStr];

      const next = { ...prev, [changelogId]: nextEntries };
      if (typeof window !== 'undefined') {
        writeLocalStorageValue(ENTRY_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasResolvedExpandedPreference) {
      return;
    }

    writeLocalStorageValue(STORAGE_KEY, JSON.stringify([...expandedIds]));
  }, [expandedIds, hasResolvedExpandedPreference]);

  const years = useMemo(() => extractYears(changelogs), [changelogs]);
  
  const filteredChangelogs = useMemo(() => {
    if (!searchBuffer.trim() && typeFilter === 'all') {
      return changelogs;
    }
    
    return changelogs.map(item => ({
      ...item,
      content: item.content.filter(entry => matchesFilter(entry, searchBuffer, typeFilter))
    })).filter(item => item.content.length > 0);
  }, [changelogs, searchBuffer, typeFilter]);

  const totalEntries = useMemo(() => {
    return filteredChangelogs.reduce((acc, item) => acc + item.content.length, 0);
  }, [filteredChangelogs]);

  const archiveSummary = useMemo(
    () => buildChangelogOperationalSummary(changelogs),
    [changelogs]
  );
  const activeFilterOption = useMemo(() => (
    FILTER_OPTIONS.find((option) => option.value === typeFilter) ?? FILTER_OPTIONS[0]
  ), [typeFilter]);
  const filteredSummary = useMemo(
    () => buildChangelogOperationalSummary(filteredChangelogs),
    [filteredChangelogs]
  );
  const trimmedSearch = searchBuffer.trim();
  const hasActiveFilters = Boolean(trimmedSearch || typeFilter !== 'all');
  const operationalSummary = hasActiveFilters ? filteredSummary : archiveSummary;
  const activeScopeLabel = hasActiveFilters ? 'Filtered view' : 'Latest in archive';
  const activeScopeDescription = hasActiveFilters
    ? [
        typeFilter === 'all' ? 'All impact types' : activeFilterOption.label,
        trimmedSearch ? `matching "${trimmedSearch}"` : null,
      ].filter(Boolean).join(' · ')
    : 'Latest in archive';
  const archiveTotalEntries = archiveSummary.totalEntries;
  const updateNoun = hasActiveFilters
    ? (operationalSummary.totalEntries === 1 ? 'matching update' : 'matching updates')
    : (operationalSummary.totalEntries === 1 ? 'protocol update' : 'protocol updates');
  
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

  const scrollSummaryIntoView = useCallback(() => {
    window.setTimeout(() => {
      summaryRef.current?.scrollIntoView?.({ behavior: 'auto', block: 'start' });
    }, 0);
  }, []);
  
  const clearFilters = useCallback(() => {
    const currentParams = new URLSearchParams(window.location.search);
    const nextUrl = buildChangelogQuery(currentParams, '', 'all');
    setSearchBuffer('');
    setTypeFilter('all');
    router.replace(nextUrl, { scroll: false });
    scrollSummaryIntoView();
  }, [router, scrollSummaryIntoView]);

  const updateSearchQuery = useCallback((nextSearchQuery: string) => {
    setSearchBuffer(nextSearchQuery);
    const currentParams = new URLSearchParams(window.location.search);
    const nextUrl = buildChangelogQuery(currentParams, nextSearchQuery, typeFilter);
    router.replace(nextUrl, { scroll: false });
  }, [router, typeFilter]);

  const updateTypeFilter = useCallback((nextTypeFilter: FilterType) => {
    setTypeFilter(nextTypeFilter);
    const currentParams = new URLSearchParams(window.location.search);
    const nextUrl = buildChangelogQuery(currentParams, searchBuffer, nextTypeFilter);
    router.replace(nextUrl, { scroll: false });
    scrollSummaryIntoView();
  }, [router, searchBuffer, scrollSummaryIntoView]);

  const resetExpandedState = useCallback(() => {
    const allIds = new Set(changelogs.map((item) => item.id));
    setExpandedIds(allIds);
    setExpandedEntryIds({});
    setExpandedStateError(false);
    setHasResolvedExpandedPreference(true);
    if (typeof window !== 'undefined') {
      writeLocalStorageValue(STORAGE_KEY, JSON.stringify([...allIds]));
      removeLocalStorageValue(ENTRY_STORAGE_KEY);
    }
  }, [changelogs]);

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
        if (searchBuffer || typeFilter !== 'all') {
          const nextSearchQuery = '';
          const currentParams = new URLSearchParams(window.location.search);
          const nextUrl = buildChangelogQuery(currentParams, nextSearchQuery, 'all');

          setSearchBuffer('');
          setTypeFilter('all');
          router.replace(nextUrl, { scroll: false });
          scrollSummaryIntoView();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, scrollSummaryIntoView, searchBuffer, typeFilter]);
  
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Protocol Changelog
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">THORChain updates filtered by operator and liquidity impact</p>
        </div>
      </div>

      <section
        ref={summaryRef}
        aria-label="Changelog operational impact summary"
        className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">{activeScopeLabel}</p>
            <h2 className="mt-1 text-lg font-bold leading-tight text-zinc-950 dark:text-zinc-50">
              {operationalSummary.latestTitle}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {activeScopeDescription} · {operationalSummary.latestDate} · {operationalSummary.totalEntries} {updateNoun} across {operationalSummary.totalMonths} {operationalSummary.totalMonths === 1 ? 'month' : 'months'}
            </p>
            <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
              Data source: static TCC Cross-Chain Updates archive bundled with Heimdall. {hasActiveFilters
                ? `This view is narrowed to ${operationalSummary.totalEntries} of ${archiveTotalEntries} archived updates; clear filters to restore the full timeline.`
                : 'Use filters to isolate operator, LP, halt, or upgrade impact before reading the full timeline.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[28rem]">
            <ImpactCount
              icon={<ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />}
              label="Operator impact"
              value={operationalSummary.impactCounts.operatorImpact}
            />
            <ImpactCount
              icon={<Coins className="h-3.5 w-3.5" aria-hidden="true" />}
              label="LP impact"
              value={operationalSummary.impactCounts.lpImpact}
            />
            <ImpactCount
              icon={<PauseCircle className="h-3.5 w-3.5" aria-hidden="true" />}
              label="Chain halt"
              value={operationalSummary.impactCounts.chainHalt}
            />
            <ImpactCount
              icon={<AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
              label="Upgrade required"
              value={operationalSummary.impactCounts.upgradeRequired}
            />
          </div>
        </div>
      </section>

      {expandedStateError && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between" role="status">
          <span>Saved changelog display state was corrupted. Reset it to restore expandable sections.</span>
          <button
            type="button"
            onClick={resetExpandedState}
            className="rounded-md border border-amber-300 px-3 py-1 text-xs font-semibold hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40"
          >
            Reset changelog display state
          </button>
        </div>
      )}

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
              type="button"
              aria-label="Clear changelog search"
              onClick={() => updateSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          aria-label={mobileFiltersOpen ? 'Hide changelog filters' : 'Show changelog filters'}
          aria-expanded={mobileFiltersOpen}
          aria-controls="changelog-filter-controls"
          data-testid="changelog-mobile-filter-toggle"
          onClick={() => setMobileFiltersOpen((isOpen) => !isOpen)}
          className="flex min-h-11 w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-left text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:hidden"
        >
          <span>
            Filters
            <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
              {activeFilterOption.value === 'all' ? 'All updates' : activeFilterOption.label}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        
        <div
          id="changelog-filter-controls"
          data-testid="changelog-type-filters"
          className={`${mobileFiltersOpen ? 'flex' : 'hidden'} flex-wrap gap-2 sm:flex`}
          aria-label="Changelog filters"
        >
          {FILTER_OPTIONS.map((option) => {
            const isActive = typeFilter === option.value;
            const typeCount = typeBreakdown[option.value as keyof typeof typeBreakdown] ?? 0;
            const hasCount = option.value !== 'all' && typeCount > 0;
            
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateTypeFilter(option.value)}
                className={`flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all sm:gap-2 sm:px-4 sm:py-2 sm:text-sm ${
                  isActive
                    ? 'text-black'
                    : 'border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
                style={{
                  backgroundColor: isActive ? TC.blue : 'transparent',
                }}
                aria-pressed={isActive}
                aria-label={option.label}
              >
                {option.icon}
                {option.shortLabel ? (
                  <>
                    <span className="whitespace-nowrap sm:hidden" aria-hidden="true">{option.shortLabel}</span>
                    <span className="hidden whitespace-nowrap sm:inline" aria-hidden="true">{option.label}</span>
                  </>
                ) : (
                  <span className="whitespace-nowrap" aria-hidden="true">{option.label}</span>
                )}
                {hasCount && (
                  <span 
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] text-zinc-700 dark:text-zinc-300 sm:text-xs"
                    style={{ 
                      backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(113,113,122,0.12)',
                    }}
                    aria-hidden="true"
                  >
                    {typeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">
              Showing {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'} of {changelogs.reduce((a, c) => a + c.content.length, 0)} total
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-cyan-600 transition-colors hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-white"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Year Quick Nav */}
      {years.length > 1 && (
        <div
          className={`${mobileFiltersOpen ? 'block' : 'hidden'} sticky top-0 z-10 -mx-4 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90 sm:-mx-6 sm:block sm:px-6`}
        >
          <div
            data-testid="changelog-year-filters"
            className="flex flex-wrap gap-2"
            aria-label="Changelog year navigation"
          >
            {years.map((year) => (
              <button
                type="button"
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
            style={{ background: `linear-gradient(to bottom, #00CCFF 0%, #00CCFF 20%, transparent 100%)` }}
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
                    type="button"
                    onClick={clearFilters}
                    className="text-cyan-600 hover:underline dark:text-cyan-400"
                  >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            filteredChangelogs.map((item) => {
              const year = item.sortDate ? item.sortDate.split('-')[0] : '';
              const isExpanded = expandedIds.has(item.id);
              const sectionPanelId = `changelog-${item.id}-content`;
              
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
                      type="button"
                      onClick={() => toggleExpand(item.id)}
                      aria-expanded={isExpanded}
                      aria-controls={sectionPanelId}
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
                          <div className="flex flex-wrap gap-1.5">
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
                      id={sectionPanelId}
                      hidden={!isExpanded}
                      aria-hidden={!isExpanded}
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="p-6 space-y-4">
                        {item.content.map((entry, entryIndex) => {
                          const isEntryExpanded = (Array.isArray(expandedEntryIds[item.id]) && expandedEntryIds[item.id].includes(String(entryIndex))) || searchBuffer.length > 0;
                          const entryPanelId = `changelog-${item.id}-entry-${entryIndex}`;
                          
                          return (
                            <div
                              key={entryIndex}
                              className={`relative rounded-lg transition-all duration-200 ${
                                isEntryExpanded ? 'bg-zinc-50 shadow-sm dark:bg-zinc-900/40' : ''
                              }`}
                              style={{ borderLeft: `3px solid ${getTypeBadgeStyle(entry.type).text}` }}
                            >
                              <button
                                type="button"
                                onClick={() => toggleEntryExpand(item.id, entryIndex)}
                                aria-label={entry.title}
                                aria-expanded={isEntryExpanded}
                                aria-controls={entryPanelId}
                                className={`w-full text-left group flex items-start gap-4 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/30 transition-colors ${
                                  isEntryExpanded ? 'border border-zinc-100 dark:border-zinc-800/50' : ''
                                }`}
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

                                  {!isEntryExpanded && (
                                    <p className="mt-1 text-xs text-zinc-400 line-clamp-1 opacity-70">
                                      {entry.description}
                                    </p>
                                  )}
                                </div>
                                <div className={`flex-shrink-0 transition-transform duration-200 ${isEntryExpanded ? 'rotate-180' : 'opacity-0 group-hover:opacity-100'}`}>
                                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                                </div>
                              </button>
                              <div id={entryPanelId} hidden={!isEntryExpanded} className="px-3 pb-3">
                                <div className="mt-1 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
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
                              </div>
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
