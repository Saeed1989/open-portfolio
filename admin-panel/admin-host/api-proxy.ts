import type { ProxyOptions } from 'vite';

/*
 * The admin host's `/api/*` rule (FR-EDGE-9), and the only copy of it. The
 * dev server applies it (FR-EDGE-6), and `api-proxy.test.ts` holds it to the
 * requirement against a stub upstream.
 *
 * A pass-through that holds nothing: method, path, query, body and `Cookie`
 * go to `gateway` as they came, and the status, every `Set-Cookie` and
 * `Location` come back as `gateway` sent them. What is absent is as much the
 * rule as what is present — no cookie rewrite, no redirect following, no
 * cache, no `X-User-Id`, no `X-Api-Key`, no secret.
 */
export function apiProxy(gatewayOrigin: string): Record<string, ProxyOptions> {
  return {
    /* With the trailing slash: `/api/*`, and not `/apiary`. */
    '/api/': {
      target: gatewayOrigin,
      /* `Host` is gateway's own hostname, which is what it matches (FR-EDGE-1). */
      changeOrigin: true,
      /* X-Forwarded-For, -Proto and -Host; -Host is the admin host's name. */
      xfwd: true,
      /* Over HTTPS, gateway's certificate is verified. With a mkcert
         certificate that takes NODE_EXTRA_CA_CERTS — see the README. */
      secure: true,
    },
  };
}
