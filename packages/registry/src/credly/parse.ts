/**
 * Extracts a Credly badge id from a pasted embed snippet, badge link, or bare
 * id, and discards everything else. Storing tenant markup and injecting it at
 * render would be stored XSS, so only the id is ever kept.
 */

/** The origin the import reads from, and the host the embed points at. */
export const CREDLY_ORIGIN = 'https://www.credly.com';

/** A narrow regex, not an HTML parser: nothing in the tree is wanted but the id. */
const EMBED_ATTRIBUTE = /data-share-badge-id=["']([0-9a-f-]{36})["']/i;

/** `…/badges/<id>`, wherever it sits in the path. */
const BADGE_URL = /[/]badges[/]([0-9a-f-]{36})/i;

/** The bare id on its own. */
const BARE_ID = /^[0-9a-f-]{36}$/i;

/** Longest paste accepted, so a multi-megabyte string never reaches the regexes. */
const MAX_PASTE_LENGTH = 20000;

function firstMatch(pattern: RegExp, input: string): string | null {
  const match = pattern.exec(input);
  return match ? match[1].toLowerCase() : null;
}

/**
 * The badge id from a paste, or `null` when there is none. The input is never
 * returned, and callers must not log it in full.
 */
export function parseCredlyBadgeId(input: unknown): string | null {
  if (typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_PASTE_LENGTH) return null;

  return (
    firstMatch(EMBED_ATTRIBUTE, trimmed) ??
    firstMatch(BADGE_URL, trimmed) ??
    (BARE_ID.test(trimmed) ? trimmed.toLowerCase() : null)
  );
}
