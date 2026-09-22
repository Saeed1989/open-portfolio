import { defineConfig } from 'vitest/config';
import { loadEnv, type Plugin, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { describeDevMode, resolveDevMode, type DirectConfig } from './dev/mode';

/*
 * D0: this app is built to static files and has no server of its own. It is
 * served by `edge`, which also owns every `/api/*` rule (FR-EDGE-2).
 *
 * The dev server has three modes, chosen by ADMIN_DEV_MODE:
 *
 *   mock    (default) MSW in the browser. Nothing leaves the page.
 *   direct            This proxy talks to `api` with no `edge` in between,
 *                     injecting the tenant and a dev key.
 *   edge              No proxy at all — build, and serve through ../edge.
 *
 * Direct mode's safety rests on one property: **identity is injected here and
 * nowhere else.** The variables it reads are not VITE_-prefixed, so Vite will
 * not expose them to client code and they cannot be compiled into a bundle;
 * `scripts/check-bundle.mjs` asserts that after every build. Nothing under
 * `src/` mentions the key, the user id, or the mode.
 */

/**
 * Headers the proxy owns outright, mirroring FR-EDGE-4's unconditional set.
 *
 * The same two `edge` sets on an admin request: the key proving the caller is
 * trusted, and the id naming the tenant. `api`'s admin guard reads both and
 * accepts neither alone, so direct mode presents both and `api` needs no
 * change to understand it.
 */
const INJECTED = ['x-user-id', 'x-api-key'] as const;

/**
 * `/api/auth/*` in direct mode.
 *
 * There is no auth module in `api` yet (D8), so proxying would produce a
 * confusing 404 from a route that is specified but unbuilt. A 501 that says so
 * is the honest answer, and it keeps the mode from looking half-broken.
 */
function authNotImplemented(): Plugin {
  return {
    name: 'admin-dev-auth-not-implemented',
    configureServer(server) {
      server.middlewares.use('/api/auth', (_req, res) => {
        res.statusCode = 501;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: {
              code: 'not_implemented',
              message:
                'Sign-in does not exist yet. Direct mode injects a fixed ' +
                'tenant chosen by DEV_TENANT; there is no session to create ' +
                'or destroy. See SRS §7.4 for the surface this will become.',
              fields: [],
            },
          }),
        );
      });
    },
  };
}

/** Prints the mode once, after the server is listening. */
function announce(description: string): Plugin {
  return {
    name: 'admin-dev-announce-mode',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        server.config.logger.info(`\n  ${description}\n`);
      });
    },
  };
}

function directProxy(direct: DirectConfig): Record<string, ProxyOptions> {
  return {
    '/api/admin': {
      target: direct.apiUrl,
      changeOrigin: false,
      /* `/api` is edge's prefix, not api's: /api/admin/me reaches api as
         /admin/me, exactly as FR-EDGE-2's rewrite does. */
      rewrite: (path) => path.replace(/^\/api/, ''),
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq) => {
          /*
           * Strip first, then set. `setHeader` already replaces, so this is
           * belt and braces — but it is the same rule FR-EDGE-4 states for
           * `edge` ("set unconditionally, so a client-supplied X-User-Id can
           * never reach api"), and a dev proxy that behaved differently would
           * be the one place the rule is not exercised.
           */
          for (const header of INJECTED) proxyReq.removeHeader(header);
          proxyReq.setHeader('X-User-Id', direct.tenant.userId);
          proxyReq.setHeader('X-Api-Key', direct.apiKey);
        });
      },
    },
  };
}

export default defineConfig(({ command, mode }) => {
  /*
   * An empty prefix, so `loadEnv` returns every variable rather than only the
   * VITE_-prefixed ones. This is the only place that happens, and none of what
   * it returns is handed to the client — `define` below passes exactly one
   * value through, and it is a mode name, not a secret.
   */
  const env = loadEnv(mode, process.cwd(), '');
  const dev = resolveDevMode(env);

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(dev.mode === 'direct' ? [authNotImplemented()] : []),
      ...(command === 'serve' ? [announce(describeDevMode(dev))] : []),
    ],
    /* Mock mode turns the MSW worker on without a second variable to keep in
       step. Only on `serve`: a production build must never define it, which
       is what keeps the worker out of the bundle entirely. */
    ...(command === 'serve' && dev.mode === 'mock'
      ? { define: { 'import.meta.env.VITE_MOCKS': JSON.stringify('on') } }
      : {}),
    server: {
      port: 5174,
      strictPort: true,
      ...(dev.mode === 'direct' ? { proxy: directProxy(dev) } : {}),
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      /* `e2e/` belongs to Playwright, which drives a real browser. Vitest would
         collect those specs and fail on the first Playwright-only global. */
      include: ['src/**/*.{test,spec}.{ts,tsx}', 'dev/**/*.test.ts'],
    },
  };
});
