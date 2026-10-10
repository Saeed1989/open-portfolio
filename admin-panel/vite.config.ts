import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/*
 * D0: this app is built to static files and has no server of its own. It is
 * served by `edge`, which also owns every `/api/*` rule (FR-EDGE-2).
 *
 * There is no proxy here, and no identity. Development runs the build behind
 * `../edge` on the admin host (NFR-OPS-6), where sign-in is real and the
 * cookies are scoped as in production. This dev server serves the app alone,
 * for work that needs no API — `/dev/fields`.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'dev/**/*.test.ts'],
  },
});
