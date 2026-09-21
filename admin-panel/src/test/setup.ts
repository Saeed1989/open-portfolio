/*
 * jsdom has no fetch and no service worker, so the mock server does not run
 * here. The one call /dev/fields makes on mount is stubbed to a network
 * failure, which is a state the page is required to render anyway — and it
 * keeps the a11y suite measuring the matrix rather than the transport.
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
