import { defineConfig } from '@playwright/test';

/*
 * Runs against the dev topology of `../gateway/README.md` (NFR-OPS-6): the dev
 * admin host in front of `gateway`, with a real sign-in. Nothing is started
 * from here.
 */
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'https://admin.openfolio.test:5174',
  },
});
