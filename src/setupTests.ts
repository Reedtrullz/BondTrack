import { afterAll, afterEach } from 'vitest';
import './test/setup';
import { server } from './test/msw/server';

const TEST_BASE_URL = 'http://localhost';
const unhandledRequests: string[] = [];

const toFetchInput = (input: RequestInfo | URL): RequestInfo | URL => {
  if (typeof input === 'string' && input.startsWith('/')) {
    return new URL(input, window.location?.origin ?? TEST_BASE_URL).toString();
  }

  if (input instanceof Request && input.url.startsWith('/')) {
    return new Request(new URL(input.url, window.location?.origin ?? TEST_BASE_URL), input);
  }

  return input;
};

server.listen({
  onUnhandledRequest(request) {
    const message = `[MSW] Unhandled ${request.method} request to ${request.url}. Add a handler under src/test/msw/handlers or mock the request in the test.`;

    unhandledRequests.push(message);
    throw new Error(message);
  },
});

const mswFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  return mswFetch(toFetchInput(input), init);
}) as typeof fetch;

afterEach(() => {
  try {
    if (unhandledRequests.length > 0) {
      throw new Error(`Unhandled network requests:\n${unhandledRequests.join('\n')}`);
    }
  } finally {
    unhandledRequests.length = 0;
    server.resetHandlers();
  }
});

afterAll(() => {
  server.close();
});
