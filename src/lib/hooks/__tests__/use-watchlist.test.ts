import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWatchlist } from '../use-watchlist';

const STORAGE_KEY = 'heimdall-watchlist';

const createAddress = (char: string) => `thor1${char.repeat(39)}`;

const STORED_ADDRESSES = [createAddress('a'), createAddress('p')];
const NEW_ADDRESS = createAddress('c');
const EXISTING_ADDRESS = createAddress('d');
const REMOVE_ADDRESS = createAddress('e');
const KEEP_ADDRESS = createAddress('f');
const SAVED_ADDRESS = createAddress('g');
const BECH32_ZERO_ADDRESS = 'thor12mpnw4stg9fw8yngs3rpzzc6zdprepev3e0346';

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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with empty array', async () => {
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.addresses).toEqual([]);
  });

  it('keeps an in-memory watchlist when browser storage is unavailable', async () => {
    const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('localStorage denied');
      },
    });

    try {
      const { result } = renderHook(() => useWatchlist());
      await waitFor(() => expect(result.current.isLoaded).toBe(true));

      act(() => {
        result.current.addAddress(NEW_ADDRESS);
      });

      expect(result.current.addresses).toEqual([NEW_ADDRESS]);
      expect(result.current.isAddressSaved(NEW_ADDRESS)).toBe(true);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      }
    }
  });

  it('loads addresses from localStorage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STORED_ADDRESSES));

    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.addresses).toEqual(STORED_ADDRESSES);
  });

  it('ignores invalid localStorage data', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    localStorage.setItem(STORAGE_KEY, 'not valid json');

    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.addresses).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
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

  it('accepts valid bech32 THORChain addresses that contain zeroes', async () => {
    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => {
      result.current.addAddress(BECH32_ZERO_ADDRESS);
    });

    expect(result.current.addresses).toContain(BECH32_ZERO_ADDRESS);
    expect(localStorage.getItem(STORAGE_KEY)).toContain(BECH32_ZERO_ADDRESS);
  });

  it('moves duplicate addresses to the newest position', async () => {
    const OLD_ADDRESS = createAddress('z');
    localStorage.setItem(STORAGE_KEY, JSON.stringify([EXISTING_ADDRESS, OLD_ADDRESS]));

    const { result } = renderHook(() => useWatchlist());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    act(() => {
      result.current.addAddress(EXISTING_ADDRESS);
    });

    expect(result.current.addresses).toEqual([OLD_ADDRESS, EXISTING_ADDRESS]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([OLD_ADDRESS, EXISTING_ADDRESS]);
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
