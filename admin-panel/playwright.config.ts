import { defineConfig } from '@playwright/test';

/*
 * The three journeys M1 asks for, against the app as it is actually served.
 *
 * `build:mock` and `vite preview` rather than the dev server: the bundle the
 * mock worker ships in is the one `edge` serves from disk (D0), so these run
 * against the same artifact rather than a dev-only variant of it.
 *
 * `channel: 'chrome'` uses the Chrome already installed rather than
 * downloading a Chromium — these specs assert application behaviour, not
 * engine behaviour, so a second browser buys nothing.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4175',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build:mock && npx vite preview --port 4175 --strictPort',
    url: 'http://localhost:4175/sections/hero',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
