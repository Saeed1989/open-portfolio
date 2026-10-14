import type { NextConfig } from 'next';

/**
 * A strict Content Security Policy on every public page. The allowlist is
 * what the app uses, each entry justified below. The GitHub stat cards touch
 * only `img-src`: they are pictures the visitor's browser requests, never
 * data this system fetches.
 *
 * `CDN_ORIGIN` is configured rather than hard-coded so a deployment can point
 * at its own bucket.
 */
const CDN_ORIGIN = process.env.CDN_ORIGIN ?? 'https://cdn.site.com';

/** The GitHub stat-card service. Images only — see lib/github-embed.ts. */
const EMBED_ORIGIN = 'https://github-readme-stats.vercel.app';

/**
 * Credly, for the badge embeds in the achievements section. A deliberate
 * widening of the policy: `cdn.credly.com` runs script in our origin, so a
 * compromise of that CDN compromises every page carrying a badge. The
 * alternative, rendering the badge ourselves, would mean calling Credly
 * during a render. The frame hosts are separate entries because the script
 * loads from the CDN but its iframes point at credly.com.
 *
 * No `connect-src` is granted, so the script cannot call home from our origin.
 */
const CREDLY_SCRIPT_ORIGIN = 'https://cdn.credly.com';
const CREDLY_FRAME_ORIGINS = ['https://credly.com', 'https://www.credly.com'];
const CREDLY_IMAGE_ORIGIN = 'https://images.credly.com';

const isDev = process.env.NODE_ENV !== 'production';

function contentSecurityPolicy(): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],

    /* Uploaded media from the CDN, the third-party stat cards, and `data:`
       for the inline SVGs the design uses. */
    'img-src': [
      "'self'",
      CDN_ORIGIN,
      EMBED_ORIGIN,
      CREDLY_IMAGE_ORIGIN,
      'data:',
    ],

    /* The font pairing is chosen from a curated list in lib/theme.ts, so the
       stylesheet URL is ours even though the file is Google's. */
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],

    /*
     * 'unsafe-inline' covers the framework's hydration payload, which is
     * emitted as an inline script with no nonce. Tightening this to a
     * per-request nonce is remaining work. No tenant-supplied script can reach
     * here either way: a tenant supplies values, never code.
     */
    'script-src': [
      "'self'",
      CREDLY_SCRIPT_ORIGIN,
      "'unsafe-inline'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],

    /* The API is called server-side only; the browser talks to our origin and
       nothing else. The dev server's HMR socket is the one exception. */
    'connect-src': ["'self'", ...(isDev ? ['ws:'] : [])],

    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'frame-src': CREDLY_FRAME_ORIGINS,
    'manifest-src': ["'self'"],
    'media-src': ["'self'", CDN_ORIGIN],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

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
