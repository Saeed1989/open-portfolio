import type { MetadataRoute } from 'next';

/**
 * Per-tenant sitemap (FR-PUB-5). Only published portfolio routes belong here;
 * /styleguide is deliberately absent.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: '/',
      lastModified: new Date(),
    },
  ];
}
