import type { MetadataRoute } from 'next';

/**
 * /styleguide is a development aid, not portfolio content — it is kept out of
 * both the sitemap and the crawlable surface (FR-PUB-5).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/styleguide'],
    },
  };
}
