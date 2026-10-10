/*
 * No test reaches a server. `fetch` fails as a network error unless a test
 * stubs its own.
 */
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

vi.stubGlobal(
  'fetch',
  vi.fn(() => Promise.reject(new Error('offline in tests'))),
);

afterEach(() => {
  cleanup();
});
