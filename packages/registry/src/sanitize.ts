/**
 * The rich-text allowlist, shared by every rich-text field in any section
 * type. Configuration only: `api` feeds it to its own sanitiser at write
 * time. The render path injects stored markup as HTML and re-checks nothing.
 */

/** The only elements admitted. Everything else is stripped. */
export const RICH_TEXT_ALLOWED_TAGS = [
  'p',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'u',
  'br',
] as const;

export type RichTextAllowedTag = (typeof RICH_TEXT_ALLOWED_TAGS)[number];

/**
 * No attributes on any admitted tag. An explicit empty map, because a
 * sanitiser given no attribute configuration falls back to defaults that
 * admit `href`.
 */
export const RICH_TEXT_ALLOWED_ATTRIBUTES: Readonly<
  Record<string, readonly string[]>
> = {};

/** The fields this allowlist governs today, as dotted paths within a project item. */
export const RICH_TEXT_FIELDS = [
  'bodies.business',
  'bodies.solution',
  'bodies.role',
] as const;
