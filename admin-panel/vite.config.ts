import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/*
 * D0: this app is built to static files and has no server of its own. It is
 * served by `edge`, which also owns every `/api/*` rule (FR-EDGE-2) — so this
 * dev server deliberately proxies nothing. Offline development runs against
 * MSW; development against a real `api` runs through `../edge` (D8), because a
 * routing rule that exists only in production is one that is never tested
 * (FR-EDGE-6).
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174, strictPort: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    /* `e2e/` belongs to Playwright, which drives a real browser. Vitest would
       collect those specs and fail on the first Playwright-only global. */
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
