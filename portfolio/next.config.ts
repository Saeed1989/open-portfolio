import type { NextConfig } from 'next';

/**
 * NFR-SEC-4: a strict Content Security Policy on every public page.
 *
 * The allowlist is exactly what the app actually uses, and each entry is
 * justified below. `img-src` is the only directive the GitHub stat cards
 * touch: they are pictures the visitor's browser asks the card service for,
 * never data this system fetches. If this feature ever needed `connect-src` or
 * `script-src`, something would be fetching where it should be embedding
 * (FR-INT-1).
 *
 * `CDN_ORIGIN` is the media CDN from SRS §2.1. It is configured rather than
 * hard-coded so a deployment can point at its own bucket.
 */
const CDN_ORIGIN = process.env.CDN_ORIGIN ?? 'https://cdn.site.com';

/** The GitHub stat-card service. Images only — see lib/github-embed.ts. */
const EMBED_ORIGIN = 'https://github-readme-stats.vercel.app';

const isDev = process.env.NODE_ENV !== 'production';

function contentSecurityPolicy(): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],

    /* Uploaded media from the CDN, the third-party stat cards, and `data:`
       for the inline SVGs the design uses. */
    'img-src': ["'self'", CDN_ORIGIN, EMBED_ORIGIN, 'data:'],

    /* The font pairing is chosen from a curated list in lib/theme.ts, so the
       stylesheet URL is ours even though the file is Google's (FR-THM-1). */
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],

    /*
     * 'unsafe-inline' covers the framework's hydration payload, which is
     * emitted as an inline script with no nonce. Tightening this to a
     * per-request nonce is the remaining work on NFR-SEC-4 and is a middleware
     * change, not a tenant-facing one. No tenant-supplied script can reach
     * here either way — FR-THM-6 means a tenant supplies values, never code.
     */
    'script-src': ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],

    /* The API is called server-side only; the browser talks to our origin and
       nothing else. The dev server's HMR socket is the one exception. */
    'connect-src': ["'self'", ...(isDev ? ['ws:'] : [])],

    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'frame-src': ["'none'"],
    'manifest-src': ["'self'"],
    'media-src': ["'self'", CDN_ORIGIN],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@openportfolio/registry'],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy(),
          },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
