import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWatchlist } from '../use-watchlist';

const STORAGE_KEY = 'thornode-watcher-watchlist';

const createAddress = (char: string) => `thor1${char.repeat(39)}`;

const STORED_ADDRESSES = [createAddress('a'), createAddress('b')];
const NEW_ADDRESS = createAddress('c');
const EXISTING_ADDRESS = createAddress('d');
const REMOVE_ADDRESS = createAddress('e');
const KEEP_ADDRESS = createAddress('f');
const SAVED_ADDRESS = createAddress('g');

const createLocalStorageMock = () => {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
};

describe('useWatchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, 'localStorage', {
      value: createLocalStorageMock(),
      configurable: true,
    });
  });

  it('initializes with empty array', async () => {
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.addresses).toEqual([]);
  });

  it('loads addresses from localStorage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STORED_ADDRESSES));

    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.addresses).toEqual(STORED_ADDRESSES);
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
      result.current.addAddress(NEW_ADDRESS);
    });

    expect(result.current.addresses).toContain(NEW_ADDRESS);
    expect(localStorage.getItem(STORAGE_KEY)).toContain(NEW_ADDRESS);
  });

  it('does not add duplicate addresses', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([EXISTING_ADDRESS]));

    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => {
      result.current.addAddress(EXISTING_ADDRESS);
    });

    expect(result.current.addresses.length).toBe(1);
  });

  it('removes address from watchlist', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([REMOVE_ADDRESS, KEEP_ADDRESS]));

    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => {
      result.current.removeAddress(REMOVE_ADDRESS);
    });

    expect(result.current.addresses).not.toContain(REMOVE_ADDRESS);
    expect(result.current.addresses).toContain(KEEP_ADDRESS);
  });

  it('checks if address is saved', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([SAVED_ADDRESS]));

    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.isAddressSaved(SAVED_ADDRESS)).toBe(true);
    expect(result.current.isAddressSaved(createAddress('h'))).toBe(false);
  });
});
