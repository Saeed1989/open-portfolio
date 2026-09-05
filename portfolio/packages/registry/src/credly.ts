/**
 * Pulling a Credly badge id out of whatever the tenant pasted.
 *
 * This is extraction, not validation: the tenant hands over an embed snippet,
 * a badge link, or a bare id, and the api keeps the thirty-six characters that
 * identify the badge and discards the rest of the string.
 *
 * That discarding is the point. Persisting tenant-supplied markup and
 * injecting it at render is stored XSS, and it is what FR-THM-6 (a tenant
 * supplies values, never code) and NFR-SEC-2 forbid. The render path builds
 * the embed element itself out of the id, so there is no route from a paste
 * box to executable markup — a paste that contains no badge id yields nothing
 * at all rather than being stored as-is.
 *
 * Framework-free like the rest of the package.
 */

/** The origin the import reads from, and the host the embed points at. */
export const CREDLY_ORIGIN = 'https://www.credly.com';

/**
 * The one attribute worth reading out of a paste.
 *
 * Deliberately a narrow regex against the expected attribute rather than an
 * HTML parser: a parser would invite us to keep the tree, and there is nothing
 * in the tree we want. Thirty-six characters of hex and hyphen is the whole
 * payload, and it is the only thing that can come back.
 */
const EMBED_ATTRIBUTE = /data-share-badge-id=["']([0-9a-f-]{36})["']/i;

/** `…/badges/<id>`, wherever it sits in the path. */
const BADGE_URL = /[/]badges[/]([0-9a-f-]{36})/i;

/** The bare id on its own. */
const BARE_ID = /^[0-9a-f-]{36}$/i;

/**
 * Longest paste accepted. A badge snippet is a few hundred bytes; this is
 * generous for a legitimate one and stops a multi-megabyte string reaching the
 * regexes at all.
 */
const MAX_PASTE_LENGTH = 20000;

function firstMatch(pattern: RegExp, input: string): string | null {
  const match = pattern.exec(input);
  return match ? match[1].toLowerCase() : null;
}

/**
 * The badge id from a paste, or `null` when there is none to find.
 *
 * Three accepted shapes, tried in the order a tenant is most likely to have
 * produced them: the full embed snippet, a badge link, the bare id.
 *
 * The input string is not returned and must not be logged in full by the
 * caller. It has served its purpose once the id is out.
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
