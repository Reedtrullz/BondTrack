import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { cache } from 'swr/_internal';

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

Object.defineProperty(window, 'Notification', {
  value: {
    requestPermission: vi.fn().mockResolvedValue('granted'),
    permission: 'default',
  },
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

beforeEach(() => {
  for (const key of cache.keys()) {
    cache.delete(key);
  }
});