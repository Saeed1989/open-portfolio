/*
 * The slug format, mirrored from `api` for instant feedback while typing.
 *
 * UX only. `api` normalises and validates again, and decides reservation and
 * availability itself — the reserved list is deliberately not restated here,
 * so it can grow on the server without an admin release. Keep the format in
 * step with `data-service/src/admin/portfolio/slug.ts`.
 */

/** Where a slug is served (FR-TEN-1). */
export const SLUG_SUFFIX = '.openfolio.site';

/* One DNS label: ASCII letters, digits and hyphens, no hyphen at either end. */
const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

export function normaliseSlug(raw: string): string {
  return raw.trim().toLowerCase();
}

/** True when a normalised slug has the shape `api` accepts. */
export function isWellFormedSlug(slug: string): boolean {
  return (
    slug.length >= 3 &&
    slug.length <= 63 &&
    SLUG.test(slug) &&
    !slug.includes('--')
  );
}
