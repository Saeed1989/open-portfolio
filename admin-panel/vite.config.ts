import { readFileSync } from 'node:fs';
import { loadEnv, type ServerOptions } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { apiProxy } from './admin-host/api-proxy';

/*
 * D0: this app is built to static files and has no server of its own. In
 * development this dev server is the admin host (FR-EDGE-6): it serves the
 * app and forwards `/api/*` to `gateway` by the one rule of
 * `admin-host/api-proxy.ts` (FR-EDGE-9) — on plain HTTP at localhost, or over
 * HTTPS on the admin hostname when a certificate is configured.
 *
 * The proxy sets no identity and holds no secret. Sign-in is real, through
 * `gateway`, and the cookies are scoped as in production (NFR-OPS-6).
 */

/** Read with an empty prefix, in this file only: none of these is `VITE_`, so
 *  none reaches the bundle. Each is optional: with no `.env.local` this is the
 *  app alone, with no API behind it. */
function adminHost(env: Record<string, string>): ServerOptions {
  const adminHostname = env['ADMIN_HOST']?.trim() ?? '';
  const gatewayOrigin = env['GATEWAY_ORIGIN']?.trim() ?? '';
  const certPath = env['TLS_CERT_PATH']?.trim() ?? '';
  const keyPath = env['TLS_KEY_PATH']?.trim() ?? '';

  return {
    /* All interfaces, so the hosts-file name — which resolves to 127.0.0.1,
       not ::1 — connects too. Vite refuses a Host it was not told about. */
    host: true,
    ...(adminHostname === '' ? {} : { allowedHosts: [adminHostname] }),
    port: 5174,
    strictPort: true,
    /* Only off localhost: both cookies are `Secure` (FR-AUTH-3), which a
       browser accepts over plain HTTP on localhost and nowhere else. */
    ...(certPath === '' || keyPath === ''
      ? {}
      : { https: { cert: readFileSync(certPath), key: readFileSync(keyPath) } }),
    ...(gatewayOrigin === '' ? {} : { proxy: apiProxy(gatewayOrigin) }),
  };
}

export default defineConfig(({ command, mode }) => ({
  plugins: [react(), tailwindcss()],
  /* A build serves nothing, and neither does a test run. */
  ...(command === 'serve' && mode !== 'test'
    ? { server: adminHost(loadEnv(mode, process.cwd(), '')) }
    : {}),
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'dev/**/*.test.ts',
      'admin-host/**/*.test.ts',
    ],
  },
}));
