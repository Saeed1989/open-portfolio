// Client-side slug format check only. Availability and the reserved list
// (FR-DAT-1) are decided by admin behind a session (SRS §7.2), not here.

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 39;

export type SlugFormatError =
  | 'invalid-characters'
  | 'too-short'
  | 'too-long'
  | 'edge-hyphen';

/** Lowercases input and drops characters a slug cannot contain. */
export function normalizeSlug(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

/** Returns the first format rule the slug breaks, or null if it is well-formed. */
export function validateSlug(slug: string): SlugFormatError | null {
  if (!/^[a-z0-9-]*$/.test(slug)) return 'invalid-characters';
  if (slug.length < SLUG_MIN_LENGTH) return 'too-short';
  if (slug.length > SLUG_MAX_LENGTH) return 'too-long';
  if (slug.startsWith('-') || slug.endsWith('-')) return 'edge-hyphen';
  return null;
}
