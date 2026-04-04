import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { useWatchlist } from '../use-watchlist';

const STORAGE_KEY = 'thornode-watcher-watchlist';

describe('useWatchlist', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes with empty array', async () => {
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.addresses).toEqual([]);
  });

  it('loads addresses from localStorage', async () => {
    const stored = ['thor1abc123', 'thor1def456'];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.addresses).toEqual(stored);
  });

  it('ignores invalid localStorage data', async () => {
    localStorage.setItem(STORAGE_KEY, 'not valid json');

    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.addresses).toEqual([]);
  });

  it('adds address to watchlist', async () => {
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => {
      result.current.addAddress('thor1newaddress');
    });

    expect(result.current.addresses).toContain('thor1newaddress');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('thor1newaddress');
  });

  it('does not add duplicate addresses', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['thor1existing']));

    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => {
      result.current.addAddress('thor1existing');
    });

    expect(result.current.addresses.length).toBe(1);
  });

  it('removes address from watchlist', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['thor1remove', 'thor1keep']));

    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => {
      result.current.removeAddress('thor1remove');
    });

    expect(result.current.addresses).not.toContain('thor1remove');
    expect(result.current.addresses).toContain('thor1keep');
  });

  it('checks if address is saved', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['thor1saved']));

    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.isAddressSaved('thor1saved')).toBe(true);
    expect(result.current.isAddressSaved('thor1notsaved')).toBe(false);
  });
});
