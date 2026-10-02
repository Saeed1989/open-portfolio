/**
 * Slug rules (FR-DAT-1). Format, then reservation; whether a slug is taken is
 * the database's to say, and only the unique index on `slug` decides a race.
 */

/**
 * FR-DAT-1's list, plus labels the operator uses itself. Add a label here and
 * nowhere else.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'www',
  'admin',
  'api',
  'auth',
  'app',
  'mail',
  'docs',
  'status',
  'static',
  'cdn',
  'assets',
  'help',
  'support',
  'blog',
  'saeed-dev',
]);

/* One DNS label: ASCII letters, digits and hyphens, no hyphen at either end. */
const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

export type SlugStatus = 'invalid' | 'reserved' | 'taken' | 'available';

export function normaliseSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

/** `invalid` or `reserved` for a normalised slug; null when it may be claimed. */
export function slugProblem(slug: string): 'invalid' | 'reserved' | null {
  if (
    slug.length < 3 ||
    slug.length > 63 ||
    !SLUG.test(slug) ||
    slug.includes('--')
  ) {
    return 'invalid';
  }
  return RESERVED_SLUGS.has(slug) ? 'reserved' : null;
}
