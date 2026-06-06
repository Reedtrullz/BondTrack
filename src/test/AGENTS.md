# Test Infrastructure

Shared test setup, utilities, and MSW mock server for Vitest unit tests.

## STRUCTURE
```
src/test/
├── setup.ts                # Secondary bootstrap: jest-dom, localStorage, Notification, matchMedia mocks
├── utils.tsx               # renderWithProviders, createMockKeplr, createMockXdefi, mockLocalStorage
└── msw/
    ├── server.ts           # MSW node server (setupServer)
    ├── browser.ts          # MSW browser worker (setupWorker)
    └── handlers/
        ├── index.ts        # Aggregates all handlers
        ├── thornode.ts     # THORNode API mock data + handlers
        └── midgard.ts      # Midgard API mock data + handlers
```

## WHERE TO LOOK
| Need | File |
|------|------|
| Add mock API handler | `msw/handlers/thornode.ts` or `midgard.ts` |
| Add test render helper | `utils.tsx` |
| Add global test mock | `setup.ts` or `src/setupTests.ts` (wired by vitest config) |

## CONVENTIONS

**Setup**: `src/setupTests.ts` is the primary setup wired by `vitest.config.ts`. `src/test/setup.ts` provides additional DOM mocks.

**MSW handlers**: Split by upstream service. Mock data is inline in handler files. `index.ts` concatenates all handlers.

**Test utils**: `renderWithProviders()` wraps components in SWR + theme context. Wallet mocks (`createMockKeplr`, `createMockXdefi`) simulate browser extensions.

**Mocking**: Use `vi.mock()` for module mocks, `vi.stubEnv()` for env vars. Never use `jest.*` — this is Vitest.

## ANTI-PATTERNS
- Never import MSW handlers in production code
- Never use real API calls in unit tests — always mock via MSW or `vi.mock`
- Never skip `act()` wrapping for state updates in component tests
